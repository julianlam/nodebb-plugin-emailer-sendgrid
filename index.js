var winston = module.parent.require('winston'),
    Meta = module.parent.require('./meta'),
    Mandrill,
    Emailer = {};

Emailer.init = function(app, middleware, controllers, callback) {

    var render = function(req, res, next) {
        res.render('admin/plugins/emailer-mandrill', {});
    };

    Meta.settings.get('mandrill', function(err, settings) {
        if (!err && settings && settings.apiKey) {
            Mandrill = require('node-mandrill')(settings.apiKey || 'Replace Me');
        } else {
            winston.error('[plugins/emailer-mandrill] API key not set!');
        }

        app.get('/admin/plugins/emailer-mandrill', middleware.admin.buildHeader, render);
        app.get('/api/admin/plugins/emailer-mandrill', render);

        if (typeof callback === 'function') {
            callback();
        }
    });
};

Emailer.send = function(data) {
    if (Mandrill) {
        Mandrill('/messages/send', {
            message: {
                to: [{email: data.to, name: data.toName}],
                subject: data.subject,
                from_email: data.from,
                html: data.html,
                text: data.plaintext,
                auto_text: !!!data.plaintext
            }
        }, function (err, response) {
            if (!err) {
                winston.info('[emailer.mandrill] Sent `' + data.template + '` email to uid ' + data.uid);
            } else {
                winston.warn('[emailer.mandrill] Unable to send `' + data.template + '` email to uid ' + data.uid + '!!');
                winston.warn('[emailer.mandrill] Error Stringified:' + JSON.stringify(err));
            }
        });
    } else {
        winston.warn('[plugins/emailer-mandrill] API key not set, not sending email as Mandrill object is not instantiated.');
    }
};

Emailer.admin = {
    menu: function(custom_header, callback) {
        custom_header.plugins.push({
            "route": '/plugins/emailer-mandrill',
            "icon": 'fa-envelope-o',
            "name": 'Emailer (Mandrill)'
        });

        callback(null, custom_header);
    }
};

module.exports = Emailer;


