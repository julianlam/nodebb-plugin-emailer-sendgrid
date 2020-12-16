'use strict';

/* globals $, app, socket, define, config */

define('admin/plugins/emailer-sendgrid', ['settings'], function (settings) {
	var ACP = {};

	ACP.init = function () {
		settings.load('sendgrid', $('.emailer-settings'));
		$('#save').on('click', saveSettings);

		$('[data-action="synchronize"]').on('click', ACP.synchronize);
	};

	ACP.synchronize = function () {
		$.ajax({
			method: 'put',
			url: config.relative_path + '/api/admin/plugins/emailer-sendgrid/synchronize',
			headers: {
				'x-csrf-token': config.csrf_token,
			},
		}).done(() => {
			app.alertSuccess('Synchronization with SendGrid started.');
		});
	};

	function saveSettings() {
		settings.save('sendgrid', $('.emailer-settings'), function () {
			app.alert({
				type: 'success',
				alert_id: 'sendgrid-saved',
				title: 'Settings Saved',
				message: 'Please reload your NodeBB to apply these settings',
				clickfn: function () {
					socket.emit('admin.reload');
				},
			});
		});
	}

	return ACP;
});
