# Email-code sign-in and shared workspaces

The implementation is in the app, but the database must be provisioned before
shared loading/saving will work. On 2 November the user confirmed the
`20261102_focus_canvases.sql` migration was successfully applied and the
workflow worked. The assistant has not applied hosted SQL or deployed this release.
Use approved dummy accounts until institutional privacy
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

### Course-wide canvases and self-service membership

After the original migration, run the additive
[focus-canvas migration](migrations/20261102_focus_canvases.sql) **once** in SQL
Editor. It preserves all existing workspaces, memberships and revisions.
Do not rerun the original migration.

The new migration adds:

- Five course-wide canvases: Architecture, Indoor / energy, Structure, Materials
  and Build, independent of each team's existing canvas and BPMN diagrams.
- `focus_canvases` and immutable `focus_canvas_revisions`, with authenticated
  reads, member/facilitator writes and a conflict-checked `save_focus_canvas` RPC.
  Any team member may edit any focus and assign suggestions to any registry team.
  Suggestions require a six-C category and may remain unassigned. Assignment
  records planned responsibility, not acceptance, implementation or evidence.
- `choose_team`, an authenticated RPC that replaces only the caller's memberships
  with one existing team. Users may join and switch freely; it cannot assign
  another user or grant facilitator status. Direct table writes stay denied.

**This intentionally changes the access model:** an existing account can choose
any team and thereby gain edit access to that team's workspace. Merely viewing
a team still grants nothing. Removing a membership is no longer a lasting
revocation because the user can rejoin. Control account/session access in
Supabase when needed, and verify its session/JWT revocation behaviour.
Facilitator status remains administrator-managed.

These are explicit-save, revision-based canvases, not simultaneous live editing.
Each focus/account has separate browser recovery. Conflicts preserve the draft;
load latest and explicitly choose recovery or the loaded canvas before editing.
Use **Save course canvas** and **Download canvas** for course work; team exports
and team saves remain separate and do not include the five course canvases.
Focus selection is retained in this tab per account, including across Speckle
authorization. Raw Speckle property tables remain memory-only.

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

Run this example in the trusted SQL Editor, replacing the placeholder:

```sql
insert into public.facilitators (user_id)
values ('<facilitator-user-uuid>')
on conflict do nothing;
```

Students then sign in, select **My team**, and click **Join / switch team**.
You still create their accounts/emails in Supabase, but no longer need to copy
student UUIDs into membership SQL. Public signup remains disabled.
Switching removes the caller's previous memberships, retains browser drafts,
and refreshes edit permissions. **View team** only changes which submitted/team
workspace is displayed; it does not join that team.
Unassigned accounts can read shared work but must join before editing.
Database permissions are rechecked on every save even with stale browser controls.
Trusted administrators may still manage membership/facilitator rows directly;
reload **Load latest** after an external change. Do not delete historical authors:
revision authorship retains a foreign key to each user's UUID.
There is no invitation, facilitator-management or history-restore UI.

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
npm run validate
npm start
```

Open `http://localhost:3000`. These steps use Express for both assets and APIs;
the bare Vite dev server alone does not provide the API routes.
`npm run validate` runs the full Node/PostgreSQL test suite and production build.
The existing Render compute remains separate from the Supabase database.

### Register production Speckle access before pushing

1. In Speckle, open the app-registration settings used for the localhost app.
   Register a **separate production app**, retaining the local registration for
   development. Give it a recognisable name such as MasterBPMN production.
2. Set its redirect/callback URL to exactly:

   ```text
   https://tools.boxbuild.dk/speckle/callback
   ```

3. Use the same read-only granular Project Core and Model scopes as the local
   pilot. Confirm version/property reads with an approved test model after
   deployment; add further read scope only if the API explicitly requires it.
4. Copy the **public App ID** into Render's `SPECKLE_APP_ID`. Do not copy an App
   Secret, PAT or any user's token into source, Render or workspace records.
   The browser uses PKCE and each user grants their own Speckle access.

The production registration is not yet configured. The app cannot verify an
App ID's registered callback/scopes locally; real consent and private reads
remain acceptance checks. Supabase sign-in is independent of Speckle authorization.

### Configure Render

Use the existing Starter web service. The [Blueprint](../render.yaml) specifies:

| Setting | Value |
| --- | --- |
| Node | `24.x` via [`.node-version`](../.node-version) |
| Build command | `npm ci --include=dev && npm run validate` |
| Start command | `npm start` |
| Health check | `/api/health` |
| `NODE_ENV` | `production` |
| `SPECKLE_APP_ID` | Public ID from the production registration above |
| `SPECKLE_REDIRECT_URL` | `https://tools.boxbuild.dk/speckle/callback` |

If this service is configured manually rather than synchronized to the Blueprint,
set the same build/start/health/environment values in its Dashboard. Remove or
update any `NODE_VERSION` override that would take precedence over `.node-version`.
Keep the existing public Supabase configuration unless deliberately changing projects.
No persistent disk, database password or service-role key is needed.

Production Speckle settings are mandatory: missing/invalid settings return JSON
`503` from `/api/speckle/config` and show an explicit error by Connect Speckle.
Other app features still work. Local non-production defaults remain unchanged.
`/api/health` checks server reachability, not database policies, email delivery or
Speckle consent. Unknown API endpoints return JSON `404`, not the app shell.

### Release order and smoke checks

1. Confirm backups and take JSON downloads of important team and course work.
   The latest migration is user-confirmed applied; **do not rerun it** as a reset.
2. Confirm Supabase Site URL is `https://tools.boxbuild.dk`, allowed development/
   Render URLs are deliberate, public signup stays disabled, and a dummy account
   can receive and verify its email code.
3. Configure the production Speckle registration and Render values above.
4. Review/commit/push the release when approved. `autoDeploy: true` means a push
   to Render's configured deployment branch can immediately deploy it. Do not
   push before production environment values are ready.
5. For the first release after earlier tracked-dependency build problems, use
   **Clear build cache & deploy** if the old build cache has not been cleared.
   Tests and build must pass before Render starts the new service.
6. Open `https://tools.boxbuild.dk/api/health` and `/api/speckle/config`.
   The latter must return the production App ID and exact HTTPS callback, never
   localhost. Open `/speckle/callback` directly to verify the app shell loads.
7. Test a new browser session: email sign-in, self-team joining/switching, one
   team save/reload and one course-canvas suggestion/save/reload. Use two
   approved dummy accounts to check visibility and a conflicting save.
8. Connect Speckle from the production origin; complete consent, select an
   approved pinned version, read/filter/count/display, then save/reload. Do not
   treat public config/schema checks as proof of real OAuth or model access.

On 2 November both `https://tools.boxbuild.dk/api/health` and the Render hostname
returned HTTP 200 over HTTPS. This confirms reachability of the **existing**
deployment, not that these uncommitted release changes are deployed or that
authentication, database writes and production Speckle authorization have passed.
Full acceptance checks continue below.

## 5. Pilot acceptance checks

1. Request/enter an email code. Check the sender address and that no personal
   Resend login address appears. Wrong/expired codes must show errors.
2. As student A, join ARC-01; open **Team diagrams**, add/move blocks and bring a
   claim from Design, then **Save shared workspace**. BPMN editing/upload/mapping
   controls are hidden; do not require editing XML through this tab.
3. Reload and use a second browser/device to verify the team canvas and records
   were loaded from Supabase, not the first browser's storage. Download the
   workspace and confirm both legacy XML diagrams and archived records remain.
4. As student B, view ARC-01 but verify all mutation controls are read-only.
   Confirm a direct foreign-team RPC is denied, not just a disabled button.
5. Confirm the facilitator can edit both teams. An unassigned account must not.
   Then let student B explicitly join/switch to ARC-01 and confirm editing is
   granted there and removed from the former team. Confirm another user's
   memberships and facilitator status cannot be changed through the RPC.
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
   currently retained diagrams. Individual BPMN download controls are hidden;
   full workspace downloads still contain both XML diagrams.
9. Redeploy Render and verify shared work survives. Exercise the team's
   independent database backup/restore procedure before class rollout.
10. In **Subject diagrams**, switch through all five course canvases; confirm no
    team option appears in its selector. Add a suggestion in
    each of the six categories, assign another team and use **Assign my team**.
    Save/reload from a second account and confirm that the same course canvas
    is visible regardless of team, while other focuses and team canvases remain
    separate. Test course-save conflicts, explicit recovery, failed reload,
    sign-out, refresh and smaller screens. Confirm raw model tables are not saved.
11. Copy selected blocks with internal wires in **Team diagrams**, switch to
    **Subject diagrams**, and Paste. Verify the reverse direction and copying
    between subjects, then save/reload each destination separately. Copies need
    fresh IDs and no execution results; read-only destinations must reject
    paste/deletion. Returning to Subject diagrams should remember the last subject.
    Cancel an unsaved-departure prompt and confirm the original tab/draft remains.

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
