var winston = module.parent.require('winston'),
	Meta = module.parent.require('./meta'),
	SendGrid,
	Emailer = {};

Emailer.init = function(data, callback) {

    var render = function(req, res, next) {
        res.render('admin/plugins/emailer-sendgrid', {});
    };

    Meta.settings.get('sendgrid', function(err, settings) {
        if (!err && settings && settings.apiUser && settings.apiKey) {
            SendGrid = require('sendgrid')(settings.apiUser, settings.apiKey);
        } else {
            winston.error('[plugins/emailer-sendgrid] API user and key not set!');
        }

	    data.router.get('/admin/plugins/emailer-sendgrid', data.middleware.admin.buildHeader, render);
	    data.router.get('/api/admin/plugins/emailer-sendgrid', render);

        if (typeof callback === 'function') {
            callback();
        }
    });
};

Emailer.send = function(data) {
	if (SendGrid) {
		SendGrid.send({
			to: data.to,
			subject: data.subject,
			from: data.from,
			text: data.text,
			html: data.html
		}, function (err, response) {
			if (!err) {
				winston.info('[emailer.sendgrid] Sent `' + data.template + '` email to uid ' + data.uid);
			} else {
				winston.warn('[emailer.sendgrid] Unable to send `' + data.template + '` email to uid ' + data.uid + '!!');
				winston.warn('[emailer.sendgrid] Error Stringified:' + JSON.stringify(err));
			}
		});
	} else {
		winston.warn('[plugins/emailer-sendgrid] API user and key not set, not sending email as SendGrid object is not instantiated.');
	}
};

Emailer.admin = {
    menu: function(custom_header, callback) {
        custom_header.plugins.push({
            "route": '/plugins/emailer-sendgrid',
            "icon": 'fa-envelope-o',
            "name": 'Emailer (SendGrid)'
        });

        callback(null, custom_header);
    }
};

module.exports = Emailer;


