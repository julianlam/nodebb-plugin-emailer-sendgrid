<div class="row">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading">Emailer (SendGrid)</div>
			<div class="panel-body">
				<blockquote>
					<p>
						SendGrid is the world's largest Email Infrastructure as a Service provider. Our email delivery service moves 2% of the world's non-spam email (over 14 billion emails/month) for more than 180,000 companies including technology leaders like Pinterest, Spotify, and Uber.
					</p>
				</blockquote>
				<p>
					To get started:
				</p>
				<ol>
					<li>
						Register for an account on <a href="https://sendgrid.com">https://sendgrid.com</a>. SendGrid offers a free tier with up to 400 free emails daily.
					</li>
					<li>
						Locate your API user and key, enter it into the fields below, and reload/restart your NodeBB
					</li>
				</ol>

				<hr />

				<form role="form" class="emailer-settings">
					<div class="form-group">
						<label for="apiKey">API Key</label>
						<input placeholder="Api Key here" type="text" class="form-control" id="apiKey" name="apiKey" />
					</div>
				</form>
			</div>
		</div>
	</div>
	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Settings</button>
			</div>
		</div>
	</div>
</div>

<script type="text/javascript">
	require(['settings'], function (Settings) {
		Settings.load('sendgrid', $('.emailer-settings'));

		$('#save').on('click', function () {
			Settings.save('sendgrid', $('.emailer-settings'), function () {
				app.alert({
					type: 'success',
					alert_id: 'quickstart-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function () {
						socket.emit('admin.reload');
					},
					timeout: 5000
				});
			});
		});
	});
</script>