# Email-code sign-in and shared workspaces

The implementation is in the app, but the database must be provisioned before
shared loading/saving will work. No SQL has been applied to the hosted project
by this change. Use approved dummy accounts until institutional privacy
approval is confirmed; an EU region alone is not that approval.

## 1. Apply the database migration

In your Supabase project, open **SQL Editor**, create a query, paste the entire
[workspace migration](migrations/20261026_workspace.sql), and run it **once** as
the trusted project administrator. It is a transaction: errors roll it back.
Do not re-run it to reset data.

It creates:

- `teams`: the 21 public registry IDs. Add future team IDs here as well as in
  the app registry.
- `team_memberships` and `facilitators`: private, administrator-managed access.
  An authenticated user can inspect only their own rows.
- `workspaces`: the latest complete workspace for each team.
- `workspace_revisions`: immutable history of successful saves.
- `save_workspace`: atomic, permission-checked save using an expected revision.

Anonymous clients cannot read these tables or call the save function.
Authenticated accounts can read every team's workspace and history, but can
save only teams they belong to; facilitators can save all registered teams.
Clients have **no direct insert/update/delete grants**, including on memberships.
The save function derives the author from `auth.uid()`, never from the browser.
The first save expects revision `0`; stale creates/updates raise `40001`.
Payloads require schema version 1, all record arrays, both diagram keys
(nonempty XML text or explicit `null`), and at most 10 MiB of database JSON text.
XML imports are validated by bpmn-js in the app; the database validates the
envelope, not BPMN semantics or engineering correctness.

## 2. Configure email authentication

In **Authentication** settings:

1. Enable the email provider. Disable public new-user signups for this pilot.
   The app additionally requests codes with `shouldCreateUser: false`.
2. Use your Resend SMTP configuration:
   - host: `smtp.resend.com`
   - port: `465`
   - username: `resend`
   - password: a Resend sending API key
   - sender: `hello@boxbuild.dk`, after the sending domain is verified
3. Edit the **Magic Link** email template to show `{{ .Token }}` as the sign-in
   code rather than requiring a link. For example:

   ```html
   <h2>Sign in to MasterBPMN</h2>
   <p>Your one-time sign-in code is: <strong>{{ .Token }}</strong></p>
   <p>Return to MasterBPMN and enter this code. Do not share it.</p>
   ```

4. Keep OTP expiry short and review code-request/verification rate limits and
   Resend sending quotas before a classroom burst. The app accepts 6-10 digits;
   enter the full code configured by Supabase. Provider rate-limit and invalid/
   expired-code errors are shown, not treated as successful sign-ins.
5. Set Site URL to `https://tools.boxbuild.dk` once Render confirms valid HTTPS.
   Allow your Render URL and `http://localhost:3000` as appropriate development
   URLs. Code entry does not require redirect navigation.

SMTP credentials belong **only in Supabase**, never in the app source, Render
public configuration, workspace exports or browser. Do not supply a service-role
or secret API key to this app.

## 3. Create pilot users and assign access

Use **Authentication > Users > Add user > Create user** in the Dashboard.
Create a facilitator and two approved test student accounts. If the Dashboard
requires a password, use a separate random password; students use email codes,
not that password. Copy each user's **UUID** from the Users screen.

Run these examples in the trusted SQL Editor, replacing the placeholders:

```sql
insert into public.facilitators (user_id)
values ('<facilitator-user-uuid>')
on conflict do nothing;

insert into public.team_memberships (user_id, team_id)
values
  ('<first-student-user-uuid>', 'ARC-01'),
  ('<second-student-user-uuid>', 'ARC-02')
on conflict do nothing;
```

Being signed in, choosing a team, or having a certain email domain does **not**
grant edit permission. Accounts without membership/facilitator rows are
read-only. Reload **Load latest** after changing membership. Database
permissions are rechecked on every save even if a browser has stale controls.
To revoke editing, delete the relevant membership/facilitator row in the
Dashboard/SQL Editor. Disable/ban an account instead of deleting an author:
revision authorship retains a foreign key to that user's UUID.
There is no invitation, membership-management or history-restore UI in this pilot.

## 4. Deploy or run locally

The selected project's **public** URL and publishable key are in
[supabase-config.js](../supabase-config.js). Express exposes them at
`/api/config`. Optional Render/process environment overrides:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Only public publishable keys are accepted by this configuration endpoint.
No database password, SMTP key or service-role key is needed in Render.

```powershell
npm ci --include=dev
npm test
npm run build
npm start
```

Open `http://localhost:3000`. These steps use Express for both assets and APIs;
the bare Vite dev server alone does not provide the API routes.
Render uses the same build/start commands. Deploy the application changes after
applying the migration; the existing Render compute remains separate from the
Supabase database. DNS/HTTPS and an actual redeploy still need live verification.

## 5. Pilot acceptance checks

1. Request/enter an email code. Check the sender address and that no personal
   Resend login address appears. Wrong/expired codes must show errors.
2. As student A, edit ARC-01; generate a patch, move a block, edit each diagram,
   add a mapping/claim, then **Save shared workspace**.
3. Reload and use a second browser/device to verify both XML diagrams and all
   records were loaded from Supabase, not the first browser's storage.
4. As student B, view ARC-01 but verify all mutation controls are read-only.
   Confirm a direct foreign-team RPC is denied, not just a disabled button.
5. Confirm the facilitator can edit both teams. An unassigned account must not.
6. Open two editable browsers at the same revision. Save one, then save the
   other: the second must report a conflict and retain its draft.
7. **Load latest** loads the server copy without silently applying recovery.
   If a different browser draft exists, explicitly choose recovery or the
   loaded version before editing. Recovery replaces the displayed workspace,
   not the database; it still needs an explicit save.
   **Download browser recovery** downloads that draft without applying it,
   including during a database outage. A failed reload retains the previously
   displayed workspace read-only for download instead of replacing it with blanks.
8. Download/import a workspace JSON and check both diagrams and archived
   evidence survive. Legacy JSON has no diagrams, so importing it keeps the
   currently displayed diagrams. Individual BPMN downloads remain available.
9. Redeploy Render and verify shared work survives. Exercise the team's
   independent database backup/restore procedure before class rollout.

Browser recovery is per account and team on this origin, not a secure vault:
anyone with access to the same browser profile can inspect it. Sign-out removes
the session on this browser but deliberately retains recovery. Old
`masterbpmn:<team>` and separate XML keys are offered for explicit migration
and never overwritten/deleted. On a shared device, download your work and clear
site data when finished. A domain change creates a different storage origin:
export old browser drafts before switching from the Render URL to the custom
domain.

`npm test` includes embedded PostgreSQL (PGlite) checks of the actual migration's
grants, RLS, authorship, history, revocation and conflicting saves, plus browser
recovery/repository unit tests. Embedded tests and mocked-browser checks do not
verify hosted Supabase, real email delivery, DNS, backups or Render deployment.
