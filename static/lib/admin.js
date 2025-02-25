'use strict';

define('admin/plugins/emailer-sendgrid', ['settings', 'alerts'], function (settings, alerts) {
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
			alerts.success('Synchronization with SendGrid started.');
		});
	};

	function saveSettings() {
		settings.save('sendgrid', $('.emailer-settings'), function () {
			alerts.alert({
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
