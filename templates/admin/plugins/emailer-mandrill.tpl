<h1><i class="fa fa-envelope-o"></i> Emailer (Mandrill)</h1>

<div class="row">
	<div class="col-lg-12">
		<blockquote>
			<p>
				Mandrill is a programmable email platform. It allows your application to become a fully featured email server. Send, receive and track messages with ease using your favorite programming language.<br /><br />
			</p>
		</blockquote>
		<p>
			To get started:
		</p>
		<ol>
			<li>
				Register for an account on <a href="http://mandrill.com">http://mandrill.com</a>. Mandrill offers a free tier with up to 250 free emails hourly.
			</li>
			<li>
			    Find your key, <a target="_blank" href="http://i.imgur.com/Hf0aCJX.png">screenshot-1</a>, <a target="_blank" href="http://i.imgur.com/edlN37G.png">screenshot-2</a>
			</li>
			<li>
				Paste your API key into the field below, hit save, and restart your NodeBB
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
		Settings.load('mandrill', $('.emailer-settings'));

		$('#save').on('click', function() {
			Settings.save('mandrill', $('.emailer-settings'), function() {
				socket.emit('admin.restart');
			});
		});
	});
</script>