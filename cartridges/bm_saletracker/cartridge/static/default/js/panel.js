function populateTemplateWithRowData(row, actions){
    return jQuery("#action_order").text()
        .replace("%{uuid}",row.UUID)
        .replace("%{orderno}",'<a href="' + viewOrderURL.replace("ORDERID", row.UUID) + '">' + row.id + '</a>')
        .replace("%{date}",row.date)
        .replace("%{billingAddress}",row.billingAddress)
        .replace("%{saleManagerId}",row.saleManagerId)
        .replace("%{shippingAddress}",row.shippingAddress)
        .replace("%{customer.name}",row.customer.name)
        .replace("%{customer.email}",row.customer.email)
        .replace("%{total}",row.total)
        .replace("%{actions}",actions)
        .replace("%{products}",row.products.map(function(product){
            return jQuery("#action_products").text()
                .replace("%{id}",product.id)
                .replace("%{name}",product.name)
                .replace("%{qty}",product.qty)
                .replace("%{price}",product.price)
            }).join("\n")
        );
}

function getNonManagerOrders(){
    jQuery("#actioncontent").html("<tr><td><div class=\"loader\">Loading...</div></td></tr>");
    jQuery.getJSON( "/on/demandware.store/Sites-Site/default/SaleOrders-ShowOrdersWithoutManager", function( data ) {
        jQuery("#action_title").html("Orders Pending Fraud Approval");
        jQuery("#actioncontent").html(jQuery("#action_order_headings").text());
        data.map(function(row){
            return jQuery("#actioncontent").append(
                populateTemplateWithRowData(
                    row,
                    "<a href='#' class='approve' onclick='approveFraudOrder(\"" + row.id + "\", \"" + row.UUID + "\")'>${Resource.msg('action.table.action.approve','ordersadmin',null)}</a>" +
                    "<a href='#' class='reject' onclick='cancelFraudOrder(\"" + row.id + "\", \"" + row.UUID + "\", event)'>${Resource.msg('action.table.action.reject','ordersadmin',null)}</a>"
                )
            )
        });
    });
}

function getManagerOrders(){
    jQuery("#actioncontent").html("<tr><td><div class=\"loader\">Loading...</div></td></tr>");
    jQuery.getJSON( "/on/demandware.store/Sites-Site/default/SaleOrders-ShowOrdersWithManager", function( data ) {
        jQuery("#action_title").html("Order history");
        jQuery("#actioncontent").html(jQuery("#action_order_headings").text());
        data.map(function(row){
            return jQuery("#actioncontent").append(
                populateTemplateWithRowData(
                    row,
                    "<a href='#' class='approve' onclick='approveOrder(\"" + row.id + "\", \"" + row.UUID + "\")'>${Resource.msg('action.table.action.approve','ordersadmin',null)}</a>" +
                    "<a href='#' class='reject' onclick='cancelFraudOrder(\"" + row.id + "\", \"" + row.UUID + "\", event)'>${Resource.msg('action.table.action.reject','ordersadmin',null)}</a>"
                )
            )
        });
    });
}
jQuery(document).on('click', '.manageroverview', function(){
    var managerId = jQuery(this).html();
    jQuery.getJSON( "/on/demandware.store/Sites-Site/default/SaleOrders-GetManagerDetails?" + "managerId=" + managerId, function( data ) {
        jQuery(".manager-id").html(
            "<h3> Manager ID: " + data.managerId + "</h3>" +
            "<span> Total orders: " + data.totalOrders + "</span>" +
            "<span> Total revenue: " + data.orderRevenue + "</span>"
            );
    });
})
