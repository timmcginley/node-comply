import { createClient } from '@supabase/supabase-js';
import './workspace.css';

export async function mountAuth({ container, onSession, reportError }) {
  container.innerHTML = `<details id="authPanel" open><summary id="authSummary">Sign in to save and edit</summary>
    <div id="authSignedOut">
      <form id="authEmailForm"><label for="authEmail">University email</label><input id="authEmail" type="email" autocomplete="email" required>
        <button class="button" type="submit">Send sign-in code</button></form>
      <form id="authCodeForm" hidden><label for="authCode">Email code</label><input id="authCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10" required>
        <button class="button primary" type="submit">Verify code</button></form>
      <p>Use an account created by your facilitator. After sign-in, choose My team and Join / switch team.</p>
    </div>
    <button id="authSignOut" class="button" hidden>Sign out</button>
    <p id="authFeedback" role="status"></p>
  </details>`;
  const $ = id => container.querySelector(`#${id}`);
  const response = await fetch('/api/config');
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || 'Unable to load authentication settings.');
  const client = createClient(config.url, config.publishableKey, {
    auth: { detectSessionInUrl: false }
  });
  let sentEmail = '', lastUserId;
  function sessionChanged(session) {
    $('authSummary').textContent = session ? `Signed in: ${session.user.email}` : 'Sign in to save and edit';
    $('authSignedOut').hidden = !!session;
    $('authSignOut').hidden = !session;
    if (session) {
      $('authCode').value = '';
      $('authCodeForm').hidden = true;
      $('authPanel').open = false;
      $('authFeedback').textContent = 'Signed in. Team edit permissions are checked separately.';
    }
    const id = session?.user.id || null;
    if (id === lastUserId) return;
    lastUserId = id;
    onSession(session);
  }
  client.auth.onAuthStateChange((_event, session) => {
    // Do not call other Auth APIs while the SDK holds its session lock.
    setTimeout(() => sessionChanged(session), 0);
  });
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(`Unable to restore sign-in: ${error.message}`);
  sessionChanged(data.session);
  async function action(form, callback) {
    const button = form.querySelector('button');
    button.disabled = true;
    $('authFeedback').textContent = '';
    try { await callback(); }
    catch (error) { $('authFeedback').textContent = error.message; reportError(error); }
    finally { button.disabled = false; }
  }
  $('authEmailForm').addEventListener('submit', event => {
    event.preventDefault();
    action(event.target, async () => {
      const email = $('authEmail').value.trim();
      sentEmail = '';
      $('authCode').value = '';
      $('authCodeForm').hidden = true;
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      sentEmail = email;
      $('authCodeForm').hidden = false;
      $('authFeedback').textContent = 'If this account is eligible, a code has been sent. Check your inbox. Wait at least 60 seconds before requesting another code.';
      $('authCode').focus();
    });
  });
  $('authCodeForm').addEventListener('submit', event => {
    event.preventDefault();
    action(event.target, async () => {
      if (!sentEmail) throw new Error('Request a code for your email first.');
      const { error } = await client.auth.verifyOtp({ email: sentEmail, token: $('authCode').value.trim(), type: 'email' });
      if (error) throw error;
      $('authFeedback').textContent = 'Signed in. Loading your workspace access…';
    });
  });
  $('authSignOut').addEventListener('click', async () => {
    $('authSignOut').disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      $('authFeedback').textContent = 'Signed out on this browser. Browser recovery data is retained; use a private device.';
    } catch (error) { $('authFeedback').textContent = error.message; reportError(error); }
    finally { $('authSignOut').disabled = false; }
  });
  return client;
}
