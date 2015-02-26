<h1><i class="fa fa-envelope-o"></i> Emailer (SendGrid)</h1>

<div class="row">
	<div class="col-lg-12">
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
	</div>
</div>

<hr />

<form role="form" class="emailer-settings">
	<fieldset>
		<div class="row">
			<div class="col-sm-6">
				<div class="form-group">
					<label for="apiUser">API User</label>
					<input placeholder="Api User here" type="text" class="form-control" id="apiUser" name="apiUser" />
				</div>
			</div>
			<div class="col-sm-6">
				<div class="form-group">
					<label for="apiKey">API Key</label>
					<input placeholder="Api Key here" type="text" class="form-control" id="apiKey" name="apiKey" />
				</div>
			</div>
		</div>

		<button class="btn btn-lg btn-primary" id="save" type="button">Save</button>
	</fieldset>
</form>

<script type="text/javascript">
	require(['settings'], function(Settings) {
		Settings.load('sendgrid', $('.emailer-settings'));

		$('#save').on('click', function() {
			Settings.save('sendgrid', $('.emailer-settings'), function() {
				socket.emit('admin.reload');
			});
		});
	});
</script>