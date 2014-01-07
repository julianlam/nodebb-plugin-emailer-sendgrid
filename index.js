var	fs = require('fs'),
	path = require('path'),

	winston = module.parent.require('winston'),
	Meta = module.parent.require('./meta'),

	Mandrill = require('node-mandrill')(Meta.config['mandrill:apiKey'] || 'Replace Me', Meta.config['mandrill:domain'] || 'Replace Me'),
	Emailer = {};

Emailer.send = function(data) {

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
			winston.error('[emailer.mandrill] ' + err);
			winston.error('[emailer.mandrill] ' + response);
		}
	});
};

Emailer.admin = {
	menu: function(custom_header, callback) {
		custom_header.plugins.push({
			"route": '/plugins/emailer-mandrill',
			"icon": 'fa-envelope-o',
			"name": 'Emailer (MailGun)'
		});

		return custom_header;
	},
	route: function(custom_routes, callback) {
		fs.readFile(path.join(__dirname, 'public/templates/admin.tpl'), function(err, tpl) {
			custom_routes.routes.push({
				route: '/plugins/emailer-mandrill',
				method: "get",
				options: function(req, res, callback) {
					callback({
						req: req,
						res: res,
						route: '/plugins/emailer-mandrill',
						name: 'Emailer (Mandrill)',
						content: tpl
					});
				}
			});

			callback(null, custom_routes);
		});
	}
};

module.exports = Emailer;