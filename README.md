# node-comply

Formerly MasterBPMN. The name has changed; existing browser storage keys,
the `masterbpmn-all-canvases` export identifier and BPMN XML namespace remain
unchanged for compatibility. The repository folder, existing Render service
name and deployment URLs are not renamed by this change.

Claim-led building-analysis planning with Design, Team diagrams and Subject diagrams.

```powershell
npm ci --include=dev
npm run validate
npm start
```

Open `http://localhost:3000`. Express serves the UI and API.

After signing in with a facilitator-created Supabase account, choose **My team**
and **Join / switch team**. Students can change teams themselves; account
registration still happens in Supabase and public signup remains disabled.
Joining a team grants edit access to its workspace; switching removes previous
memberships. **View team** only browses work and does not change membership.

**Team diagrams** contains the viewed team's team-specific planning canvas, edited by
its members or facilitators. **Subject diagrams** contains only five course-wide
canvases in its **Canvas** selector: Architecture, Indoor / energy, Structure,
Materials and Build. Any signed-in team member can edit a course canvas.
BPMN editing/upload/mapping controls are hidden; existing BPMN XML and archived
records remain in team saves, recovery and workspace downloads.
**Plan this claim in Team diagrams** takes a Design claim to the team canvas.
Add a **Suggestion**
with any six-C category, then name it, describe its sockets/notes and assign any
team or **Assign my team** in its details. Suggestions remain non-executable
proposals. Use **Save course canvas** to share edits, or **Save shared workspace**
for the separate team workspace. Each focus has conflict-checked revisions,
explicit browser recovery and its own JSON download.

### Week 12: share, review and use results

On a subject contribution, save its **Responsible team**, then use
**Open [team] team diagram** to view the whole team canvas. The return button
restores the subject; browsing does not change membership or editing permissions.
There is no block synchronisation.

On the providing subject block, **Shared results** records a named result link,
model/version, code revision, settings, meaning/units/limitations and readiness.
Add another entry for a new delivery and choose the selected result; old entries
remain. Use commit-specific links for reviewed/used data. The app stores
references, not file copies, and cannot freeze a mutable branch URL.
Entries on team blocks do not automatically appear on subject blocks.

On the solid information wire from provider to receiver, **Receiver review and
use** records the receiving team and separate review/use outcomes against one
exact result. Changes/clarifications require an explanation; **Used** requires
a receiving-function code link and reflection; **Blocked** requires a reason.
Responses append to history with a snapshot of the result reference/metadata.
Selecting a newer result never silently updates prior responses. **Not reviewed**
on a use-only entry does not erase an earlier review.

These are workshop declarations, not authenticated approvals or proof of
engineering correctness. Any member may edit the shared subject canvas, but
other teams' workspaces remain read-only. Save with **Save course canvas** to
share changes; recovery, conflict checks, downloads and exports retain the new
fields. Old canvases still load. Do not delete a block/connection whose embedded
result/response history you want to keep. No database migration or Python-template
change is required. See the [workshop guide](WORKSHOP_GUIDE.md).

### Canvas exports and editing

**Download all canvases** is available after sign-in on every tab. It downloads
one JSON file containing the latest saved workspace for every registered team
and all five subject canvases, with team repository metadata, revisions, full
records and archived BPMN XML. Canvases without a shared save are explicitly
listed with `shared: null`. This account's browser recovery drafts are included
separately under `browserRecovery`; they do not replace shared revisions.
The export does not save or switch canvases, include other devices' drafts,
capture in-memory-only edits, or include revision history. Save intended shared
changes before exporting. Reads occur over an interval, not an atomic database
snapshot. A failed read or invalid recovery draft stops the export rather than
producing a partial-success file. This is an inspection/data export, not a full
database backup, and the combined file cannot be loaded by **Import workspace**.
Keep the file private: it contains the course's shared work.

Suggestions use a light grey fill and dashed border. **+ Information input**
adds a square-edged document block: save its value, optional units and reference,
then wire it to a Capture suggestion. This is planning information, not an
executable property loader. Blocks show applied model/version, IFC class/property
path, current count (including zero), or saved Information value. Unsaved
inspector edits do not replace applied values; stale counts are marked not current.

Drag a rectangle from empty canvas space to select overlapping blocks. Hold
Shift/Ctrl/Cmd while dragging to add blocks; Escape cancels. Selection works
with zoom/scroll and in read-only canvases without changing saved data.
Shift/Ctrl/Cmd-click also selects multiple blocks or wires. With the canvas focused,
use Ctrl/Cmd+A to select all, Ctrl/Cmd+C/V to copy/paste, and Delete/Backspace to
delete selected items and wires attached to deleted blocks. Drag or use arrow
keys to move selected blocks together (Shift+arrow moves farther). Toolbar Copy,
Paste and Delete buttons are also available. Text fields keep normal text shortcuts.
To copy between team and subject canvases: select blocks, **Copy selected**,
switch to **Team diagrams** or **Subject diagrams**, then click **Paste**.
To copy between subjects, choose Architecture,
Indoor / energy, Structure, Materials or Build in **Canvas**, then click **Paste**.
The copied-block hint stays visible after switching tabs or subjects, and the
last subject is remembered when returning from Team diagrams. Unsaved-departure
and explicit recovery prompts still apply. Keyboard paste works when
the canvas is focused, not while the Canvas dropdown or a text field has focus.
The clipboard is internal to this browser tab, works across editable canvases,
and clears on refresh or account change. Copies include internal wires and saved
settings, but get fresh identities and no execution results, shared deliveries,
receiver reviews or use declarations. Cross-canvas copies
bring linked planning context, not evidence, approvals or BPMN source links.
Save the destination canvas to share pasted changes. Existing database JSON
storage supports these additions; no further migration is needed.

Apply the additive [focus-canvas migration](supabase/migrations/20261102_focus_canvases.sql)
after the original workspace migration to enable these workflows.

- [Current behaviour and next steps](PROJECT_NOTES.md)
- [Email-code authentication, database setup and pilot checks](supabase/README.md)
- [Changelog](CHANGELOG.md)
- [Standalone student Speckle template](student-template/README.md)
- [Student IFC template (separate repository)](https://github.com/timmcginley/node-comply-template)

### Production deployment

The target URL is `https://tools.boxbuild.dk`. Render uses Node 24.x from
[.node-version](.node-version), installs from the lockfile, then runs the full
test/build gate with `npm run validate` before starting Express.

**Before deploying**, register a production Speckle app with this exact callback:

```text
https://tools.boxbuild.dk/speckle/callback
```

Set its public app ID as `SPECKLE_APP_ID` in Render; `SPECKLE_REDIRECT_URL`
must match the callback above and `NODE_ENV` must be `production`.
Production never falls back to the localhost registration. Missing/invalid
settings explicitly disable Speckle, without disabling the rest of the app.
No app secret or personal access token is required.
See the [production setup and release checklist](supabase/README.md#4-deploy-or-run-locally)
for dashboard settings, backup and post-deploy checks.

Toolbench now starts with **Capture > Speckle model**: connect Speckle, enter a
project URL, choose a model and exact version, then save the reference. This
block captures a reference, not the model itself.
Choosing a version only stages it: click **Use selected version** to update the
block's applied reference. The inspector confirms the pending selection.
For troubleshooting, the browser console logs `[node-comply Speckle]` events for
version selection (including ignored selections) and application, with reference
IDs and edit/currentness checks only, never authentication tokens or model data.
**Read model properties** also logs unavailable/ignored actions, clicks, request
starts, version-format resolution, completion counts and failures. A started read
without completion or failure is still pending; disabled reads log their input
or editability checks when the IFC inspector opens.
Unsupported-format errors include the returned schema version and reference
format (not the reference contents), so a rejected version can be diagnosed
without copying network responses.
Object-graph reads show each pending page and received/total child-object count
in the inspector and console. A single GraphQL request (including its response
body) has a 20-second timeout, reported explicitly; no partial result is captured.
Large graphs may require many pages even when each request completes normally.

For IFC-class counts, add and wire:
**Speckle model → Load model properties → IFC filter → Count elements → Display value**.
Choose **Read model properties** once in the loader. Its **Model properties**
output can feed several IFC filters, for example one for `IfcWindow` and one
for `IfcSlab`. In each filter, choose the actual property path corresponding to
**Attributes > type** (not Element Type Attributes), enter the exact IFC class,
and choose **Apply IFC filter**. Filtering makes no Speckle request.
In each count block, choose
**Calculate count**, then **Save shared workspace**. Count stays disabled until
the IFC filter has captured a current collection; **Go to IFC filter** takes you
to the required read/capture steps. Errors appear in the inspector as well as
the workspace feedback.

Loaded property tables stay in memory in this browser session only. Refreshing
or changing the app account/workspace clears them, but saved IDs/counts and load
provenance remain. To apply a new filter after refresh, read once again in its
loader. A successful reread or changed model/version invalidates downstream
filters/counts; reapply the filters and recalculate. No raw property tables are
added to shared workspace storage or exports.
Existing combined **Capture: IFC elements** blocks remain usable with their
original direct model input and read/capture controls. They are not converted
automatically. To share one read, add the new loader and filters; their ID outputs
can connect to existing Count blocks after removing the old input wires.

Display value is a read-only text box on the canvas and in its details, with an
editable result label. It accepts one Count output and updates after calculation
without another trigger. Missing/stale data replaces the number with a warning;
a valid zero is displayed as `0`. The displayed value is derived from the saved
Count result rather than stored separately.

This browser-only reader supports both Speckle bundle versions (`schemaVersion: 3`,
`bundle.` reference) and object-graph versions (`schemaVersion: null` or `3`,
32-character content-hash reference). Schema version 3 alone does not imply a
bundle; the reference format determines which supported reader is used.
Bundles use three property tables without geometry; older versions read root JSON
metadata and paginated, projected child properties through the project API.
Both feed the same IFC filter and count unique retained application IDs (using
the instance GlobalId when an older object has no application ID).
Missing data/access is an error, not zero. Changing the source,
class, path or input wire invalidates downstream results. No Python runs and
nothing is published to Speckle. Connect, Check and Compare remain empty.
Category badges and block top accents use the supplied pastel scheme: blue
Capture, red Connect, green Check, purple Calculate/Compare and yellow Communicate.
The canvas remains white and block bodies light grey.

The registered local app uses `http://localhost:3000/speckle/callback`.
Restart Express after rebuilding. `SPECKLE_APP_ID` and `SPECKLE_REDIRECT_URL`
are optional overrides locally but required in production, and must match
the app registration. Use a separate production registration for `tools.boxbuild.dk`.
Grant only the read scopes needed for project/model/version metadata and model
artifact reads; a denied artifact read reports the access/scope issue explicitly.
The private model's raw classification path and data access still need live
validation against the registered app. The bundle reader limits each
property file to 32 MiB, objects/paths to 100,000 rows and values to 2,000,000 rows;
older reads use 250-child pages, at most 100,000 objects including the root, and
a 32 MiB root/child JSON budget. Larger models report an error rather than a
partial count. Detached property dictionaries in old graphs are currently
rejected explicitly rather than counted incompletely.
Saved element IDs/results inherit authenticated cross-team workspace visibility,
so use only models approved for sharing with the class.
No Speckle secret or personal access token belongs in configuration or blocks.

Shared saving requires the Supabase migrations and facilitator-created accounts.
Membership is self-service after sign-in. Until setup is complete, GitHub sources remain
publicly viewable, but shared loading/editing is unavailable.
