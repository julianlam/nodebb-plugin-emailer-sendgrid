'use strict';

var winston = require.main.require('winston');
var async = require.main.require('async');
var nconf = require.main.require('nconf');
var url = require.main.require('url');
var Meta = require.main.require('./src/meta');
var Posts = require.main.require('./src/posts');
var Topics = require.main.require('./src/topics');
var Privileges = require.main.require('./src/privileges');
var Plugins = require.main.require('./src/plugins');
var SocketHelpers = require.main.require('./src/socket.io/helpers');
var User = require.main.require('./src/user');
var hostEmailer = require.main.require('./src/emailer');
var SendGrid;
var Emailer = {};

Emailer.hostname = url.parse(nconf.get('url')).hostname;
Emailer.receiptRegex = new RegExp('^reply-([\\d]+)@' + Emailer.hostname + '$');

Emailer.init = function (data, callback) {
	var render = function (req, res) {
		var destinationURL = nconf.get('url') + '/plugins/emailer-sendgrid/webhook';
		res.render('admin/plugins/emailer-sendgrid', { destinationURL: destinationURL });
	};

	Meta.settings.get('sendgrid', function (err, settings) {
		if (!err && settings && settings.apiKey) {
			SendGrid = require('@sendgrid/mail');
			SendGrid.setApiKey(settings.apiKey);
		} else {
			winston.error('[plugins/emailer-sendgrid] API key not set!');
		}

		var multipart = module.parent.require('connect-multiparty');
		var multipartMiddleware = multipart();

		data.router.get('/admin/plugins/emailer-sendgrid', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/emailer-sendgrid', render);
		data.router.post('/plugins/emailer-sendgrid/webhook', multipartMiddleware, Emailer.receive);

		if (typeof callback === 'function') {
			callback();
		}
	});
};

Emailer.receive = function (req, res) {
	Plugins.fireHook('filter:plugins.emailer.receive', {
		req: req,
		res: res,
		service: 'sendgrid',
	}, function (err, data) {
		if (err) {
			Emailer.handleError(err, data.req.body);
			return res.sendStatus(200);
		}

		async.waterfall([
			async.apply(Emailer.verifyEvent, data.req.body),
			Emailer.resolveUserOrGuest,
			Emailer.processEvent,
			Emailer.notifyUsers,
		], function (err, eventObj) {
			if (err) {
				Emailer.handleError(err, eventObj);
			}

			res.sendStatus(200);
		});
	});
};

Emailer.verifyEvent = function (eventObj, next) {
	var pid = eventObj.to.match(Emailer.receiptRegex);

	if (pid && pid.length && pid[1]) {
		pid = pid[1];
		eventObj.pid = pid;
		Posts.getPostField(pid, 'tid', function (err, tid) {
			if (!err && tid) {
				eventObj.tid = tid;
				next(null, eventObj);
			} else {
				if (!tid) { winston.warn('[emailer.sendgrid.verifyEvent] Could not retrieve tid'); }
				next(new Error('invalid-data'));
			}
		});
	} else {
		winston.warn('[emailer.sendgrid.verifyEvent] Could not locate post id');
		next(new Error('invalid-data'), eventObj);
	}
};

Emailer.resolveUserOrGuest = function (eventObj, callback) {
	// This method takes the event object, reads the sender email and resolves it to a uid
	// if the email is set in the system. If not, and guest posting is enabled, the email
	// is treated as a guest instead.
	var envelope = JSON.parse(eventObj.envelope);
	User.getUidByEmail(envelope.from, function (err, uid) {
		if (err) {
			return callback(err);
		}

		if (uid) {
			eventObj.uid = uid;
			callback(null, eventObj);
		} else {
			// See if guests can post to the category in question
			async.waterfall([
				async.apply(Topics.getTopicField, eventObj.tid, 'cid'),
				function (cid, next) {
					Privileges.categories.groupPrivileges(cid, 'guests', next);
				},
			], function (err, privileges) {
				if (err) {
					return callback(privileges);
				}

				if (privileges['groups:topics:reply']) {
					eventObj.uid = 0;

					if (parseInt(Meta.config.allowGuestHandles, 10) === 1) {
						if (eventObj.msg.from_name && eventObj.msg.from_name.length) {
							eventObj.handle = eventObj.msg.from_name;
						} else {
							eventObj.handle = eventObj.msg.from_email;
						}
					}

					callback(null, eventObj);
				} else {
					// Guests can't post here
					winston.verbose('[emailer.sendgrid] Received reply by guest to pid ' + eventObj.pid + ', but guests are not allowed to post here.');
					callback(new Error('[[error:no-privileges]]'));
				}
			});
		}
	});
};

Emailer.processEvent = function (eventObj, callback) {
	winston.verbose('[emailer.sendgrid] Processing incoming email reply by uid ' + eventObj.uid + ' to pid ' + eventObj.pid);
	Topics.reply({
		uid: eventObj.uid,
		toPid: eventObj.pid,
		tid: eventObj.tid,
		content: require('node-email-reply-parser')(eventObj.text, true),
		handle: (eventObj.uid === 0 && eventObj.hasOwnProperty('handle') ? eventObj.handle : undefined),
	}, callback);
};

Emailer.notifyUsers = function (postData, next) {
	var result = {
		posts: [postData],
		privileges: {
			'topics:reply': true,
		},
		'reputation:disabled': parseInt(Meta.config['reputation:disabled'], 10) === 1,
		'downvote:disabled': parseInt(Meta.config['downvote:disabled'], 10) === 1,
	};

	SocketHelpers.notifyNew(parseInt(postData.uid, 10), 'newPost', result);
	next();
};


Emailer.send = function (data, callback) {
	if (SendGrid) {
		Meta.settings.get('sendgrid', function (err, settings) {
			if (err) {
				return callback(err);
			}

			data.headers = data.headers || {};	// pre core v1.10.2

			async.waterfall([
				function (next) {
					if (data.fromUid) {
						next(null, data.fromUid);
					} else if (data._raw.notification && data._raw.notification.pid) {
						Posts.getPostField(data._raw.notification.pid, 'uid', next);
					} else {
						next(null, false);
					}
				},
				function (uid, next) {
					if (uid === false) { return next(null, {}); }

					User.getSettings(uid, function (err, settings) {
						if (err) {
							return next(err);
						}

						if (settings.showemail) {
							User.getUserFields(parseInt(uid, 10), ['email', 'username'], function (err, userData) {
								if (err) {
									return next(err);
								}

								next(null, userData);
							});
						} else {
							User.getUserFields(parseInt(uid, 10), ['username'], function (err, userData) {
								if (err) {
									return next(err);
								}

								next(null, userData);
							});
						}
					});
				},
				function (userData, next) {
					let replyTo;
					if (data._raw.notification && data._raw.notification.pid && settings.inbound_enabled === 'on') {
						replyTo = 'reply-' + data._raw.notification.pid + '@' + Emailer.hostname;
					}
					let from = data.from;
					if (data.from_name || userData.username) {
						from = (data.from_name || userData.username) + ' <' + data.from + '>';
					}
					SendGrid.send({
						to: data.to,
						cc: data.cc,
						bcc: data.bcc,
						toname: data.toName,
						subject: data.subject,
						from: from,
						text: data.text,
						html: data.html,
						headers: data.headers,
						reply_to: replyTo,
					}, next);
				},
			], function (err) {
				if (!err) {
					winston.verbose('[emailer.sendgrid] Sent `' + data.template + '` email to uid ' + data.uid);
					callback(null, data);
				} else {
					winston.warn('[emailer.sendgrid] Unable to send `' + data.template + '` email to uid ' + data.uid + '!!');
					winston.warn('[emailer.sendgrid] Error Stringified:' + JSON.stringify(err));
					callback(err);
				}
			});
		});
	} else {
		winston.warn('[plugins/emailer-sendgrid] API user and key not set, not sending email as SendGrid object is not instantiated.');
		callback(null, data);
	}
};

Emailer.handleError = function (err, eventObj) {
	var envelope = JSON.parse(eventObj.envelope);

	if (err) {
		switch (err.message) {
			case '[[error:no-privileges]]':
			case 'invalid-data':
			// Bounce a return back to sender
				hostEmailer.sendToEmail('bounce', envelope.from, Meta.config.defaultLang || 'en-GB', {
					site_title: Meta.config.title || 'NodeBB',
					subject: 'Re: ' + eventObj.subject,
					messageBody: eventObj.html,
				}, function (err) {
					if (err) {
						winston.error('[emailer.sendgrid] Unable to bounce email back to sender! ' + err.message);
					} else {
						winston.verbose('[emailer.sendgrid] Bounced email back to sender (' + envelope.from + ')');
					}
				});
				break;
		}
	}
};

Emailer.admin = {
	menu: function (custom_header, callback) {
		custom_header.plugins.push({
			route: '/plugins/emailer-sendgrid',
			icon: 'fa-envelope-o',
			name: 'Emailer (SendGrid)',
		});

		callback(null, custom_header);
	},
};

module.exports = Emailer;
