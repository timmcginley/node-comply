# node-comply Project Notes

Last updated: 16 November 2026.

## Week 11 complete; Week 12 handoff (16 November)

- Week 11 is complete, as confirmed by the facilitator. The teaching focus was
  developing team analyses, identifying intended recipients, agreeing useful
  outputs and starting small callable functions. Completion of the session is
  not evidence that every team has working code or an accepted output.
- The student template is now maintained separately in
  [node-comply-template](https://github.com/timmcginley/node-comply-template).
  Changes were made and tested in its local checkout; the facilitator confirmed
  it was ready to replace the duplicate starter. Copy it into an existing repository
  as `A4`, rather than nesting a separate template under each analysis.
- The agreed layout keeps shared `runall.py` and `settings.py` at the A4 root.
  Each named analysis has its own source and results, for example
  `window_count/src/main.py` and
  `window_count/results/run-<UTC-time>-<unique-suffix>/result.json`.
  There is no enclosing `analyses` folder.
- Students set a local IFC path in `settings.py` and run `runall.py`.
  The shared runner opens the IFC once and calls explicitly registered
  `analyse(model)` functions. Functions return JSON-compatible data; the runner
  saves it. Keep the shared model unchanged. Importing an analysis does not
  load a model or write results.
- Results remain separate per analysis and previous runs are preserved.
  Execution fails explicitly on errors; earlier successful analysis outputs
  can remain after a later failure. The optional `--results-dir` override
  retains its separate `<output-root>/<analysis-name>/run-...` layout.
- Validation: all seven template tests passed with Python 3.14, including
  per-analysis default outputs, shared model identity, settings/CLI override,
  import safety, invalid output rejection and source/previous-run preservation.
- Removed the duplicate local starter; the separate template is the single
  maintained source. Preserved the old starter's one saved run in the template's
  `window_count/results` folder and verified its SHA256 was unchanged.
  Historical entries below describe the starter before removal.
- Updated [WORKSHOP_GUIDE.md](WORKSHOP_GUIDE.md) and the main README link to the
  separate template, including root-level settings/runner commands and
  per-analysis source/results paths. The original Speckle template is unchanged.
- Week 12: revisit subject canvases to coordinate team contributions; select
  an identified result, ask its receiver to review it, use it in the receiver's
  functions and record what it enabled. Retain the exact result/model/code
  references and record units, transformations and limitations.
- Obtain a fresh all-canvas export and review actual team notes and handoffs
  before extending the template. The inspected 15 November export remains
  historical evidence, not a record of the completed Week 11 session.
  Automatic discovery, app-side Python execution, run provenance metadata and
  publishing/review automation remain unimplemented.

This checkpoint supersedes earlier template-layout and "wait before building a
runner" guidance below. It does not imply a commit, push or deployment.

## Application rename (16 November)

- Application branding is now **node-comply** (formerly MasterBPMN): page title,
  header, npm package metadata, server health identity/messages, Speckle console
  messages, student producer name, download filenames and documentation.
- Preserve `masterbpmn:` browser-storage/session keys, the
  `masterbpmn-all-canvases` export discriminator and original BPMN namespace.
  Renaming these without migration would disrupt drafts, connections or consumers.
- The repository directory and existing Render resource/hostname remain as-is;
  renaming the application does not migrate deployment resources or Supabase
  email templates already configured in its dashboard.

These notes describe current behaviour, agreed direction and remaining decisions.
See [CHANGELOG.md](CHANGELOG.md) for dated changes and validation checkpoints.

## Earlier Week 11 starter and guide checkpoint (16 November)

- Student tasks are numbered 11.1-11.4, 12.1-12.4 and 13.1. The guide separates
  short student instructions from staff development notes. Task 12.3 concerns
  consuming results in the receiving team's functions, not redesigning the
  building. Week 11 includes local execution/testing; week 12 selects and shares
  an identified delivery for review and tool integration.
- Added the original local IFC starter (since replaced by the
  [separate template](https://github.com/timmcginley/node-comply-template)) following explicit approval
  to provide a minimal working option before reviewing new student notes.
  Copy it into an existing A4 capability folder. The original Speckle template
  is unchanged. No node-comply executable-code or discovery feature was added.
- `src/main.py` retains `analyse(model)` with the course window-count example.
  `src/runall.py` accepts a local IFC path and writes JSON to a unique run folder,
  preserving previous outputs and leaving the source IFC file unchanged.
  Failed execution or unsupported/non-finite JSON results report errors rather
  than successful substitute data. Earlier files are not a complete provenance
  record: model/code/settings references remain manual.
- Supplied instructions, pinned requirements, changelog, ignore rules and four
  focused tests. Tests passed with Python 3.14 / IfcOpenShell 0.9.0.post1, including
  real generated IFC input, repeat execution, source preservation, invalid IFC,
  unsupported output and import safety. Pylance file syntax checking could not
  resolve the newly added files; runtime tests successfully imported/executed
  them. No application changes or new JavaScript build were required.
- Richer run metadata, output contracts, shared-result selection and automatic
  discovery remain proposed. Extend around the small callable after inspecting
  the agreed handoffs rather than blocking students from starting.

## Earlier checkpoint: exports and workshop direction (15 November)

This section supersedes earlier next-step and repository-status assumptions
where they conflict. The student-facing activity is in
[WORKSHOP_GUIDE.md](WORKSHOP_GUIDE.md). Do not build the proposed runner or
full template until the input/output handoffs have been reviewed. The minimal
starter added on 16 November is the deliberate exception described above.

### Implemented downloads and verification

- Fixed subject canvas and recovery downloads: the download helper's
  `document` argument shadowed the browser document. Regression coverage checks
  filenames, JSON contents, MIME type and object-URL cleanup for both exports.
- **Download current canvas** exports the displayed subject data, including
  unsaved changes. **Download browser draft**, under a collapsed **Browser
  draft backup** section, exports the separately retained recovery payload.
  Neither saves to Supabase or directly downloads a different server revision.
  Moving blocks updates recovery, not shared storage; saves remain explicit.
- **Download workspace** remains a single-team export. Added **Download all
  canvases** above sign-in, visible on all tabs and enabled after sign-in.
  It reads all registered team workspaces and five subject canvases without
  switching canvases or writing shared data.
- The combined JSON uses `exportType: masterbpmn-all-canvases`, schema version 1,
  start/completion times, `teamCanvases`, `subjectCanvases` and separate
  `browserRecovery`. It retains team metadata, saved revisions, full records
  and archived XML; missing saves are explicitly `shared: null`.
  Recovery includes only this account's drafts in this browser, not tokens or
  other accounts' storage. Failed reads or invalid drafts stop the export.
- This is not an atomic database snapshot, revision-history export, full
  database backup or combined restore format. It excludes other devices' drafts
  and in-memory-only edits. The existing workspace importer cannot load it.
- Validation: 23 targeted export, focus-canvas, workspace-store and workshop-data
  tests passed, plus the production build. The existing bundle-size warning
  remains. No fresh full-suite or browser-automation run was performed for this
  slice. Subsequent workshop-documentation changes need no executable tests.
- A live bundle check during the session found the subject-download UI update
  but not the all-canvas export. A later local screenshot showed the new button,
  and the user successfully supplied a combined export. Current hosted deployment
  of the all-canvas button is not verified. No commit/push/deploy was performed
  by the assistant in this session; earlier commit IDs are historical checkpoints.

### Evidence from the supplied course export

- The inspected snapshot contained 21 registered teams and five subjects:
  eight team workspaces had shared saves (one had no blocks), and four subject
  canvases had shared saves. Structure had no shared save. Two team recovery
  drafts were separate; no subject recovery drafts were included.
- Team canvases were generally more specific than subject-level sketches.
  IND-10 had a clear room/window extraction -> association -> daylight analysis
  flow, but was not assigned in its subject canvas.
- Indoor / energy had seven suggestions explicitly assigned to IND-13, the only
  explicit subject-block team assignments in the snapshot. IND-13 had no shared
  team workspace there. Do not invent a linked team/subject example.
- ARC-07's fire-safety team analysis thematically matches Architecture's broad
  requirements, but is not explicitly linked or assigned there. Several subject
  blocks describe manual activities or decisions, not executable functions.

### Agreed teaching emphasis

- This week: develop existing team analyses. Next week: revisit subject
  canvases to coordinate those contributions. Students need not maintain
  duplicated matching diagrams.
- The main unit of collaboration is a team's analysis and its information
  handoff, not demand for every supporting function. Avoid unnecessary repeated
  analysis caused by silos; intentional independent checking remains valuable.
- A subject block could summarise a team's contribution and reference its whole
  team canvas. This is proposed, not implemented: team assignment currently
  records responsibility and does not create that reference.
- Need -> proposed output -> implementation/run -> receiver review -> actual
  use -> usefulness remains the teaching progression, at analysis-handoff level.
  Receiver review and actual use are different. Use may inform a design decision
  without becoming a Python input. Do not gate every code link on another team's
  request or introduce stars, points, duplicate matching or formal request forms.
- Capture recipient, decision, output scope/units and model identity using
  existing descriptions/output labels. After the first activity, students save
  explicitly and the facilitator exports again. Review the new handoffs before
  proposing the template; do not promise completion within the student break.

### Proposed template and result lifecycle: not implemented

- Extend the callable-function approach in
  [Working Together](https://github.com/timmcginley/41934/blob/main/Activities/workingTogether.md).
  Retain the Speckle route rather than replacing or expanding it unnecessarily.
  No new student-code runner or automatic repository discovery exists yet.
- Adapt the Wilson et al. project layout inside a named `A4` capability folder:
  `README.md`, required `CHANGELOG.md`, citation/licence information,
  `requirements.txt`, `data/`, `doc/output-contract.md`, `src/main.py`,
  proposed `src/runall.py` and `results/`. A template folder can be copied into
  an existing repo; GitHub's Use this template normally creates a new repo.
  Respect existing licences and model-sharing permissions. `requirements.txt`
  lists Python dependencies, not functional or hardware requirements.
- Students edit small callable functions; a proposed supplied runner handles
  execution records. A future block-folder URL could locate implementation and
  outputs by convention. This discovery and runner are not implemented.
- `run.json` describes an execution: unique run ID, source-model identity/version
  (ideally a local-file hash), code revision and dirty state, settings and named
  output paths. Save outputs under a new run folder; do not overwrite old runs.
  Retain shared files and use commit-specific references for reviewed/used data.
  A dirty-state flag alone cannot reconstruct uncommitted source.
- Separate test runs from selected shared results. Proposed `published.json`
  selects a run for each agreed model version. New connections discover the
  latest selected output, while reviews/use retain the exact run, output and
  commit reference. Updates must not silently replace previously used inputs.
  This filename/action is provisional: "ready for review" maps more closely to
  ISO 19650 Shared than its Published state.
- The required changelog explains meaningful implementation/output changes and
  receiver impact before updated delivery; routine test runs belong in run
  records. Enforcement is currently a workshop/peer-review rule, not automation.
- Do not force IFC entities through custom JSON and then expect IfcOpenShell
  methods to work. Real entities may be passed within one run; independent runs
  can reopen the same identified IFC and resolve selections by GlobalId.
  Calculations/checks may consume datasets instead. Model access is available
  where needed, not mandatory on every block. A reduced valid IFC requires
  preserving relevant dependencies and is not equivalent to a list of windows.

### Research framing and reference boundary

- ISO 19650 frames the exchange and suitability of analysis outputs, not code
  collaboration. Distinguish provider code review, output acceptance and formal
  project authorisation; the student exercise is not a compliance claim.
- [Wilson et al. (2017), Good enough practices in scientific computing](https://doi.org/10.1371/journal.pcbi.1005510)
  remains the project-layout and accessible-practices foundation. Our run
  metadata and publication-pointer conventions are additions, not its mandates.
- [Zielinski et al. (2025), Good Enough Practices in Scientific Computing: A Learning Module for Researchers](https://doi.org/10.21105/jose.00279)
  is a newer teaching adaptation with a
  [three-hour Carpentries-style lesson](https://github.com/carpentries-lab/good-enough-practices),
  not an established replacement edition of the original paper.
- [Wilson et al. (2014), Best Practices for Scientific Computing](https://doi.org/10.1371/journal.pbio.1001745)
  supports incremental development, tests and collaboration.
  [Barker et al. (2022), FAIR4RS](https://doi.org/10.1038/s41597-022-01710-x)
  supplies longer-term software discovery/reuse principles, not a folder recipe
  or quality guarantee.
- [Sandve et al. (2013), reproducible computational research](https://doi.org/10.1371/journal.pcbi.1003285)
  supports input/code/result provenance; reproducibility does not establish
  analytical correctness.
  [Sentance, Waite and Kallia (2019), PRIMM](https://doi.org/10.1080/08993408.2019.1608781)
  offers Predict, Run, Investigate, Modify, Make. Its use here is an adaptation
  from school programming education, not verified evidence for this course.

## Team and subject diagram tabs (2 November)

- Tabs are now **Design**, **Team diagrams**, and **Subject diagrams**.
  Team diagrams hosts the viewed team's existing planning canvas. Subject
  diagrams offers only Architecture, Indoor / energy, Structure, Materials and
  Build; there is no team option in its selector. Returning from the team tab
  remembers the last subject, per account. Design claims open the team canvas.
- BPMN modelers/upload/mapping UI and source-navigation buttons are hidden, not
  deleted. Existing XML, mappings, archived records and legacy canvas annotations
  remain in team saves/recovery/exports. No schema migration or data move occurs.
- A single mounted editor moves between tab hosts, retaining its tab-local
  clipboard. Copy/Paste works team -> subject, subject -> team, and subject ->
  subject, including internal wires. Existing fresh-ID/result-clearing rules,
  permissions, separate save targets and unsaved/recovery guards remain in force.
- Validation: 53 focused tests and production build passed, including four new
  scope/navigation tests. Synthetic built-app browser checks verified copying
  in both directions and across subjects, internal wires, separate saves,
  hidden XML/evidence retention, cancelled departure, remembered subject,
  Design claim routing, other-team read-only access, subject editing independent
  of viewed team, save/reload, sign-out cleanup and 390px page layout.
  Existing bundle-size warning remains. Changes are not committed/deployed.

## Repository and validation status (2 November)

- Latest committed implementation before the tab reorganisation: `83cfed6` (Information inputs, applied-value
  summaries, group editing, drag selection and cross-subject copying).
  Deployment preparation is in `f677345`. The worktree was clean before this
  documentation review; the earlier no-commit statements below describe their
  checkpoint times, not the current repository state.
- Before the tab reorganisation, 49 focused tests, production build and synthetic
  browser checks passed; the latest result is 53 focused tests above.
  The 106-test full-suite result below predates the
  editing additions; it is not a new full-suite result for `83cfed6`.
- A local commit does not establish a successful production deployment.
  Render's current environment, build command and deployment of `83cfed6`
  have not been verified by the assistant. No tests/build were rerun for this
  earlier documentation-only review; the subsequent tab changes were validated above.

## Drag selection and cross-subject copying (2 November)

- Drag a rectangle from empty canvas space to select overlapping blocks; drag
  direction, zoom and scroll are accounted for using actual block bounds.
  Shift/Ctrl/Cmd adds to existing selection. Escape/pointer cancellation removes
  the rectangle without changing the prior selection. Selection does not dirty
  the canvas; read-only users can select/copy but still cannot mutate records.
  Touch scrolling remains available on empty canvas space.
- Cross-subject copying uses the existing tab-local clipboard: Copy selected,
  choose another subject with Canvas, then click Paste (or focus the canvas and
  Ctrl/Cmd+V). A persistent copied-block hint survives canvas switches. Internal
  wires are included automatically; the existing fresh-ID/result-clearing and
  permission rules remain unchanged.
- Validation: 49 focused tests and production build passed. Synthetic browser
  checks covered rectangle cleanup, reverse/additive/partial-overlap selection,
  Escape cancellation, zoom/scroll, read-only selection/copy, protected mutations
  and cross-subject paste with internal wires, fresh IDs and retained values.
  Existing bundle-size warning remains. No deployment or migration performed.

## Toolbench information and editing checkpoint (2 November)

- Suggestions are light grey with dashed borders. **+ Information input** adds
  a square-edged, folded-corner document with a saved value, optional units and
  reference. Its output can feed a Capture suggestion; it remains planning-only,
  not an executable input to the Speckle/property pipeline.
- Blocks show applied model/version, IFC class/property path, Information value
  and current count. Zero is shown as zero; stale counts are explicitly not
  current. Inspector drafts do not replace applied summaries before saving.
- Shift/Ctrl/Cmd-click toggles items in a multi-selection; canvas-focused
  Ctrl/Cmd+A selects all. Dragging or arrow keys move selected blocks together;
  Shift+arrow moves farther. Escape/cancel restores an unfinished drag.
- Ctrl/Cmd+C/V and toolbar Copy/Paste use a tab-local clipboard across canvases.
  Internal wires, relative layout, notes, ownership and configuration are kept;
  node/port/wire/handoff identities are fresh and execution results are cleared.
  Linked planning records are reused when already present or copied with remapped
  links; evidence and new assumption approvals are not transferred. Cross-canvas
  copies detach BPMN source links. Refresh/account change clears the clipboard.
- Delete/Backspace or toolbar Delete removes selected items and attached wires,
  not archived records. Text fields retain native shortcuts; read-only canvases
  allow selection/copy but not movement, paste or deletion. Save the destination
  canvas to share edits. No database migration is needed for these JSON fields.
- Validation: 48 focused tests and production build passed. Synthetic browser
  checks covered styling, planning wires, applied values/zero, multi-selection,
  group movement, cross-canvas copy/paste, cleared results, keyboard deletion,
  text-field guards, saved reload, read-only access and 390px page layout.
  Existing bundle-size warning remains. No commit, push or deployment performed.

## Deployment configuration and verification (2 November)

- Target origin: `https://tools.boxbuild.dk`. The user confirmed the latest
  focus-canvas migration was successfully applied and the workflow works.
- Separate local and production Speckle registrations are intentional. The user
  supplied local App ID `bc5cdc2972` with callback
  `http://localhost:3000/speckle/callback`, and corrected the production App ID to
  `7ec53d34f3` with callback `https://tools.boxbuild.dk/speckle/callback`.
  Set production `SPECKLE_APP_ID` and `SPECKLE_REDIRECT_URL` in Render to these
  production values; the assistant has not verified the Dashboard settings.
  No app secret/PAT is needed.
- The Render Blueprint selects Node 24.x via `.node-version` and uses build
  command `npm ci --include=dev && npm run validate`, start command `npm start`,
  and `NODE_ENV=production`. The user reported a Dashboard build failure with
  `npm install; npm run build` and `vite: not found`: production installation
  omitted Vite's dev dependency. Set the exact Blueprint build command in the
  Dashboard too, then use **Clear build cache & deploy**. Manual Dashboard
  settings do not necessarily synchronise with the Blueprint.
  Production config never silently falls back to localhost; setup errors remain
  visible in the Speckle toolbar while other features stay usable.
- Deployment-preparation validation: 106 Node/PostgreSQL tests and production build passed on local
  Node 24.19.0. Existing bundle-size warning remains. HTTPS health checks on
  both the custom domain and Render hostname returned 200 for the existing site.
  An isolated production-mode server served the built app, JS asset and OAuth
  callback successfully; browser fixtures confirmed missing production settings
  stay visible on course canvases without blocking Design.
- The preparation and subsequent canvas changes are now committed (see repository
  status above); the assistant performed no deployment or hosted SQL.
  Before another push (auto-deploy is enabled in the Blueprint), verify Render's
  production environment and build settings. Follow the [release checklist](supabase/README.md#4-deploy-or-run-locally),
  including backups, email codes, real save/reload/conflicts and OAuth on production.

## Earlier course-canvas and self-service checkpoint (2 November)

- At this checkpoint, Toolbench provided a Canvas selector: the viewed team's canvas plus
  five **course-wide**, cross-team canvases for Architecture, Indoor / energy,
  Structure, Materials and Build. These are not five private canvases per team.
  Existing team canvases/diagrams are preserved; nothing is moved automatically.
- Any signed-in member of a team (or facilitator) may edit any course canvas.
  Each focus has separate Supabase storage/history, explicit saves, conflict
  detection, account-scoped recovery and a JSON download. Course saves/exports
  do not replace or include team BPMN workspaces. This is not live multi-editing.
- Suggestions are non-executable blocks with one of the six-C categories,
  editable name/sockets/notes, and an optional responsible team. Any editor can
  assign any registry team, or use **Assign my team**. Assignment is declared
  responsibility, not a verified capability or accepted contract.
- **My team > Join / switch team** replaces the signed-in caller's memberships
  with the chosen existing team, freely. **View team** remains browsing only.
  Joining grants editing in that team's workspace; switching removes former
  memberships. Facilitator status cannot be self-assigned.
- Accounts/emails must still be created in Supabase; public signup is unchanged.
  Manual student membership SQL is no longer needed. Removing a membership
  cannot permanently revoke access because the account can rejoin; manage
  account/session access through Supabase if necessary.
- The user has now confirmed the additive [focus-canvas migration](supabase/migrations/20261102_focus_canvases.sql)
  was applied after the original migration. No assistant-hosted migration or deployment was performed.
  Validation: 86 focused Node/PostgreSQL tests, production build and isolated
  synthetic browser fixtures passed, including switching/assignment, separate
  canvases, save/reload/conflict/recovery, sign-out and small-screen behaviour.
  Next: use approved dummy accounts to test self-joining/switching and shared
  course saves/reloads/conflicts across accounts, then deploy after acceptance.
  The private-model loader validation below remains a separate pending check.

## Earlier element-flow checkpoint: 2 November

- Implemented: one model-property loader feeding several independent IFC filters,
  then Count and Display blocks. Existing combined IFC Capture blocks remain usable.
- Raw properties stay in browser-session memory only; saved results/provenance
  remain in the workspace. After refresh, read once again before applying filters.
- Earlier validation: 59 focused tests, production build and isolated full-canvas
  browser fixtures passed. This was not a new full-suite or hosted deployment check.
- Pending element-flow check: validate the new shared-loader window/slab flow on the private
  model, then real shared save/reload. Do not expand into queues or Python execution.
- Implementation and existing documentation were recorded in commit `5ee9985`
  before this final handoff update. No assistant commit or deployment was performed.

## Product intent

node-comply helps students plan their tools and see the connections between
them. Start with the claims and issues students have already selected in
[A2], not a replacement set of teacher-invented checks.

The [Advanced Building Design project requirements][ABD] provide context for
those claims. They are not a compulsory checklist that replaces students'
motivations. A useful organising question is:

> What evidence do you need to test your chosen claim, and which other
> students' work could help?

The registry includes ARC, IND, STR, MAT and BLD. Disciplines indicate expertise
and responsibility, not boundaries on which tools can connect.

The professional/general BPMN explains intent; the scoped BPMN explains tool
implementation. The visual Toolbench helps students plan information exchanges and explicitly
capture/count IFC-classified elements in a browser. There is no arbitrary-function
runner, student Python execution or automatic BPMN-to-code translation.

## Current application: three tabs

### Design

- Initial tab with read-only GitHub-backed A2a-A2g answers.
- Locates a team's source Markdown and links to the README on its default branch.
- Refreshes answers from GitHub without making them editable in the app.
- **Plan this claim in Team diagrams** captures the A2b excerpt and source URL as a
  draft claim record and adds a claim block to the canvas.
- Repeating the action for the same team, source URL and excerpt reuses the
  existing record/block. A changed excerpt creates a new source snapshot.
- Canvas names and notes can change without rewriting the captured source claim.

### Team diagrams

- The viewed team's existing planning canvas, editable only by its signed-in
  members or facilitators. View team browses other canvases without joining.
- Save shared workspace, recovery/import and full workspace download remain
  team-scoped. Hidden BPMN XML and mappings are retained alongside canvas data.
- The previous side-by-side BPMN editors, uploads and semantic mapping controls
  are suppressed. This does not delete or migrate any submitted or saved data.

### Subject diagrams and the shared canvas editor

Subject diagrams offers only the five course-wide subject canvases; team
canvases are accessed through Team diagrams. Save course canvas and its
recovery/download controls stay subject-scoped. Team save/context controls are
hidden in this tab. The same editor instance and clipboard serve both tabs.

A Node-RED/PD-inspired visual planning surface built with browser HTML/SVG.
It is not an embedded Node-RED runtime. Keep the canvas primary and details
available on selection rather than returning to long, always-visible forms.

1. The six-C function palette contains **Capture > Speckle model**,
   **Capture > Load model properties**, **Capture > IFC filter**, **Calculate > Count elements** and
   **Communicate > Display value**.
   Other categories deliberately have no executable functions; suggestions may use
   any of the six categories.
   The visual canvas is white and blocks are light grey.
   Category badges and top accents match the supplied pastel reference:
   Capture blue, Connect red, Check green, Calculate/Compare purple, Communicate yellow.
2. **Connect Speckle** authorizes the registered app using browser PKCE.
   Select a project URL, model and exact version in the Capture inspector;
   model/version lists are paginated. **Use selected version** updates the
   draft block's single output reference, then save the team workspace or course
   canvas to commit it. This reference block itself does not download model objects.
3. Drag on empty canvas space to select overlapping blocks; Shift/Ctrl/Cmd adds
   to the selection, and Escape cancels. Shift/Ctrl/Cmd-click toggles individual
   blocks/wires; canvas-focused Ctrl/Cmd+A selects all. Drag headings or use
   arrow keys to move selected blocks together; Shift+arrow moves farther.
   Zoom, scroll and **Fit patch** support larger canvases. Selection/copy is
   available read-only, but movement and other mutations require edit access.
4. Capture outputs retain their socket identity when the selected version
   changes. Earlier planning blocks retain their name, responsible team,
   claim link, notes and editable sockets.
5. Drag an output to an input, or click the two sockets in order, to create
   an information handoff. Load model properties accepts one model-reference input;
   its output fans out to IFC filters, each with one property-table input.
   Count accepts one IFC-element collection; Display accepts one Count output.
   Legacy sketch compatibility is
   still unverified. Select a wire to name the information and
   optionally note format, units, model revision or acceptance conditions.
6. An open input is a gap. Name it, save its consuming block's claim link and
   choose **Request** to create a linked draft capability request.
7. Existing claims, requests, provider declarations and assumptions can be
   added from the tray. Requests can select previously declared providers;
   selection does not establish implementation, testing or acceptance.
8. New provisional-input blocks are unapproved sketches. Notes can describe
   their provenance, but the canvas does not approve assumptions or formally
   accept contracts.
9. Wire **Speckle model -> Load model properties -> IFC filter -> Count elements -> Display value**.
   **Read model properties** once in the loader, then share its output across
   filters such as `IfcWindow` and `IfcSlab`. In each filter, select the actual
   instance-class property path, enter the exact class, then **Apply IFC filter**.
   Applying filters makes no Speckle requests. Property tables are session-memory
   only; after refresh read once again before applying filters. Saved results
   remain, but a successful reread invalidates prior branches until reapplied.
   Existing combined IFC Capture blocks remain usable without conversion.
   In Count, **Calculate count**. Count is disabled until its input is captured;
   **Go to IFC filter** shows the prerequisite steps. Display is a read-only
   text box that updates from the successful count without another trigger,
   including a valid zero. Stale/missing results show a warning instead.
   Results appear on blocks/inspectors; save the
   shared workspace to retain IDs, count and pinned model/version provenance.
   Source/class/path/wire changes invalidate downstream results. Wiring does
   not automatically execute functions.

Suggestions use a lighter grey fill and dashed borders. **+ Information input**
under Suggestions adds a square-edged document block with value, optional units
and reference. Its output can feed a Capture suggestion, not an executable
model/property loader. Applied model/version, IFC class/property path, saved
Information values and current counts are visible on blocks; unsaved inspector
edits do not replace applied values, and stale counts are marked not current.

Copy selected blocks with the toolbar or canvas-focused Ctrl/Cmd+C, choose
another subject in **Canvas**, then click **Paste** (or focus the canvas and
Ctrl/Cmd+V). The copied-block hint survives canvas switches in the same tab.
Copies include internal wires and linked planning context, with fresh identities
and no execution results/evidence or newly transferred assumption approvals.
Cross-canvas copies detach BPMN source links. Refresh/account change clears the
clipboard; save the destination canvas to share pasted changes.

Wire meanings:

- **Solid:** user-declared information handoff. Known IFC/Count/Display inputs check the
  producing function; legacy sketch compatibility is not verified.
- **Dashed grey:** BPMN process order, including available branch/default
  labels. These guides never satisfy an information input.
- **Dotted blue:** explicit BPMN data association, a candidate handoff. A
  student can deliberately promote it to a proposed information handoff.

No ports or contracts are inferred from free-text activity labels. An unnamed
socket remains a question for the student. Gateways, execution conditions and
human reviews must not be flattened into ordinary data connections.

Open requests, draft contracts, missing inputs/sockets/sources, multiple input
sources, cycles and provisional/unapproved assumptions are flagged. Relevant
warnings propagate downstream along information wires; this is planning
feedback, not a calculation or compliance judgement.

Canvas edits do not modify BPMN XML. **Generate from BPMN** and the BPMN
source-add tray are retired: functions are chosen independently of process
diagrams. Existing generated blocks/wires and source links are retained;
source links remain as provenance, but their BPMN navigation controls are hidden.
Earlier generic/linked planning blocks are grouped under **Earlier planning
blocks**, not presented as executable six-C functions.

Removing a canvas block removes its patch wires and their Toolbench-owned
handoffs, not linked claim/request/assumption records or unrelated legacy data.
Select a block or wire and use the visible **Delete selected** toolbar button,
canvas-focused Delete/Backspace, or the existing inspector remove action.
Groups can be deleted together; text fields keep native editing shortcuts.
Deletion is an unsaved draft change
until **Save shared workspace** for a team patch, or **Save course canvas** for a
course focus. Capture's project URL is an inspector option,
not a separate input block: select its heading, enter the URL, **Load models**,
select model/version, and **Use selected version**. There is no whole-patch Run
button; IFC Capture and Count have explicit inspector execution actions.

## Retired functionality

**Connections, Assembly and Checker have been removed**, including their
form-based editing interfaces; they are not hidden in another panel.
The older activity/reference/handoff forms, ISO 19650 help interface,
nomination action and manual evidence/approval editors are retired.

Their saved records remain in browser storage and workspace JSON exports.
Some linked plans are inspectable in Toolbench. Do not delete old data merely
because its editor has gone, or describe these retired interfaces as available.
The deleted UI modules are not part of the current application.

The older ARC-only master-builder roadmap and five/six-tab proposals are
superseded. Do not restart them automatically. The direction is a simple
cross-disciplinary visual workspace, not discipline-specific execution silos.

## Agreed function vocabulary: the six Cs

Use **Capture, Connect, Calculate, Check, Compare and Communicate** to classify
functions by what they do to information, not by discipline.

The palette uses these six categories. Implemented version-1 functions are
`speckle.capture-model`, `speckle.read-properties`, `ifc.filter-elements`,
`elements.count` and `communicate.display-value`; existing `ifc.capture-elements`
blocks retain their combined read/filter behaviour. Loading, filtering and counting run explicitly in the
browser; Display follows the current saved Count result. There is no generic runner.
Current structural/legacy block kinds
such as activity, data, request, provider, assumption and claim remain separate
from function categories.

| Category | Guiding question | Examples from student interests |
| --- | --- | --- |
| **Capture** | What information do we have? | Room areas and uses; column dimensions; wall layers; window quantities; reference-table values. |
| **Connect** | How does this information relate? | Windows to rooms; walls to adjacent spaces; new columns to existing supports; materials to reference factors. |
| **Calculate** | What can we derive? | Required airflow, corrected glazing area, column resistance, embodied carbon, cost. |
| **Check** | Does the evidence satisfy a criterion? | Supplied versus required airflow; door width; daylight criterion; facade materials versus stated intent. |
| **Compare** | What changes between alternatives? | Model revisions, window scenarios, wall options, column retention versus replacement. |
| **Communicate** | How do we make findings useful? | Tables, model highlights, charts and reports showing results, gaps and assumptions. |

These are not compulsory stages or a fixed sequence. A workflow can branch,
reuse outputs or contain several functions of one category. A small student
tool can initially combine stages and later expose useful smaller functions.

**Connect functions** discover relationships in the information; **Toolbench
wires** pass information between functions. Do not confuse the two.

Sources (IFCs, CSVs, reference tables), human decisions/reviews and target
claims are distinct block roles, not extra function categories. Loading a
local model belongs to the source/runner boundary, not every analysis function.

Student scope distinctions matter:

- IND-13 proposes identifying required acoustic insulation from room context,
  not calculating or verifying actual wall performance.
- STR-20/STR-22 investigate geometric load paths/alignment, not proof of
  structural capacity.
- IND-16's ventilation check does not verify the original thermal-comfort claim.
- Student Markdown and BPMNs describe intentions, not verified tool availability.

## Simpler callable-tool direction

The old [analyst template][analyst] and [manager template][manager] demonstrate
the useful boundary: reusable analysis receives caller-supplied inputs, while
a local development entry point selects and loads the example model.

Source inspection confirmed:

- Analyst `rules/windowRule.py` exposes `checkRule(model)`.
- Analyst `rules/doorRule.py` exposes `count_doors(model)` and a separate report
  function. These rule functions do not open the student's example IFC.
- Analyst `main.py` loads an example IFC at module level and has no main guard.
  Import the reusable rule modules, not that entry script.
- Manager `main_dev.py` uses `if __name__ == "__main__":` for local execution.
- The manager interface accepts `model_path`, `out_dir` and options, then
  supplies the loaded model to analyst functions. The template includes
  illustrative code and is not evidence of a successful runnable integration.

Keep the principle, not the full manager hierarchy or reporting scaffolding.
The proposed simple student contract is:

1. Expose a clearly named callable function.
2. Accept inputs from the caller. Do not load a hard-coded example model inside
   reusable analysis or as an import-time side effect.
3. Return useful structured data rather than only printing a report.
4. Put local example loading, calls and printing under a main guard. Running
   the script executes the example; importing the function does not.
5. Leave the supplied model unchanged by default; explicitly declare tools
   that modify it and arrange copies/isolation where required.

A caller can then load its own IFC once and pass it to several tools without
also loading the students' example models. Other functions may accept tables,
quantities or earlier results rather than IFC objects.

Toolbench sockets should eventually describe these accepted inputs and
returned outputs. Local examples and a future runner would supply the same
function inputs.

### Student Speckle connection template (26 October 2026)

A standalone [Python example](student-template/speckle_tool.py) and
[setup guide](student-template/README.md) now demonstrate receiving an explicit
Speckle model version, counting objects, and optionally publishing a summary to
a separate existing results model in the same project. The target workspace is
[ABD-26](https://app.speckle.systems/workspaces/abd-26). The commented, overridable
example defaults are project `5616d1c8e8`, input model `bffe1068f7` and results
model `83660f3739`. Students should replace these for their own work; an exact
input version ID and code revision must still be supplied.

The example uses pinned `specklepy[bundle]==2026.9.1` and the 2026.9 bundle APIs,
not the older object-graph format. Tokens stay in the user's local environment.
It is import-safe, read-only unless `--publish` is supplied, and separates the
caller-owned model from the reusable calculation. Results identify their run,
input version, function version and caller-declared Git code revision.
Publication status and result readback are checked; an object count is a
connection smoke test, not an IFC element count or design judgement.

Offline SDK round-trip and orchestration tests exist. On 26 October the user
reported a successful live receive/count/publish/readback: input version
`dd5308159e` contained 3,300 Speckle objects; output version `bc692b2221` was
published to results model `83660f3739` through ingestion `94f63c0456`.
Run ID: `a985b446-cc51-404a-8ab3-33074420eeab`. Code revision was
`local-uncommitted`, so this does not establish reproducible code provenance.
An initial invalid token was replaced locally; no credentials belong in these
notes. No student Python runs in the Node server. No Toolbench execution,
GitHub-file linking/loading UI or automatic adapter/runner has been added.
The intended later step is an explicit student-supplied GitHub file link in
Toolbench, with revision/function identity; fetching code is not permission to
execute it.

### Speckle's role and result provenance

Speckle is proposed as the shared, versioned information layer used by students'
Python, not as the application's live canvas database. node-comply remains
Node/Express/Vite. The academic workspace does not by itself implement shared
Toolbench persistence or simultaneous editing; those still need separate scope.

The six Cs classify information transformations, not storage technologies.
Capture may extract IFC information or receive Speckle data; Connect discovers
relationships; Calculate runs Python analysis; Check applies versioned
requirements (potentially sourced from GitHub); Compare evaluates model versions,
options or results; Communicate makes findings useful and may publish to Speckle.
Any category can read or publish shared information.

IFC is a useful initial course input, not a technical restriction on all Speckle
datasets. A received Speckle model is not an IfcOpenShell model. Preserve existing
IFC-based student tools and use explicit adapters rather than assuming compatible
objects or automatically rewriting their input contracts.

Keep three identities separate:

1. **Function definition:** stable function ID, GitHub file/callable and exact code
   revision, purpose/category, input/output contract and requirement references.
   It can exist before code or results are available.
2. **Run:** unique execution ID linked to the function/code revision, exact input
   model versions, configuration, requirements/reference-data revisions,
   assumptions, status/diagnostics and output references.
3. **Result:** published evidence linked to its run and source model/elements,
   with values/units, assessment and limitations.

An unexecuted output socket describes an expected result, not an empty successful
result. A previous result remains historical evidence for its original inputs;
it is not automatically applicable to a changed model or requirement.
Keep availability, execution status, applicability and design assessment separate.
GitHub prose must be translated into an agreed testable rule before it becomes
an executable check.

A future runner could offer explicit result reuse when function revision, input
versions, configuration, requirements and reference data match. Environment,
external-data freshness and determinism may also matter. Do not silently reuse
the latest output by function name alone. These are planning principles: the
current template implements only a small provenance-bearing smoke test, not a
run registry, reuse engine or verification of declared code revisions.

## Capability and evidence principles

- A **request** describes needed information/behaviour; an **offer** declares
  a potential versioned provider; an **agreement** requires reviewed contracts
  and evidence. The canvas does not implement the full agreement lifecycle.
- An unmatched request is a development opportunity, not fabricated output.
- Contracts need scope, model/element identifiers, formats, units, missing-data
  behaviour and an example input with an expected result.
- Shared room, element, material and relationship data are reuse opportunities,
  but matching labels do not prove compatible methods or models.
- Never silently invent values. Provisional substitutions need explicit
  permission, source, units, scope, limitations, acceptance and replacement
  evidence. Some safety-critical inputs should not permit substitution.
- Assumptions remain provisional downstream, even after a provider is selected.
  Replace them deliberately and rerun affected analyses when execution exists.
- Keep execution status, interface/behaviour/integration tests, human intention
  review and design assessment distinct. Successful code is not a design pass.
- Historical evidence and assumption context must not be silently rewritten
  when providers, models or plans change.
- Do not import arbitrary student Python into the public Node/Express server.
  Execution isolation, permissions and resource limits need separate design.

## Storage and compatibility

Shared workspaces now store both BPMN XML diagrams and all record collections
in Supabase, with immutable revisions, authenticated authorship, timestamps and
schema version 1. The SQL must be provisioned before shared saving can run.
Browser recovery uses `masterbpmn:<teamId>:recovery:<userId>`, including both
diagrams and the base revision. The earlier `masterbpmn:<teamId>` metadata and
separate `:general:xml` / `:scoped:xml` drafts are preserved unchanged and offered
only through explicit recovery.

Preserved collections:

- `toolbenchNodes`, `toolbenchWires`: visual patch and source links.
- `claims`, `requests`, `offers`, `assumptions`, `evidence`: claim/planning data
  and retained historical evidence.
- `mappings`, `nominations`, `dependencies`, `activities`, `references`: existing
  diagram mappings, handoffs and records from retired interfaces.

Missing/non-array legacy collections normalise to empty arrays. Current-schema
imports and shared payloads require every collection. Existing dependency
type values and free-text source/target records remain compatible.
Toolbench wires create/update their own proposed handoffs in `dependencies`,
identified by `toolbenchWireId`; unrelated handoffs remain untouched.

**Download workspace** exports a complete schema-versioned JSON, including both
BPMN XML diagrams, records and public team details. Earlier top-level collections
remain for export compatibility. Individual BPMN downloads remain available.
**Import workspace** restores a matching-team JSON as an unsaved draft; old
exports without XML keep the displayed diagrams. There is no ZIP format.
Canvas/model compatibility is not established by a successful export.

### Email authentication and shared persistence (26 October)

The user authorized implementation after selecting Supabase, Resend,
`tools.boxbuild.dk` and initially Dashboard-managed membership (superseded by
self-service joining/switching on 2 November). The application code and
database migration are implemented; hosted SQL application, actual email delivery
and deployment verification are still pending. Follow the
[setup and pilot checklist](supabase/README.md).

- Render compute has been upgraded to Starter and `render.yaml` matches.
  Ordinary service files remain ephemeral; the upgrade does not attach a disk.
- Supabase Auth and PostgreSQL are selected; node-comply remains on Render.
  Only the public project URL/publishable key is shipped. No service-role key
  or database/SMTP secret is needed by the app.
- Save general/scoped BPMN XML and Toolbench/legacy records together as a
  consistent workspace revision, with author, timestamp and schema version.
  Atomic save checks reject conflicting creates/updates and retain browser
  drafts; the UI does not claim a shared save until the RPC confirms it.
  This is not simultaneous live editing.
- Shared loading never silently applies browser recovery. A different recovery
  draft requires an explicit choice before editing can replace it.
- All authenticated accounts may read all teams; members edit only their own
  teams and facilitators edit all. Database grants/RLS and the checked save RPC
  enforce access, not the selected team or client-supplied ownership.
  Anonymous users see public submitted GitHub sources only.
- Diagram commands/undo/redo, uploads, mappings, claim capture and every
  Toolbench mutation are gated. Read-only selection, fit, zoom and downloads work.
- Load/save/import transitions are serialized, edits retain browser recovery,
  and leaving unsaved shared edits prompts a warning. A conflict requires
  loading/reviewing the latest version before a deliberate replacement save.
- A missing submitted diagram is stored as explicit null, not a fabricated
  successfully loaded blank diagram. Malformed saved/imported XML prevents
  applying that payload.

The app uses university email one-time codes, session restoration and sign-out,
not GitHub login. Code requests do not create accounts. Disable public signups
in Supabase and create users via Dashboard. Students now choose their own team;
only facilitator status still requires trusted SQL. Never put rosters, tokens or
SMTP credentials in the public registry, GitHub source or workspace downloads.

On 1 November, the user successfully reached the authenticated "No shared
workspace yet" response after working through account/table setup. That confirms
the local app could read the hosted workspace table; it does not confirm a
successful hosted save, all role policies or redeploy persistence. Facilitator/
membership assignment instructions were supplied, but live role validation
remains unverified.

### Initial Speckle connection and Capture pilot (1 November)

- User registered app `bc5cdc2972` with a local callback at
  `http://localhost:3000/speckle/callback`, selecting read access for the
  granular Project Core and Model scopes. Do not assume legacy `streams:read`
  labels match the current registration UI.
- Public config is served by `/api/speckle/config`; optional
  `SPECKLE_APP_ID` and `SPECKLE_REDIRECT_URL` overrides must match the actual
  registered application. Production needs its own matching callback setup.
- Speckle authorization is separate from Supabase membership. Being logged
  into Speckle in another tab may simplify consent but does not authorize this app.
- Browser PKCE binds the authorization request to the current app user,
  application/origin and a ten-minute request window. Callback codes are removed
  from the URL immediately. No App Secret or PAT is used.
- Access tokens are held only in this tab's sessionStorage, bound to the app user.
  Refresh tokens are discarded; expired/revoked access requires reconnecting.
  Disconnect and app-account changes remove the connection, not saved references.
  Session storage is still sensitive: use a private browser profile.
- Capture stores only project/model/version IDs, names and version metadata in
  existing `toolbenchNodes`; no database migration or new workspace collection.
  Saved selections remain visible without Speckle authorization but new reads
  require that user's Speckle access. Saved names/IDs inherit existing
  cross-team workspace read visibility; capture only approved shared projects.
- GraphQL signatures and API CORS were checked against the public Speckle
  endpoint. Model-data/JSON loading, extraction, calculation, results publishing,
  custom Python requests/polling, latest-code/input freshness and extra tabs are
  intentionally not implemented.
- The architecture direction is asynchronous student-owned Python producing
  versioned results with dependency manifests; date comparisons alone cannot
  establish freshness. This remains future work, not a job system in the app.
- The registered app's real OAuth consent/token exchange and private
  project/model/version access still need user validation. Read-scope failures
  are explicit; grant a further version-read scope only if the live API requires it.
- Validation: 53 Node/PostgreSQL tests, production build and browser fixtures
  passed. Fixtures covered callback cleanup, recovery across the auth redirect,
  paginated model/version selection, pinned references, wiring and shared
  save/reload, error retention, disconnect and read-only teams. Canvas/block
  colours were measured as white / light grey. No private project data or real
  Speckle credentials were used; this is not a live OAuth acceptance test.

### IFC-class Capture and Count follow-up (1 November)

- The user's viewer screenshot confirms window instances retain
  **Attributes > type = IfcWindow**, while **Element Type Attributes > type =
  IfcWindowType** is separate. Speckle's `Objects.Data.DataObject` is not an IFC
  classification. The raw bundle path is not proved by the viewer label.
- New Capture reads the pinned version's format via GraphQL, lists its artifacts
  and downloads only `eav.objects`, `eav.paths` and `eav.eav` Parquet tables.
  It supports bundle versions (`schemaVersion: 3`); older object graphs fail
  explicitly. No geometry, type-level table merge, IFC parser or Python runner.
- A lazy-loaded browser Parquet reader uses named columns and compression support.
  Presigned downloads never receive the Speckle bearer token, are not saved, and
  are checked against account/connection changes through body reading/decoding.
  Limits: 32 MiB per file; 100,000 object/path rows and 2,000,000 value rows.
  Unsupported/missing/oversized data never becomes a partial or zero result.
- The inspector lists actual object-level property paths containing IFC values.
  The student deliberately chooses the instance-class path; Element Type Attributes
  is excluded. Filtering is exact/case-sensitive, not IFC inheritance or name matching.
  Elements are deduplicated by retained application ID (the IFC GUID in this model).
  Classification coverage and sample IDs are visible; unclassified objects are
  reported and not counted. A fully read classification field with no matching
  class produces a valid empty set and count zero.
- Filter outputs store unique IDs, coverage, exact input/configuration key,
  captured time and run ID; Count stores its number and input run/node provenance.
  Raw properties remain transient. Results inherit shared workspace visibility.
  Source/configuration/wire changes invalidate outputs; recapture requires recount.
  Stale async responses cannot overwrite results after edits/team/account changes.
- New function inputs enforce one solid wire and the correct producer. Earlier
  planning blocks and archived records remain compatible. The initial extraction/
  count checkpoint added no extra tab, result publishing, custom scripts, queue
  or polling. The Display follow-up below adds only a read-only presentation block.
- Validation: 65 Node/PostgreSQL tests and production build passed. Tests decode
  real synthetic Parquet, check type/geometry exclusion, duplicates, valid zero,
  missing data, bounded reads, pinned inputs, authorization races, storage and
  legacy behavior. Isolated browser fixtures verified add/wire/read/capture/count,
  zero, save/export-import retention, read-only gating and stale source responses.
  The known large main-bundle warning remains; the Parquet reader is a separate
  lazy-loaded chunk. No private model data or real credentials were used.
- Live follow-up: read model `bffe1068f7`, version `dd5308159e` in project
  `5616d1c8e8` using the user's OAuth connection. Confirm artifact permission/CORS,
  select the actual instance-class path, verify sample window GUIDs/count against
  the viewer, and save/reload the workspace. These are not yet live-verified.

### Count prerequisites and Display value follow-up (1 November)

- The user's screenshot showed a pinned model and wired blocks, but no current
  IFC element collection. Count cannot infer or silently load that collection.
  It now stays disabled with the reason and a **Go to IFC Capture** shortcut
  until the explicit read/select/capture steps succeed. Count/capture errors
  are visible in the inspector, not only in feedback below the canvas.
- Added **Communicate > Display value** with one Count input and no output.
  Its labelled, read-only text box is visible on the canvas and in its inspector.
  It derives the current saved count, automatically updates after calculation,
  displays zero correctly, and replaces stale/missing numbers with warnings.
  It does not trigger calculations, run Python or publish anything.
- Labels save in node metadata. No second result snapshot or migration is needed.
  Count provenance checks are shared by Count and Display. Source/version/class/
  path/wire changes, recapture, mismatched inputs or missing Count results propagate
  to Display. Read-only users can select/copy its text but cannot edit labels.
- Validation: 45 focused element/Toolbench/storage/Speckle tests and production
  build passed. Browser fixtures used native control events in an isolated
  browser with mocked property data to verify count gating, source navigation,
  capture/calculate/display, valid zero, stale values, label saving/export-import,
  read-only selection and small-screen box sizing. No real credentials/private
  data were used. The running local Express app serves the rebuilt frontend.
  Private artifact reads and the actual window count remain live-unverified.

### Older model format and category colours (2 November)

- Follow-up: split loading from filtering. New `speckle.read-properties` blocks
  retain property tables only in the browser's element-flow drafts, while saved
  `propertyResult` metadata records the pinned reference, source node, load run,
  timestamp and object count. `ifc.filter-elements` blocks reuse that loader data,
  keep independent classes/paths/results and make no network calls. Several
  branches can feed the existing Count/Display functions. A successful reread
  changes the load run and invalidates every prior branch. Account/workspace
  changes and page refresh clear raw data; saved results still round-trip.
  Existing `ifc.capture-elements` v1 nodes, inputs and results are unchanged.
  Validation: 59 focused tests/build passed. Full-canvas browser fixtures verified
  one read feeding two independent counts/displays, local class changes/zero,
  cache reset with saved results retained, load/version invalidation, read-only
  controls and legacy Capture. A filter selected while loading becomes enabled
  on completion. The split flow still needs a private-model live retry.
- The user's Read model properties screenshot exposed the bundle-only rejection,
  rather than a missing click handler. The reader now recognizes older versions
  with `schemaVersion: null` or `3` and a content-hash reference as well as bundles.
  Unknown/inconsistent formats still fail explicitly.
- Live diagnostics then showed `schemaVersion=3; reference=object-hash` on the
  user's model. The former null-only object-graph gate incorrectly rejected it.
  Hash references now use the projected object reader for both supported schema
  values; schema 3 with a `bundle.` reference still uses Parquet artifacts.
  A regression test reproduces the exact rejection before the fix and verifies
  the object query and returned IFC properties afterwards. A private live read
  still needs a retry; routing success is not proof of its complete property shape.
- Object-graph reads now show page requests, received/total child-object counts
  and table preparation in the inspector and console. The existing per-request
  20-second GraphQL timeout now reports an actionable error, including failures
  while reading the response body. Progress distinguishes multi-page work from
  a pending first page; the reported private-model delay is not yet diagnosed.
- Public live schema validation confirms the deprecated `project.object` and
  `Object.children` fields remain available when introspection includes deprecated
  fields. The runtime stays project-based; no legacy-named project UI is added.
- Older reads fetch root JSON metadata once and projected child property pages
  (250 children/page, all closure depths within the object limit), then convert
  them to the same property/identity table shape as bundles. The newer Parquet
  reader is unchanged. No geometry fields are requested on children.
- Preserve application IDs or fall back to the instance GlobalId. IFC-classified
  objects without either identity, detached property dictionaries, malformed/
  incomplete/repeating pages, changed totals, access failures and account changes
  reject the read instead of returning guessed, partial or zero results.
  Limits: 100,000 objects including the root, 32 MiB root/child JSON, 100,000 paths
  and 2,000,000 scalar string values. The root can itself be a classified element.
- Category colours were sampled from the user's image: Capture `#c6dcff`,
  Connect `#ffc6c6`, Check `#adf0c7`, Calculate/Compare `#dedaff`, Communicate
  `#fff6b6`. Palette headings, node badges and top borders share those colours.
  Full names distinguish Calculate from Compare; block bodies remain light grey,
  with a white canvas. Known function IDs establish their category on rendering.
- Validation: 51 focused data/client/Toolbench/workspace tests and production build
  passed. Tests cover old/new readers, projected pagination, GUID deduplication,
  root elements, malformed/oversized/partial data, exact byte boundaries and
  account races. An isolated browser used the real old-format reader with mocked
  API pages to capture/count/display two windows, excluding a type definition.
  All six computed palette/node colours matched sampled RGB values; grey bodies
  and the white canvas were measured unchanged.
- The exact query was validated against the live public schema, which then denied
  anonymous access as expected. No private model or real credentials were used.
  Retry the actual pinned model with the user's connected browser; live element
  counts, permissions and shared save/reload remain to verify.

There is no facilitator management or revision-restore screen. History is stored
for administrator inspection/backup. Test with a facilitator and two dummy
student accounts before class rollout, including direct cross-team write denial,
save conflicts, export/import and survival of a Render redeploy.

Supabase Free was considered sufficient for a pilot, subject to current quotas,
inactivity pauses, privacy/region approval and an independent backup/restore
plan. Its default email sender is not suitable for the class: custom SMTP and
appropriate classroom-burst rate limits are needed even on a free project.
Recheck current provider limits/pricing before rollout.

The user has Resend sending from `hello@boxbuild.dk` and has been configuring
Supabase SMTP (host `smtp.resend.com`, port 465, username `resend`, password a
Resend API key). The Magic Link template must display `{{ .Token }}` for code
entry. Live code delivery remains unverified. Personal Resend login identity is
separate from the sender address.

The chosen app domain is `tools.boxbuild.dk`, with a GoDaddy CNAME to
`masterbpmn.onrender.com`. Render custom-domain HTTPS/propagation remains to be
verified. Future `analyse.boxbuild.dk` and the root overview are separate work.
Set Supabase Site URL/allowed URLs accordingly.
Confirm sender/Reply-To addresses with a test email so no personal address is
unintentionally exposed. Keep email-provider credentials in Supabase SMTP
settings and server secrets in deployment settings, never in source.

## Current limitations and source checks

- Authenticated, revision-based shared saving is implemented but requires hosted
  SQL/account/SMTP setup and live acceptance checks. No simultaneous live editing.
- No student-code execution, automatic test evidence, formal approval workflow,
  authoritative master editor, automatic code generator or BPMN interpreter.
- Archived forms cannot be used to create/edit their old record types.
- No reference-table contents, server-side IFC parser or general extraction
  service. The narrow IFC-class browser reader supports Speckle's property
  bundles and older object-graph JSON properties.
- Diagram mappings can become stale; revision history is stored but has no
  restore UI. No reset-to-submission workflow exists.
- Browser recovery/session data is not a secure vault. Use private devices;
  sign-out retains drafts. A domain change needs explicit export/import.
- Check GitHub permissions, rate limits and configured URLs when sources fail.
- ARC-04 has no configured repository; ARC-06's configured general source is
  SVG rather than editable BPMN.
- Source review found identical Design Markdown for ARC-02 and IND-10 in their
  separately configured repositories. Confirm intended ownership/reuse before
  counting them as independent providers.

## Next scope to agree

**15 November update:** prioritise the workshop and result-handoff decisions in
the current checkpoint above. The earlier rollout and template items below are
historical context, not instructions to implement a larger runner now.

Keep the next step small. Candidate work, not an automatic implementation order:

**Historical handoff, 26 October (superseded):** the original workspace migration
and hosted setup were pending at that checkpoint. The user has since confirmed
the additive focus migration was applied after the original migration and the
workflow works. Do not treat this old handoff as an instruction to rerun SQL;
use the current [setup and pilot checklist](supabase/README.md) for outstanding
acceptance checks.

**Earlier element-flow handoff, 2 November:** hosted workspace reads have been reached locally.
The user's screenshot now shows successful separate window/slab branches
(212 windows and 33 slabs); these counts have not been independently checked.
The next narrow check is to run **model -> one property loader -> two IFC filters
-> two Count/Display branches** with the registered Speckle connection, confirming
that changing/applying a filter causes no further Speckle read. Compare retained
IDs/counts with Speckle and perform a real shared save/reload. After refresh, read
once again to use filters; do not add queues or Python execution to this slice.

Remaining rollout work is to verify hosted saves/roles with approved dummy
users/memberships, deploy, and run the live pilot checklist. The provider,
email-code workflow, domain and access policy are agreed. An EU region was chosen;
institutional privacy approval is still required before real rosters/private
student information. Configure independent backups/restore before rollout.

1. Commit the validated template and use its commit SHA in subsequent runs.
   The first live ABD-26 receive/publish/readback succeeded with a
   `local-uncommitted` code revision.
2. Agree one real student function's inputs, outputs and missing-data behaviour,
   then adapt the smoke test and demonstrate import-safe reuse.
3. Agree an explicit GitHub file/revision/callable link on Toolbench blocks.
   Linking or inspecting source must remain separate from authorizing execution.
4. Confirm one compatible output-to-input handoff between student capabilities.
5. Choose the next useful callable function without expanding forms; six-C
   palette categories, badges and pastel accents are already implemented.

Before building a runner, agree callable discovery/versioning, reference-data
provenance, result shape, model-mutation rules and a local or controlled-CI
execution route. Shared persistence and hosted execution require separate scope.

## Development and deployment

Node/Express serves the Vite production build and `/api` routes. Node >= 20
is declared in the package manifest.

Production-style local run:

```text
npm ci --include=dev
npm run build
npm start
```

Open `http://localhost:3000`; `PORT` can override the port.
`/api/health` should return JSON.

`npm run dev` starts Vite, but no API proxy is configured; use the production
server for full local integration.

Validation:

```text
npm test
npm run build
```

The data tests cover legacy restoration/export, source-claim capture,
provider/assumption rules, historical evidence, BPMN projection, non-destructive
regeneration, sockets/wires, handoff compatibility and downstream warnings.
Browser validation should cover the three tabs, Design-to-Toolbench action,
dragging/wiring, source refresh, team isolation, reloads, exports and small screens.

26 October checkpoint: 42 Node/PostgreSQL tests and the production build passed.
PGlite executes the real migration with anonymous, member, unassigned and
facilitator roles, testing grants/RLS, authorship, history, revocation, stale
creates/updates and the exact database size boundary. Browser fixtures verified
code request/verification, existing-account-only requests, session restoration,
sign-out, legacy recovery, shared save/reload, cross-team read-only controls,
active diagram-label saving, conflict/network failure retention, complete JSON
import/export and invalid-XML rejection. Failed reloads preserve the displayed
workspace read-only; browser recovery remains downloadable during outages.
Small-screen controls wrap without horizontal page overflow.
These are local/mocked checks, not hosted-project or email-delivery validation.

The standalone Python template has its own pinned dependencies and setup guide.
After setting up the local virtual environment, run its focused offline tests:

```text
.\.venv\Scripts\python.exe -m unittest discover -s student-template -p "test_*.py" -v
```

On 26 October, ten tests passed, including configured defaults/overrides,
actual SDK bundle serialization and
readback, import safety, CLI safeguards, unique run IDs, mocked receive/publish,
ingestion failure/timeout handling and upload-failure cleanup on Windows.
Syntax compilation passed. Separately, the user's live run confirmed receive,
publication and readback for the specific source/result versions recorded above;
this is not validation of other models, student calculations or engineering rules.

Render uses one Web Service, configured in `render.yaml`:

- Compute plan: `starter`, matching the paid tier selected in Render.
- No persistent disk is attached by the compute upgrade; it does not make
  filesystem writes durable. Supabase storage is implemented separately and
  requires the hosted migration/setup described above.
- Node: `24.x` via `.node-version`.
- Build: `npm ci --include=dev && npm run validate` (tests, then production build).
- Start: `npm start`
- Health check: `/api/health`
- Express serves static frontend assets; `PORT` comes from the environment.

After deployment, check health and real student source loading from the
deployed URL. Do not change this pattern without an agreed deployment scope.

Keep `package.json` and `package-lock.json` in Git. Do not track `node_modules`
or `dist`; Render installs dependencies and builds its own assets. Tracked
Windows dependency launchers caused a `vite: Permission denied` Linux build
failure. After pushing the cleanup, use Render's **Clear build cache & deploy**
and ensure its dashboard build command matches the command above if it does not
automatically synchronise from the Blueprint.

## Continuation prompt

Use the 15 November checkpoint and [WORKSHOP_GUIDE.md](WORKSHOP_GUIDE.md) first.
The quoted prompt below is the historical 2 November implementation handoff;
its "latest" commit, test and next-step claims are not current verification.

> Continue node-comply by reading PROJECT_NOTES.md, then inspect the relevant
> source modules before proposing changes. The only tabs are Design, Team
> diagrams and Subject diagrams. Team diagrams contains the team-only planning
> canvas; BPMN editing/upload/mapping controls are suppressed, while XML and
> archived records remain in saves/recovery/exports. Subject diagrams offers only
> five course-wide focus canvases: Architecture, Indoor / energy, Structure,
> Materials and Build. Course canvases are shared across all teams, with separate
> explicit saves, revisions and account/focus recovery. A single mounted editor
> moves between tab hosts so Copy/Paste works team-to-subject, subject-to-team
> and between subjects, with internal wires. Remember the last subject across
> team visits; preserve unsaved-departure/recovery guards. Design claims open
> Team diagrams. Six-C suggestions remain
> non-executable; any editor may assign any registry team or their own team.
> Pre-created Supabase accounts self-join/switch one existing team through My team;
> this grants editing in that team and removes previous memberships. View team
> is browsing only. Facilitator roles remain administrator-managed.
> The user confirmed the additive 20261102 migration was applied. Production
> Speckle App ID is 7ec53d34f3 with callback https://tools.boxbuild.dk/speckle/callback;
> local App ID bc5cdc2972 uses the localhost:3000 callback. Verify production
> environment values and the Dashboard build command
> `npm ci --include=dev && npm run validate`; an older command omitted Vite.
> Latest committed implementation is 83cfed6; the tab reorganisation is uncommitted.
> Latest canvas validation is 53 focused
> tests, production build and synthetic browser checks; 106 passing full-suite
> tests were an earlier deployment-preparation checkpoint, not a fresh result
> for the current commit. Current production deployment is unverified.
> Follow the release checklist before
> pushing because Render auto-deploy is enabled. Validate cross-account focus
> saves and self-service team switching with approved dummy accounts after deployment.
> Retired forms must not be described as available;
> preserve their saved records in storage/exports. Students' existing A2
> claims drive the visual planning experience. The agreed function vocabulary
> is Capture, Connect, Calculate, Check, Compare and Communicate. The palette
> contains Capture: Speckle model, Capture: Load model properties, Capture: IFC filter,
> Calculate: Count elements and Communicate: Display value. Share one loader across
> window/slab filters; applying filters makes no extra Speckle requests. Raw
> properties are browser-session memory only. Saved results survive refresh, but
> applying filters afterwards requires one new read. Existing combined IFC Capture
> blocks remain usable without automatic conversion;
> the reader supports both bundle and older object-graph versions, with explicit
> errors for incomplete data. Category badges/top accents follow the supplied
> pastel colours; suggestions are lighter grey with dashed borders.
> Information inputs are square-edged planning documents with value/units/reference
> fields, wired to Capture suggestions, not executable model/property sources.
> Blocks show applied settings, Information values and current counts, including
> zero; stale counts are explicitly not current. Drag from empty canvas space
> to select overlapping blocks; Shift/Ctrl/Cmd adds, Escape cancels. Move groups
> by heading drag/arrows; Delete/Backspace removes selected blocks/wires without
> deleting archived records. Text fields retain normal shortcuts.
> Copy selected, switch subjects with Canvas, then Paste. The tab-local clipboard
> and copied-block hint survive subject switches, not refresh/account changes.
> Internal wires and settings are copied with fresh identities and cleared
> results; evidence/approvals are not transferred and cross-canvas BPMN links
> detach. Save the destination canvas. Read-only users may select/copy, not mutate.
> BPMN generation is retired and old patches
> remain intact. White canvas, light-grey blocks. A standalone student Speckle
> Python template exists under
> student-template; it is not integrated with Toolbench. Read its setup guide
> before testing; the first live smoke-test round trip succeeded (see recorded
> source/result versions), but code provenance was local-uncommitted. Speckle is
> intended for student data exchange, not the app's live canvas database.
> Reusable functions should
> accept caller-owned inputs, return structured data and avoid import-time
> model loading; local examples belong under a main guard. Keep information
> flow distinct from BPMN process order and human review. Preserve source
> snapshots, canvas annotations, legacy data and historical evidence. The latest
> element-flow check is live validation of one shared property loader feeding separate
> IfcWindow/IfcSlab filters and Count/Display branches, without repeated downloads.
> The user's earlier screenshot showed successful combined-block counts of 212
> windows and 33 slabs, not an independently verified count or acceptance of the
> new split flow. Then validate real shared save/reload. Hosted workspace reads
> were reached locally on 1 November; live saving/role/deployment checks remain
> pending. Read supabase/README.md for database/email setup. Use dummy accounts until
> privacy approval; keep browser recovery and full JSON/BPMN downloads. Accounts
> are created via Supabase Dashboard; public signup remains disabled.
> Do not add hosted student-code
> execution without separately agreed isolation and scope.

[A2]: https://github.com/timmcginley/41934/blob/main/Assignments/A2.md
[ABD]: https://timmcginley.github.io/41936/Project/index.html
[analyst]: https://github.com/timmcginley/BIManalyst_g_xy
[manager]: https://github.com/timmcginley/BIMmanager_g_xy
