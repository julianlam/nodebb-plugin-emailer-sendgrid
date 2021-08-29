'use strict';

const winston = require.main.require('winston');
const async = require.main.require('async');
const nconf = require.main.require('nconf');
const url = require.main.require('url');
const db = require.main.require('./src/database');
const batch = require.main.require('./src/batch');
const user = require.main.require('./src/user');
const Meta = require.main.require('./src/meta');
const Posts = require.main.require('./src/posts');
const Topics = require.main.require('./src/topics');
const Privileges = require.main.require('./src/privileges');
const Plugins = require.main.require('./src/plugins');
const SocketHelpers = require.main.require('./src/socket.io/helpers');
const User = require.main.require('./src/user');
const hostEmailer = require.main.require('./src/emailer');

let Mailer;
let Client;

var Emailer = {
	_settings: {},
};

Emailer.hostname = url.parse(nconf.get('url')).hostname;
Emailer.receiptRegex = new RegExp('^reply-([\\d]+)@' + Emailer.hostname + '$');

Emailer.init = function (data, callback) {
	var render = async (req, res) => {
		var destinationURL = nconf.get('url') + '/plugins/emailer-sendgrid/webhook';
		const count = await Emailer.marketing.getCount();
		res.render('admin/plugins/emailer-sendgrid', {
			destinationURL: destinationURL,
			userCount: await db.sortedSetCard('users:joindate'),
			marketing: {
				id: Emailer._settings['marketing.id'],
				count,
				ok: count !== null,
			},
		});
	};

	Meta.settings.get('sendgrid', function (err, settings) {
		if (!err && settings && settings.apiKey) {
			Emailer._settings = settings;

			// For sending mail
			Mailer = require('@sendgrid/mail');
			Mailer.setApiKey(settings.apiKey);

			// For managing marketing client lists
			Client = require('@sendgrid/client');
			Client.setApiKey(settings.apiKey);
			Emailer.marketing.setup();
		} else {
			winston.error('[plugins/emailer-sendgrid] API key not set!');
		}

		var multipart = require.main.require('connect-multiparty');
		var multipartMiddleware = multipart();

		data.router.get('/admin/plugins/emailer-sendgrid', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/emailer-sendgrid', render);
		data.router.put('/api/admin/plugins/emailer-sendgrid/synchronize', Emailer.marketing.synchronize);
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


Emailer.send = async (data) => {
	if (Mailer) {
		data.headers = data.headers || {};	// pre core v1.10.2

		let fromUid;
		let userData = {};
		if (data.fromUid) {
			fromUid = data.fromUid;
		} else if (data._raw.notification && data._raw.notification.pid) {
			fromUid = await Posts.getPostField(data._raw.notification.pid, 'uid');
		}

		if (fromUid) {
			const settings = await User.getSettings(fromUid);
			if (settings.showemail) {
				userData = await User.getUserFields(parseInt(fromUid, 10), ['email', 'username']);
			} else {
				userData = await User.getUserFields(parseInt(fromUid, 10), ['username']);
			}
		}

		let replyTo;
		if (data._raw.notification && data._raw.notification.pid && Emailer._settings.inbound_enabled === 'on') {
			replyTo = 'reply-' + data._raw.notification.pid + '@' + Emailer.hostname;
		}
		let from = data.from;
		if (data.from_name || userData.username) {
			from = (data.from_name || userData.username) + ' <' + data.from + '>';
		}

		try {
			await Mailer.send({
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
			});
		} catch (err) {
			winston.warn('[emailer.sendgrid] Unable to send `' + data.template + '` email to uid ' + data.uid + '!!');
			winston.warn('[emailer.sendgrid] Error Stringified:' + JSON.stringify(err));
		}

		winston.verbose('[emailer.sendgrid] Sent `' + data.template + '` email to uid ' + data.uid);
	}
};

Emailer.handleError = function (err, eventObj) {
	var envelope = JSON.parse(eventObj.envelope);

	if (err) {
		switch (err.message) {
			case '[[error:no-privileges]]':
			case 'invalid-data': {
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

Emailer.marketing = {};

Emailer.marketing.setup = async () => {
	if (!nconf.get('isPrimary')) {
		return;
	}

	if (!Emailer._settings['marketing.id']) {
		// Create a new list
		winston.info('[plugins/emailer-sendgrid] No marketing list found, creating one now...');
		try {
			const [, body] = await Client.request({
				method: 'POST',
				url: '/v3/marketing/lists',
				body: {
					name: 'NodeBB',
				},
			});
			winston.info(`[plugins/emailer-sendgrid] Marketing list created: ${body.id}`);

			await Meta.settings.set('sendgrid', {
				'marketing.id': body.id,
			});
			Emailer._settings['marketing.id'] = body.id;
		} catch (e) {
			winston.warn('[plugins/emailer-sendgrid] Unable to create marketing list -- perhaps your API key does not have access to SendGrid Marketing?');
			return;
		}
	}

	// Create some custom fields
	winston.info('[plugins/emailer-sendgrid] Creating custom fields...');
	const newFields = {};
	await Promise.all(['username', 'fullname'].map(async (field) => {
		try {
			const [response, body] = await Client.request({
				method: 'POST',
				url: '/v3/marketing/field_definitions',
				body: {
					name: `nodebb_${field}`,
					field_type: 'Text',
				},
			});
			if (response.statusCode === 200) {
				winston.info(`[plugins/emailer-sendgrid] Custom field nodebb_${field} created.`);
				newFields[field] = body.id;
				Emailer._settings[`marketing.fields.${field}`] = body.id;
			}
		} catch (e) {
			if (e.response.body.errors[0].message === 'custom field name is already in use') {
				winston.info(`[plugins/emailer-sendgrid] Custom field nodebb_${field} already exists, OK.`);
			} else {
				winston.warn(`[plugins/emailer-sendgrid] Unable to create custom field: nodebb_${field}`);
			}
		}
	}));

	const newKeys = Object.keys(newFields);
	if (newKeys.length) {
		const payload = newKeys.reduce((memo, cur) => {
			memo[`marketing.fields.${cur}`] = newFields[cur];
			return memo;
		}, {});
		await Meta.settings.set('sendgrid', payload);
	}
	winston.info('[plugins/emailer-sendgrid] Done.');
};

Emailer.marketing.getCount = async () => {
	if (!Emailer._settings['marketing.id']) {
		return null;
	}

	try {
		const [, body] = await Client.request({
			method: 'GET',
			url: `/v3/marketing/lists/${Emailer._settings['marketing.id']}`,
		});
		return body.contact_count;
	} catch (e) {
		return null;
	}
};

Emailer.marketing.synchronize = async (req, res) => {
	winston.info('[plugins/emailer-sendgrid] Synchronizing...');
	await batch.processSortedSet('users:joindate', async function (uids) {
		const data = await user.getUsersFields(uids, ['username', 'email', 'fullname']);
		try {
			await Client.request({
				method: 'PUT',
				url: `/v3/marketing/contacts`,
				body: {
					list_ids: [Emailer._settings['marketing.id']],
					contacts: data.map((entry) => {
						const fields = ['username', 'fullname'].reduce((memo, prop) => {
							memo[Emailer._settings[`marketing.fields.${prop}`]] = entry[prop] || '';
							return memo;
						}, {});

						return {
							email: entry.email,
							custom_fields: fields,
						};
					}),
				},
			});
		} catch (e) {
			winston.warn('[plugins/emailer-sendgrid] Unable to synchronize.');
			res.sendStatus(500);
			// console.log(e.response.body);
		}
	}, { batch: 500, interval: 100 });

	winston.info('[plugins/emailer-sendgrid] Synchronization complete.');
	res.sendStatus(200);
};

Emailer.marketing.add = async ({ user }) => {
	if (Emailer._settings.marketing_enabled === 'on') {
		try {
			await Client.request({
				method: 'PUT',
				url: `/v3/marketing/contacts`,
				body: {
					list_ids: [Emailer._settings['marketing.id']],
					contacts: [{
						email: user.email,
					}],
				},
			});
			winston.info(`[plugins/emailer-sendgrid] Added new user ${user.username} to marketing list`);
		} catch (e) {
			winston.warn('[plugins/emailer-sendgrid] Failed to add new user to list');
			console.log(e.response.body);
		}
	}
};

module.exports = Emailer;
