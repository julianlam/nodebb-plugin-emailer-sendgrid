<h1><i class="fa fa-envelope-o"></i> Emailer (Mandrill)</h1>

<div class="row">
	<div class="col-lg-12">
		<blockquote>
			<p>
				Mandrill is a programmable email platform. It allows your application to become a fully featured email server. Send, receive and track messages with ease using your favorite programming language.<br /><br />
			</p>
			<p>
				Imagination is your limit. Email is not hard anymore.
			</p>
		</blockquote>
		<p>
			To get started:
		</p>
		<ol>
			<li>
				Register for an account on <a href="http://mandrill.com">http://mandrill.com</a>. Mandrill offers a free tier with up to 12,000 free emails monthly.
			</li>
			<li>
				Paste your API key into the field below, hit save, and restart your NodeBB
			</li>
		</ol>
	</div>
</div>

<hr />

<form role="form">
	<fieldset>
		<div class="row">
			<div class="col-sm-6">
				<div class="form-group">
					<label for="mandrill:apiKey">API Key</label>
					<input type="text" class="form-control" id="mandrill:apiKey" data-field="mandrill:apiKey" />
				</div>
			</div>
		</div>

		<button class="btn btn-lg btn-primary" id="save">Save</button>
	</fieldset>
</form>

<script type="text/javascript">
	require(['forum/admin/settings'], function(Settings) {
		Settings.prepare();
	});
</script>