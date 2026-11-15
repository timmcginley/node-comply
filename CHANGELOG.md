# Changelog

Record meaningful changes, decisions and validation here, newest first.
[PROJECT_NOTES.md](PROJECT_NOTES.md) remains the current-state and continuation
guide. Entries distinguish implemented behaviour from future direction; they
do not imply a deployment or release.

## 2026-11-15

### Canvas downloads and combined course export

- Fixed the subject download helper's browser-document shadowing bug.
  Regression tests cover both current-canvas and recovery JSON downloads,
  filenames, MIME types and object-URL cleanup.
- Renamed the main subject action to **Download current canvas** and moved
  **Download browser draft** into collapsed **Browser draft backup** details.
  Added explanatory and recovery-prompt text; updated related setup guidance.
- Added **Download all canvases** above sign-in across tabs. A signed-in user
  can export all registered team saves and five subject saves in one JSON,
  retaining team metadata, revisions, records and archived XML. Unsaved browser
  recovery for the current account is separate; missing shared saves are
  explicitly null. Shared data and canvas selection are not changed.
- Reused the validated focus-recovery reader. Errors abort the combined export
  rather than produce a partial-success file. Tokens and other accounts' local
  storage are not exported.
- Documented limits: no atomic snapshot, history, other-device drafts,
  in-memory-only edits or combined import/restore. This does not replace a
  database backup. Single-team **Download workspace** retains its existing scope.
- Validation: 23 targeted export/recovery/storage/workshop-data tests and the
  production build passed. Existing bundle-size warning remains; no fresh full
  suite or browser automation for this slice. Local screenshot and user-supplied
  combined JSON subsequently confirmed access to the new export. The live
  bundle checked earlier contained the subject UI fix, not the combined button;
  its subsequent hosted deployment is unverified. No assistant commit, push,
  deployment or hosted migration was performed.

### Workshop guide and analysis-level collaboration

- Added [WORKSHOP_GUIDE.md](WORKSHOP_GUIDE.md), then refined it to focus this
  week's work on existing team analyses and next week's work on subject-level
  coordination. Subject blocks could reference whole team canvases; this is a
  proposal, not an implemented assignment/link mechanism.
- Shifted need, receiver review and use from individual function popularity to
  analysis-level information handoffs. Removed the earlier lesson gate requiring
  a recipient before code could be linked. No stars, scoring, duplicate matching
  or new request/review forms were implemented.
- Retained the sequence of agreeing purpose/output, implementing, running,
  sharing, reviewing and using results. A result can meet a need before actual
  use, and use can inform a design decision without being a code input.
- Inspected a supplied export: eight saved team workspaces, four saved subjects,
  and two separate team recovery drafts. Team plans were generally more concrete.
  IND-13 was explicitly assigned in Indoor / energy but had no shared team save;
  ARC-07/Architecture is a thematic match, not an existing linked pair.

### Proposed student template, provenance and teaching references

- Documented a proposed A4 subfolder layout adapted from Wilson et al. (2017):
  source, data, documentation and results, with README, dependencies,
  citation/licensing and a required human-readable changelog. Output definitions
  live in `doc/output-contract.md`. No runnable template was created.
- Proposed unique run folders, generated `run.json` provenance and a separate
  `published.json` selection per model version so test runs do not silently
  update consumers. Reviewed/used results retain exact run/output/commit
  references. Automatic execution, publishing and GitHub discovery are not built.
- Clarified that JSON datasets are not IfcOpenShell entities. Source-model
  access and GlobalId selections remain options where interrogation is needed;
  calculations can consume datasets without a compulsory model input.
- Separated ISO 19650's output-information exchange framing from software
  collaboration. "Ready for review" must not be conflated with ISO Published.
  Recorded journal references for research-software practice, FAIR4RS,
  reproducibility and PRIMM, including the 2025 teaching adaptation of
  Good enough practices rather than claiming it supersedes the 2017 paper.
- Updated project notes with current implemented/proposed boundaries, validation,
  export evidence and continuation priorities. These documentation changes
  required no additional executable checks.

## 2026-11-02

### Separate team and subject diagram tabs; suppress BPMN editing

- Moved the existing team-only planning canvas into **Team diagrams** and renamed
  the third tab **Subject diagrams**, with only five course-wide subject options.
  Design's claim action now targets Team diagrams; last subject is remembered
  across team visits. Navigation respects unsaved drafts and cancelled departure.
- Hid BPMN editors/upload/mapping controls and source-navigation buttons without
  deleting XML, mappings, archived records or legacy annotations. Team workspace
  saves/recovery/downloads still preserve the hidden data; no migration is needed.
- Kept a single mounted canvas editor and clipboard across tabs. Verified
  team-to-subject, subject-to-team and subject-to-subject Copy/Paste with internal
  wires, fresh identities, separate save destinations and unchanged permissions.
- Added four navigation/scope tests; 53 focused tests and production build passed.
  Synthetic built-app browser checks also covered hidden XML/evidence retention,
  cancelled departure, remembered subject, Design routing, other-team read-only
  access, save/reload, sign-out cleanup and 390px layout. Existing bundle-size
  warning remains. No commit, deployment or hosted SQL performed.

### Documentation reconciliation and deployment follow-up

- Confirmed the canvas editing additions are committed in `83cfed6`, following
  deployment preparation in `f677345`. Earlier no-commit statements describe
  their checkpoint times; neither commits nor this log prove a live deployment.
- Updated the project notes' current Toolbench description and continuation
  prompt for Information inputs, applied summaries, group/drag selection,
  keyboard deletion and cross-subject copying. Marked the original migration
  handoff as superseded and removed completed six-C styling from future scope.
- Recorded the user-corrected production Speckle App ID `7ec53d34f3` separately
  from local `bc5cdc2972`, with their respective HTTPS/localhost callbacks.
  Dashboard environment values and current deployment remain unverified.
- Recorded the reported Render `vite: not found` failure and Dashboard remedy:
  `npm ci --include=dev && npm run validate`, then clear cache/deploy. Explicit
  dev dependencies are needed for Vite when building in production mode.
- Distinguished the latest 49 focused tests/build/browser checks from the older
  106-test full-suite checkpoint. Documentation-only review; no tests/build,
  deployment or hosted SQL run.

### Drag selection and cross-subject clipboard guidance

- Added rectangle selection by dragging on empty canvas space. Overlapping
  blocks are selected in either drag direction at the current zoom/scroll.
  Shift/Ctrl/Cmd adds blocks; Escape/pointer cancellation preserves the previous
  selection. Selection is available read-only and does not change saved data.
- Made the existing cross-subject clipboard clearer with a persistent copied-
  block hint and explicit Copy -> Canvas subject -> Paste instructions. Internal
  wires, fresh identities, cleared execution results and access checks are retained.
- Added drag-geometry coverage; 49 focused tests and production build passed.
  Synthetic browser checks verified reverse/additive/partial-overlap selection,
  rectangle cleanup, Escape cancellation, zoom/scroll, read-only copying and
  cross-subject paste with internal wires and retained Information values.
  Existing bundle-size warning remains. No deployment or migration performed.

### Information inputs, applied values and canvas editing

- Made suggestion blocks light grey with dashed borders. Added a square-edged,
  folded-corner **Information input** under Suggestions, with saved value, units
  and reference fields. It can feed Capture suggestions but cannot replace an
  executable model/property source.
- Added applied model/version, IFC class/property path, Information value and
  current-count summaries on blocks. Zero remains visible; stale counts are
  explicitly marked not current. Summary rows participate in block geometry.
- Added multi-selection using Shift/Ctrl/Cmd-click or canvas Ctrl/Cmd+A, group
  dragging/arrow movement, toolbar Copy/Paste and Ctrl/Cmd+C/V. The tab-local
  clipboard works across canvases and copies internal wires and planning context,
  with fresh identities and no execution results or evidence. Newly copied
  assumptions are unapproved; cross-canvas copies detach BPMN source links.
  Invalid copied connections are rejected without partially changing the canvas.
- Delete/Backspace and toolbar Delete support blocks, groups and standalone wires
  while preserving archived records. Text editing retains native shortcuts;
  read-only access blocks mutations. Clipboard clears on refresh/account change.
- Added six editing-helper tests. All 48 focused canvas/data/storage tests and
  the production build passed. Synthetic browser checks covered Information
  styling/wiring, applied values and zero, multi-selection, group movement,
  internal-wire and cross-canvas paste, result clearing, keyboard deletion,
  text-field protection, saved reload, read-only mode and 390px layout.
  Existing bundle-size warning remains. No new SQL migration, commit, push or
  deployment was performed.

### Deployment preparation

- Added Node 24.x selection for Render and a `npm run validate` release gate
  (full tests then build); Render's build command now runs it after `npm ci`.
- Production requires an explicit Speckle App ID and valid HTTPS callback,
  rather than silently using the localhost registration. Missing settings
  return actionable JSON 503 errors and remain visible beside Connect Speckle.
  Local defaults are unchanged; no App Secret or PAT is added.
- Blueprint uses `NODE_ENV=production` and callback
  `https://tools.boxbuild.dk/speckle/callback`; the production App ID must be set
  in Render after registration. Unknown API routes now return JSON 404.
- Added production configuration and real Express HTTP smoke tests. Full
  validation: 106 Node/PostgreSQL tests and production build passed on Node 24.
  An isolated production-mode server served the built app, JS asset and OAuth
  callback, and browser fixtures verified visible setup errors without disabling
  Design. The existing large main-bundle warning remains.
- User confirmed the latest database migration was successfully applied.
  Public HTTPS health checks succeeded on the custom domain and Render hostname.
  These checks concern the existing deployment, not this new release.
- Updated the production registration, environment, backup/release order and
  acceptance checklist. No commit, push, deployment or hosted SQL was performed.

### Course-wide focus canvases, suggestions and self-service teams

- Added a Toolbench Canvas selector for Architecture, Indoor / energy,
  Structure, Materials and Build, shared across all teams. Existing team
  canvases, BPMN diagrams and archived records remain separate and unchanged.
- Course canvases use their own Supabase tables, immutable revisions,
  authenticated authorship, expected-revision saves and account/focus-scoped
  browser recovery. Conflicts retain drafts; reload requires an explicit
  recovery choice when different. Failed reloads retain a read-only download.
  Focus selection survives refresh/OAuth in the same tab; raw property tables
  remain transient.
- Added non-executable suggestion blocks in all six-C categories, with names,
  sockets, notes and responsible-team selection. Any editor can assign any
  registry team, leave a suggestion unassigned, or use Assign my team.
  Assignment is a planning declaration, not proof of implementation/acceptance.
- Pre-created Supabase accounts can now join/switch existing teams themselves.
  Switching replaces only their own memberships and grants the selected team's
  edit permission. Viewing another team does not join it. Public signup remains
  disabled; facilitator privileges remain administrator-managed.
- Added the additive `20261102_focus_canvases.sql` migration; it must be applied
  after the original migration. No hosted SQL, account provisioning or deployment
  has been performed by the assistant.
- Validation: 86 focused Node/PostgreSQL tests and production build passed.
  Isolated browser fixtures verified joining/switching, cross-team assignment,
  self-assignment, separate focus/team canvases, save/refresh, conflicts,
  explicit recovery, failed-load retention, visible membership errors with
  read-only fallback, sign-out cleanup and small-screen layout. Database checks
  include direct-write denial and the exact 10 MiB save boundary. Fixtures used
  synthetic accounts/data, not real credentials or hosted mutations.

### Shared property loader and IFC filters

- Split new workflows into one Load model properties block and several IFC
  filters. Windows/slabs can reuse the same in-memory tables; applying a filter
  makes no additional Speckle request. Existing Count/Display blocks are reused.
- Property tables are browser-session memory only, as requested. Save only load
  provenance and filtered IDs/results, not raw tables. Changed input or a new
  successful load invalidates downstream results through the load run ID.
- Existing combined IFC Capture v1 blocks and their saved results remain usable;
  no automatic conversion or changes to their direct model-input contract.
- Validation: 59 focused tests and production build passed. An isolated browser
  created the new blocks/wires and produced independent window/slab displays
  from one read (one version lookup and one property page). Changing a filter
  made no new requests. Verified zero, reread/version invalidation, cache reset,
  saved-result round-trip, read-only controls and the legacy combined block.
  Private-model acceptance of this new split flow remains to validate.

### Object-property read progress

- Show pending object-property pages and received/total child counts in the
  inspector and console instead of a static Reading model properties message.
- Report the existing 20-second GraphQL request/body timeout explicitly without
  capturing partial properties. Added blocked-page progress and request/body
  timeout tests. The private model's slow-read cause still needs live evidence.
- Validation: 55 focused tests and production build passed. An isolated browser
  using the real client and mocked responses showed pending page progress,
  completed the read and enabled selection of the returned IFC-class path.

### Schema 3 object-hash references

- Corrected a format-routing assumption exposed by the user's live diagnostics:
  schema version 3 can accompany an object-hash reference, not only a `bundle.`
  reference. These hashes now use the existing projected object-graph reader;
  bundle reads and rejection of unknown schema versions remain unchanged.
- Added a regression test for the exact rejected combination. Console diagnostics
  remain available for the next private-model read.

### Older model properties and category colours

- Fixed the reported Read model properties format rejection by supporting
  older pinned object graphs as well as bundles. Legacy reads use the project
  API's deprecated object/children fields, root metadata and projected property
  pages; the Parquet path is unchanged. Both feed the existing IFC filter/count.
- Preserve application IDs/instance GlobalIds. Missing identities, detached
  property dictionaries, inconsistent/partial pagination, oversized results and
  account changes fail explicitly rather than producing a partial or zero count.
- Sampled the supplied pastel category colours and applied them to palette
  headings, block badges and top accents: blue Capture, red Connect, green Check,
  purple Calculate/Compare, yellow Communicate. Retained white canvas/grey bodies.
- Validation: 51 focused data/client/Toolbench/storage tests, production build,
  live public GraphQL query validation and isolated browser fixtures passed.
  The old-format fixture captured/count/displayed two windows across pages,
  excluding a type record. Computed colours matched the supplied image.
  The live query correctly refused anonymous private-project access; the user's
  actual model read/count and hosted saving remain to validate after refresh.

## 2026-11-01

### Count prerequisites and Display value

- Added **Communicate > Display value**: a labelled read-only text box wired
  to Count, visible on the canvas and in details. It follows the current Count
  result automatically, including zero; missing/stale inputs show a warning
  rather than retaining an old number. Labels persist in existing node metadata.
- The reported Count screenshot had no current IFC collection. Count now stays
  disabled until Capture is ready, explains the required read/select/capture
  steps and provides **Go to IFC Capture**. Count/capture failures are shown in
  the inspector rather than only below the canvas. No implicit upstream run.
- Display accepts one solid Count wire. Shared provenance validation propagates
  source/configuration/wire changes and recapture to the text box. Read-only
  users can select/copy results without editing labels. No generic runner,
  separate trigger, extra result snapshot, Python execution or publishing.
- Validation: 45 focused element/Toolbench/storage/Speckle tests, production
  build and isolated browser native-control-event fixtures passed. Covered
  missing-input gating, capture/count/display, zero, stale results, source
  shortcuts, labels/export-import, read-only access and small-screen sizing.
  Actual local Express serves the new build; private reads/count remain to test.

### IFC-class Capture and Count

- Added **Capture > IFC elements** and **Calculate > Count elements**, retaining
  the white canvas/light-grey blocks and the existing Speckle model reference.
  Wire model -> IFC elements -> Count; run the explicit inspector actions.
- Viewer evidence establishes `Attributes > type = IfcWindow`, distinct from
  `Element Type Attributes > type = IfcWindowType`. The inspector reads and lists
  actual bundle paths instead of assuming the viewer label is a serialized path.
- Read only three property/identity Parquet tables from the pinned bundle version,
  without geometry or type-level merging. Older object graphs fail explicitly.
  Presigned download URLs are transient and never receive the Speckle token.
  Browser limits prevent oversized files/row counts becoming partial results.
- Match the exact IFC class, deduplicate application IDs and expose classification
  coverage. Missing classification/access is an error; no matches in available
  classification data is a genuine zero. Results/IDs/provenance save through the
  existing workspace payload; source/configuration/wire changes invalidate them.
  New function inputs reject mismatched or multiple providers. No Python, queue,
  polling, extra tab, generic runner or result publication.
- Validation: 65 Node/PostgreSQL tests, production build and isolated browser
  fixtures passed, including real synthetic Parquet decoding, window/type
  separation, duplicates, zero, access/account races, stale sources, read-only
  controls, complete export/import and legacy records. Existing main-bundle size
  warning remains; property decoding is lazy-loaded.
- Private artifact access/CORS, the live raw property path/window count and real
  hosted save/reload remain to validate with the user's OAuth connection.

### Minimal function-led Toolbench

- Added a visible **Delete selected** toolbar action for blocks/wires, reusing
  inspector deletion. Attached wires/owned handoffs are removed, while BPMNs
  and linked/archived records remain intact. Unconfigured Capture blocks point
  to the project URL option in their details.
  Follow-up validation: 21 focused data/Speckle tests and build passed; an
  isolated browser fixture verified toolbar deletion of legacy/Capture blocks,
  attached-wire cleanup, archive retention and read-only gating.
- Replaced the BPMN generation/source-add UI with a six-C function palette.
  Only **Capture > Speckle model** is implemented; other categories stay empty.
  Earlier patches, generic planning blocks, source links and archived records
  remain compatible, editable and exportable.
- White visual canvas and light-grey blocks; retain drag/keyboard movement,
  zoom/fit, proposed wiring, Design and Team diagrams.
- Added browser PKCE for registered Speckle app `bc5cdc2972`, using the localhost
  callback. Tokens are account-bound, tab-session-only and excluded from
  workspace payloads. No secret/PAT, refresh-token persistence or server runner.
- Capture reads paginated project models and model versions via GraphQL, pins
  one exact version and exposes one stable output socket. Existing shared
  saving/recovery/JSON export stores the reference; no SQL migration is needed.
- Added public `/api/speckle/config`, with optional app-ID/callback environment
  overrides. Production callback registration remains separate.
- At this initial checkpoint, no model-object loading, window extraction/count/display functions,
  result publishing, custom Python request queue/polling or additional tab.
- Public API GraphQL signatures and CORS checked. Real OAuth consent,
  granted-scope/private-data access and hosted reference saving remain to test.
- Validation: 53 Node/PostgreSQL tests and production build passed.
  Browser fixtures exercised callback/code cleanup, recovery across authorization,
  model/version pagination, explicit version pinning, wiring, shared save/reload,
  denied-read retention, read-only teams, disconnect and small-screen layout.
  Verified white canvas and light-grey block colours. Existing bundle-size
  warning remains. No private Speckle data or real credentials were used.

### Supabase setup progress

- User reached authenticated hosted workspace reads from the local app after
  account/table setup. Supplied facilitator/team membership instructions.
  This is not confirmation of hosted saves, full access-policy tests or deployment.

## 2026-10-26

### Email-code authentication and shared saving

- Added Supabase email-code sign-in for facilitator-created accounts, restored
  sessions and local sign-out. Selected public project settings are exposed
  through `/api/config`; SMTP/service-role secrets are never shipped.
- Added private team/facilitator membership, authenticated cross-team reads,
  own-team/facilitator writes, immutable revisions and authenticated authorship.
  Atomic save rejects stale revisions, including competing first saves.
- Persist both BPMN XML diagrams and all Toolbench/archived record collections
  together. UI reports shared saving only after confirmation; network/conflict
  errors retain drafts. All diagram/Toolbench mutation paths are gated read-only.
- Browser recovery is account/team scoped. Shared loading never silently applies
  it; different recovery requires an explicit choice before editing. Legacy
  metadata/XML keys are preserved unchanged.
- Full workspace JSON export/import now includes XML, while retaining old
  top-level collections and individual BPMN downloads. Legacy JSON imports
  preserve displayed diagrams. No ZIP format or administration/history UI added.
- Added PostgreSQL/PGlite migration tests and recovery/repository tests.
  Supabase SDK is pinned to 2.99.0 to preserve the existing Node >=20 floor;
  newer SDK releases require Node >=22.
- Added [database/email setup and pilot checklist](supabase/README.md).
  Hosted migration, account setup, actual email delivery, DNS/HTTPS, deployment
  persistence and institutional privacy approval remain pending.
- Validation: 42 Node/PostgreSQL tests, production build and whitespace checks
  passed. Browser fixtures covered code sign-in/session/sign-out, explicit legacy
  recovery, complete save/reload/import/export, active label commits, read-only
  controls, save conflicts/outages, malformed XML and failed-reload downloads.
  Existing large-bundle build warning remains; no hosted project was mutated.
- End-of-day handoff: the implementation is locally validated, not deployed by
  the assistant. Next session starts with applying the migration in Supabase,
  creating approved dummy users/memberships, then deploying and testing live.

### Deployment configuration

- Fixed the source of Render's `vite: Permission denied` build failure:
  generated `node_modules` and `dist` files were tracked, including a
  non-executable Windows-created Vite launcher. Removed these directories
  from Git tracking without deleting local files.
- Keep `package.json` and `package-lock.json` tracked; remove their ignore rules.
  Render now builds with `npm ci --include=dev && npm run build` to recreate
  dependencies from the lockfile, including Vite. Redeploy validation is pending.
- Updated `render.yaml` from `free` to `starter` to match the user's paid
  web-service compute upgrade. That compute change alone did not attach storage
  or implement authentication; the later Supabase implementation is recorded above.

### Added

- Configured overridable example project/input/results model IDs in the Python
  template, with comments instructing students to replace them. Exact input
  version and code revision remain required; publishing remains opt-in.
- Standalone [student Python template](student-template/speckle_tool.py) with
  [setup guide](student-template/README.md) and pinned
  `specklepy[bundle]==2026.9.1` dependency.
- Explicit input project/model/version selection, import-safe analysis function
  and local token authentication. Default execution receives and counts objects
  without publishing.
- Opt-in publication to a separate existing results model, bounded ingestion
  checks and result readback verification.
- Summary provenance: unique run ID, timestamp, function/version, declared Git
  commit and exact source identifiers. Object count is a connection smoke test,
  not an IFC element count or engineering assessment.
- Focused offline Python tests and ignore rules for virtual environments and
  Python bytecode.

### Earlier direction clarified (before authentication implementation)

- Discussed durable workspace revisions, conflict-safe shared saving, local
  recovery and complete ZIP export/import before adding more functionality.
  These were not implemented at that earlier checkpoint.
- Proposed Supabase Auth/PostgreSQL with email codes and private team membership,
  avoiding mandatory GitHub sign-in. Free-tier limits, custom SMTP, backups,
  privacy/region and access policy require confirmation before rollout.
- User signed up for Resend; sender domain verification and SMTP setup remain
  unconfirmed. Personal Resend login email is separate from the sender identity.
  Discussed optional custom email/app subdomains without changing existing
  Google Workspace mail delivery; no domain has been selected/configured.
- Speckle serves student Python information exchange; the web app stays in Node.
  App persistence/concurrent editing is a separate decision.
- Separate function definitions, execution records and published results.
  Expected outputs are not completed results; old results remain tied to their
  original inputs and requirements.
- Future Toolbench blocks may link an explicitly supplied GitHub file, revision
  and callable. No source-linking UI, Python execution or result reuse is added.
- Updated project notes and introduced this changelog.

### Earlier Speckle-template validation

- Ten Python tests passed, including defaults/overrides, real SDK bundle serialization/readback and
  mocked network orchestration. Syntax compilation and diff whitespace checks
  passed.
- Fixed Windows temporary-file cleanup when upload fails before the SDK finishes
  its bundle writers.
- User-reported live round trip succeeded in
  [ABD-26](https://app.speckle.systems/workspaces/abd-26):
  source model `bffe1068f7`, version `dd5308159e`, yielded 3,300 objects.
  Run `a985b446-cc51-404a-8ab3-33074420eeab` published and read back results
  model `83660f3739`, version `bc692b2221` (ingestion `94f63c0456`), in project
  `5616d1c8e8`. Code revision was `local-uncommitted`; a commit-pinned run is
  still needed for reproducible code provenance. An invalid token was replaced
  locally before success; no secrets are recorded here.
- Older object-graph source versions are outside this template's scope.
- That earlier Speckle-template step made no web application changes or deployment.

## Baseline consolidated 2026-10-25

This is a summary of the documented weekend state, not a reconstruction of
individual commit dates.

- Reduced the app to **Design**, **Team diagrams** and **Toolbench**.
- Design displays read-only GitHub A2 answers and can capture a claim snapshot
  into Toolbench.
- Team diagrams retain general/scoped BPMN editing and semantic mappings.
- Toolbench provides non-runnable visual blocks, sockets, information wires,
  BPMN process/data guides, linked plans and downstream planning warnings.
- Regeneration preserves annotations; retired forms are removed while their
  saved records remain compatible in local storage and exports.
- Agreed the six-Cs function vocabulary and caller-owned, import-safe Python
  direction; category UI and a reusable runner remain future work.
