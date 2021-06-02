'use strict';

/**
 * Handles orders shows
 *
 * @module controllers/ordersActions
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var Logger = require('dw/system/Logger').getLogger('orders');
var Money = require('dw/value/Money');

/* Site Genesis imports */
var app = require('sitegenesis_storefront_controllers/cartridge/scripts/app');
var guard = require('sitegenesis_storefront_controllers/cartridge/scripts/guard');

var getOrdersBySaleManager = 'custom.saleManagerId != NULL';
var getOrdersNotBySaleManager = 'custom.saleManagerId = NULL';
var getOrdersFromSaleManager = 'custom.saleManagerId = {0}';

/**
 * Calculate total orders revenue
 * @param {Object} orders list
 * @returns {string} Orders total revenue
 */
function getOrdersRevenue(orders) {
    var totalRevenue = [];
    var revenueResult = '';
    while (orders.hasNext()) {
        var dwOrder = orders.next();
        var price = dwOrder.merchandizeTotalPrice;
        var currencyCode = price.currencyCode;
        if (empty(totalRevenue[currencyCode])) {
            totalRevenue[currencyCode] = 0;
        }
        totalRevenue[currencyCode] += parseInt(price.value.toFixed(2), 10);
    }
    for (var currency in totalRevenue) {
        revenueResult += totalRevenue[currency] + currency + ' ';
    }
    return revenueResult;
}

/**
 * Main panel render
 */
function Start() {
    var counts = {
        without_manager: 0,
        without_manager_revenue: 0,
        approval: 0,
        with_manager: 0,
        with_manager_revenue: 0,
        counts: 0
    };
    var pendingWithoutManager = OrderMgr.searchOrders(getOrdersNotBySaleManager, null);
    counts.without_manager = pendingWithoutManager.getCount();
    counts.without_manager_revenue = getOrdersRevenue(pendingWithoutManager);
    pendingWithoutManager.close();

    var pendingWithManager = OrderMgr.searchOrders(getOrdersBySaleManager, null);
    counts.with_manager = pendingWithManager.getCount();
    counts.with_manager_revenue = getOrdersRevenue(pendingWithManager);
    pendingWithManager.close();

    app.getView({ counts: counts }).render('orders-actions/show_orders');
}

/**
 * Given a shipment, return an address string
 * @param {dw.order.OrderAddress} orderAddress address of the order
 * @returns {string} string of an adreess
 */
function createStringFromAddress(orderAddress) {
    return [
        orderAddress.getAddress1(),
        orderAddress.getAddress2(),
        orderAddress.getCity(),
        orderAddress.getPostalCode(),
        orderAddress.getCountryCode()
    ].join(', ');
}

/**
 * Returns array of objects representing an order
 * @param {String} status orders payment status
 * @returns {[{UUID: String, id: String, date: String, total: String, producs:[{id: String, name: String, qty: String, price: String}], customer:{name:String, email:String}, shippingAddress: String, billingAddress: String}]}
 */
function showOrdersWithStatus(status) {
    /** @type [{{UUID: String, id: String, date: String, total: String, producs:[{id: String, name: String, qty: String, price: String}], customer:{name:String, email:String}, shippingAddress: String, billingAddress: String}}] */
    var reply = [];

    /** @type {dw.order.Order} */
    var dwOrder;

    /** @type {dw.customer.Profile} */
    var customer;

    /** @type {[dw.order.Shipment]} */
    var shipments;

    /** @type {[dw.order.ProductLineItem]} */
    var products;

    var shipmentAddresses;
    var totalRevenue = 0;
    var ordersList;

    if (status === 'withoutManager') {
        ordersList = OrderMgr.searchOrders(getOrdersNotBySaleManager, 'creationDate asc');
    } else {
        ordersList = OrderMgr.searchOrders(getOrdersBySaleManager, 'creationDate asc');
    }
    while (ordersList.hasNext()) {
        dwOrder = ordersList.next();
        customer = dwOrder.getCustomer().getProfile();
        shipments = dwOrder.getShipments().toArray();
        products = dwOrder.getAllProductLineItems().toArray();
        totalRevenue += dwOrder.merchandizeTotalPrice.value.toFixed(2);

        shipmentAddresses = shipments.map(function (shipment) {
            return createStringFromAddress(shipment.getShippingAddress());
        });

        var order = {
            UUID: dwOrder.getUUID(),
            id: dwOrder.getOrderNo(),
            date: dw.util.StringUtils.formatCalendar(dw.util.Calendar(dwOrder.getCreationDate()),'EEE, d MMM yyyy HH:mm'),
            total: dw.util.Currency.getCurrency(dwOrder.getTotalGrossPrice().getCurrencyCode()).getSymbol() + ' ' + dwOrder.getTotalGrossPrice().valueOf(),
            products: [],
            saleManagerId: '',
            customer:{name: 'not set', email: 'not set'},
            shippingAddress: shipmentAddresses,
            billingAddress: createStringFromAddress(dwOrder.getBillingAddress())
        };
        if (customer) {
            order.customer = { name: customer.getFirstName() + ' ' + customer.getLastName(), email: customer.getEmail() };
        } else {
            order.customer = { name: dwOrder.getBillingAddress().getFirstName() + ' ' + dwOrder.getBillingAddress().getLastName(), email: '(Not registered)'}
        }
        if (!empty(dwOrder.custom.saleManagerId)) {
            order.saleManagerId = dwOrder.custom.saleManagerId;
        }

        products.filter(function (product) {
            order.products.push({
                id: product.getProductID(),
                name: product.getProductName(),
                qty: product.getQuantity().valueOf(),
                price: product.getGrossPrice().valueOf()
            });
        });

        reply.push(order);
    }
    reply.totalRevenue = totalRevenue;
    ordersList.close();
    return reply;
}

/**
 * Send JSON response
 * @param {Object} payload data
 */
function sendJSONResponse(payload) {
    response.addHttpHeader('Content-Type', 'application/json');
    response.getWriter().print(JSON.stringify(payload, null, 4));
}

/**
 * Retrieves all orders matching the Pending_Fraud_Approval state
 */
function ShowOrdersWithoutManager() {
    var reply = showOrdersWithStatus('withoutManager');
    sendJSONResponse(reply);
}

/**
 * Retrieves all orders matching the Pending_Approval state
 */
function ShowOrdersWithManager() {
    var reply = showOrdersWithStatus('withManager');
    sendJSONResponse(reply);
}

/**
 * Get all all managers orders
 */
function GetManagerDetails() {

    if (!empty( request.httpParameterMap.managerId.value)) {
        var managerId = request.httpParameterMap.managerId.value;
        var ordersByManager = OrderMgr.searchOrders(getOrdersFromSaleManager, null, managerId);
        var totalOrders = ordersByManager.getCount();
        var orderRevenue = getOrdersRevenue(ordersByManager);
        ordersByManager.close();
        sendJSONResponse({ managerId: managerId, totalOrders: totalOrders, orderRevenue: orderRevenue });
        return;
    }
    sendJSONResponse({ error: true });
}

/*
* Web exposed methods
*/

/** Start for orders panel
 * @see module:controllers/ordersActions~Start */
exports.Start = guard.ensure(['https'], Start);

 /** Get manager deails
 * @see module:controllers/ordersActions~Start */
exports.GetManagerDetails = guard.ensure(['https'], GetManagerDetails);

/** Retrieve orders with manager
 * @see module:controllers/ordersActions~ShowOrdersWithoutManager */
exports.ShowOrdersWithoutManager = guard.ensure(['https'], ShowOrdersWithoutManager);

/** Retrieve orders without manager
 * @see module:controllers/ordersActions~ShowOrdersWithManager */
exports.ShowOrdersWithManager = guard.ensure(['https'], ShowOrdersWithManager);
