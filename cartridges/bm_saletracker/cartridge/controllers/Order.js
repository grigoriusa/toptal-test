'use strict';
/* global session, empty */
var server = require('server');
server.extend(module.superModule);

server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var order = OrderMgr.getOrder(req.querystring.ID);
    if (!empty(session.sourceCodeInfo)) {
        Transaction.wrap(function () {
            order.custom.saleManagerId = session.sourceCodeInfo.code;
        });
    }

    next();
});

module.exports = server.exports();
