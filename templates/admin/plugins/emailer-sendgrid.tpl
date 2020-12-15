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
				Register for an account on <a href="https://sendgrid.com">https://sendgrid.com</a>. SendGrid offers a free tier allowing up to 100 sent emails daily.
			</li>
			<li>
				Once logged in, navigate to <a href="https://app.sendgrid.com/settings/api_keys">Settings > API Keys</a>, and create a new API key. You can specify "Full Access", or "Restricted Access". For the latter, you will need to enable the following components:
				<ol>
					<li>Mail Send</li>
					<li>Marketing</li>
				</ol>
			<li>
				Once created, enter the key into the field below, and restart your NodeBB.
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

<div class="panel panel-default">
	<div class="panel-heading">Incoming Email Settings</div>
	<div class="panel-body">
		<p>
			This plugin can also be configured to receive emails <strong>if configured properly via Sendgrid</strong>.
		</p>
		<ol>
			<li>
				Go to <a href="https://app.sendgrid.com/settings/parse" target="_blank">Settings -> Inbound Parse</a> -> <strong>Add Host & URL</strong>.
			</li>
			<li>
				You may be requested to add a "New Domain Whitelabel", if so, follow the instructions to set up your DNS settings accordingly. If you are hosted as a subdomain on NodeBB, please open a support ticket on our <a href="https://nodebb.org" target="_blank">live chat</a> or email us at <a href="mailto:support@nodebb.org">support@nodebb.org</a> to set this up for you.
			</li>
			<li>
				Under Destination URL, paste the following: <code>{destinationURL}</code>
			</li>
		</ol>
		<form role="form" class="emailer-settings">
			<fieldset>
				<div class="row">
					<div class="col-sm-6">
						<div class="checkbox">
							<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
								<input class="mdl-switch__input" type="checkbox" id="inbound_enabled" name="inbound_enabled">
								<span class="mdl-switch__label">Enable Reply-by-email</span>
							</label>
						</div>
					</div>
				</div>
			</fieldset>
		</form>
	</div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>
