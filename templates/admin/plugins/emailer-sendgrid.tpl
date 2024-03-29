<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
			<div class="row">
				<div class="col-sm-6">
					<div class="card">
						<div class="card-header">Emailer (SendGrid)</div>
						<div class="card-body">
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
								<div class="mb-3">
									<label class="form-label" for="apiKey">API Key</label>
									<input placeholder="Api Key here" type="text" class="form-control" id="apiKey" name="apiKey" />
								</div>
							</form>
						</div>
					</div>
				</div>
				<dic class="col-sm-6">
					<div class="card">
						<div class="card-header">Marketing List</div>
						<div class="card-body">
							<p class="lead">
								NodeBB can also be set up to automatically add members to a <a href="https://sendgrid.com/docs/ui/managing-contacts/">SendGrid marketing list</a>.
							</p>
							<p>
								Please note that users registered before this plugin was activated will not be automatically added. At any time, you can hit the "Synchronize" button to add missing users and update records, if applicable.
							</p>

							<hr />

							{{{ if marketing.ok }}}
								<p>
									Status: <span style="color: green;">Operational</span><br />
									Count: {marketing.count} contacts in list, {userCount} users registered | <a href="https://mc.sendgrid.com/contacts/lists/{marketing.id}">View list in SendGrid</a>
								</p>

								<form role="form" class="emailer-settings">
									<div class="form-check">
										<input class="form-check-input" type="checkbox" id="marketing_enabled" name="marketing_enabled">
										<label class="form-check-label">
											<span>Enable automatic addition of newly registered users</span>
										</label>
									</div>
								</form>

								<button class="btn btn-block btn-primary" data-action="synchronize"><i class="fa fa-refresh"></i> Synchronize</button>
							{{{ else }}}
								<div class="alert alert-warning">
									<p>
										We were unable to communicate with SendGrid to verify your marketing list, please double-check your API key's permissions, or generate a new API key.
									</p>
									<p>
										If you have recently added a new API key to this control panel, you may need to restart NodeBB
									</p>
								</div>
							{{{ end }}}
						</div>
					</div>

					<div class="card">
						<div class="card-header">Incoming Email Settings</div>
						<div class="card-body">
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
										<div class="col-12">
											<div class="form-check mb-3">
												<input class="form-check-input" type="checkbox" id="inbound_enabled" name="inbound_enabled">
												<label class="form-check-label">
													Enable Reply-by-email
												</label>
											</div>
										</div>
									</div>
								</fieldset>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
