# MasterBPMN Project Notes

Last updated: 2 November 2026.

These notes describe current behaviour, agreed direction and remaining decisions.
See [CHANGELOG.md](CHANGELOG.md) for dated changes and validation checkpoints.

## Product intent

MasterBPMN helps students plan their tools and see the connections between
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
- **Plan this claim in Toolbench** captures the A2b excerpt and source URL as a
  draft claim record and adds a claim block to the canvas.
- Repeating the action for the same team, source URL and excerpt reuses the
  existing record/block. A changed excerpt creates a new source snapshot.
- Canvas names and notes can change without rewriting the captured source claim.

### Team diagrams

- Side-by-side bpmn-js modelers for general and scoped diagrams, editable only
  by signed-in team members or facilitators.
- Submitted sources are fetched through the configured server-side proxy.
- Upload replacement BPMN/XML and download either edited diagram.
- Select an element in each diagram to create a semantic general-to-scoped
  mapping. Toolbench exposes relevant mappings in a source block's details.
- Submitted work remains distinct from browser drafts and shared revisions.

### Toolbench

A Node-RED/PD-inspired visual planning surface built with browser HTML/SVG.
It is not an embedded Node-RED runtime. Keep the canvas primary and details
available on selection rather than returning to long, always-visible forms.

1. The six-C function palette contains **Capture > Speckle model**,
   **Capture > Load model properties**, **Capture > IFC filter**, **Calculate > Count elements** and
   **Communicate > Display value**.
   Other categories deliberately have no functions.
   The visual canvas is white and blocks are light grey.
   Category badges and top accents match the supplied pastel reference:
   Capture blue, Connect red, Check green, Calculate/Compare purple, Communicate yellow.
2. **Connect Speckle** authorizes the registered app using browser PKCE.
   Select a project URL, model and exact version in the Capture inspector;
   model/version lists are paginated. **Use selected version** updates the
   draft block's single output reference, then **Save shared workspace**
   commits it. This reference block itself does not download model objects.
3. Drag headings to move blocks. Arrow keys also move a focused heading.
   Zoom, scroll and **Fit patch** support larger canvases.
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
source links still select the originating element in Team diagrams.
Earlier generic/linked planning blocks are grouped under **Earlier planning
blocks**, not presented as executable six-C functions.

Removing a canvas block removes its patch wires and their Toolbench-owned
handoffs, not linked claim/request/assumption records or unrelated legacy data.
Select a block or wire and use the visible **Delete selected** toolbar button,
or the existing inspector remove action. Deletion is an unsaved draft change
until **Save shared workspace**. Capture's project URL is an inspector option,
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
Python, not as the application's live canvas database. MasterBPMN remains
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
`tools.boxbuild.dk` and Dashboard-managed membership. The application code and
database migration are implemented; hosted SQL application, actual email delivery
and deployment verification are still pending. Follow the
[setup and pilot checklist](supabase/README.md).

- Render compute has been upgraded to Starter and `render.yaml` matches.
  Ordinary service files remain ephemeral; the upgrade does not attach a disk.
- Supabase Auth and PostgreSQL are selected; MasterBPMN remains on Render.
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
in Supabase and create users via Dashboard, then assign their UUIDs to private
membership/facilitator tables using trusted SQL. Never put rosters, tokens or
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

Keep the next step small. Candidate work, not an automatic implementation order:

**End-of-day handoff, 26 October:** implementation and local validation are
complete for today's scope. No hosted migration or deployment was performed by
the assistant. Start next session with
[the SQL migration](supabase/migrations/20261026_workspace.sql) in Supabase SQL
Editor, then follow the [setup and pilot checklist](supabase/README.md).

**Current handoff, 2 November:** hosted workspace reads have been reached locally.
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
5. Decide how the six Cs should appear on function blocks without adding forms.

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
- Build: `npm ci --include=dev && npm run build`
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

> Continue MasterBPMN by reading PROJECT_NOTES.md, then inspect the relevant
> source modules before proposing changes. The only tabs are Design, Team
> diagrams and Toolbench. Retired forms must not be described as available;
> preserve their saved records in storage/exports. Students' existing A2
> claims drive the visual planning experience. The agreed function vocabulary
> is Capture, Connect, Calculate, Check, Compare and Communicate. The palette
> contains Capture: Speckle model, Capture: Load model properties, Capture: IFC filter, Calculate: Count elements
> and Communicate: Display value;
> the reader supports both bundle and older object-graph versions, with explicit
> errors for incomplete data. Category badges/top accents follow the supplied
> pastel colours; block bodies remain light grey.
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
> priority is validating the registered Speckle app's real OAuth connection,
> private bundle-property reads, the actual IFC-class path, unique window count
> and shared save/reload. Hosted workspace reads
> were reached locally on 1 November; live saving/role/deployment checks remain
> pending. Read supabase/README.md for database/email setup. Use dummy accounts until
> privacy approval; keep browser recovery and full JSON/BPMN downloads. Membership
> is managed via Dashboard/SQL, not an admin UI. Do not add hosted student-code
> execution without separately agreed isolation and scope.

[A2]: https://github.com/timmcginley/41934/blob/main/Assignments/A2.md
[ABD]: https://timmcginley.github.io/41936/Project/index.html
[analyst]: https://github.com/timmcginley/BIManalyst_g_xy
[manager]: https://github.com/timmcginley/BIMmanager_g_xy
