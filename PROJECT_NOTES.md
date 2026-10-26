# MasterBPMN Project Notes

Last consolidated: 26 October 2026.

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
implementation. The visual Toolbench helps students plan information exchanges.
A future reusable runner may execute explicitly declared functions, but no
runner or automatic BPMN-to-code translation is implemented.

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

- Side-by-side editable bpmn-js modelers for general and scoped diagrams.
- Submitted sources are fetched through the configured server-side proxy.
- Upload replacement BPMN/XML and download either edited diagram.
- Select an element in each diagram to create a semantic general-to-scoped
  mapping. Toolbench exposes relevant mappings in a source block's details.
- Submitted work remains distinct from local workshop drafts.

### Toolbench

A Node-RED/PD-inspired visual planning surface built with browser HTML/SVG.
It is not an embedded Node-RED runtime. Keep the canvas primary and details
available on selection rather than returning to long, always-visible forms.

1. Choose **Generate from BPMN**, or add individual general BPMN blocks from
   the tray. Generation uses source positions as a starting layout.
2. Top-level activities become tool blocks; subprocess internals remain
   collapsed. Events, gateways and human activities remain identifiable.
3. Drag headings to move blocks. Arrow keys also move a focused heading.
   Zoom, scroll and **Fit patch** support larger canvases.
4. Select a block to edit its name, responsible team, claim link, notes and
   named input/output sockets.
5. Drag an output to an input, or click the two sockets in order, to create
   a proposed information handoff. Select a wire to name the information and
   optionally note format, units, model revision or acceptance conditions.
6. An open input is a gap. Name it, save its consuming block's claim link and
   choose **Request** to create a linked draft capability request.
7. Existing claims, requests, provider declarations and assumptions can be
   added from the tray. Requests can select previously declared providers;
   selection does not establish implementation, testing or acceptance.
8. New provisional-input blocks are unapproved sketches. Notes can describe
   their provenance, but the canvas does not approve assumptions or formally
   accept contracts.

Wire meanings:

- **Solid:** user-declared information handoff, not verified compatibility.
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

Canvas edits do not modify BPMN XML. Source links select the originating
element in Team diagrams. Regeneration preserves existing positions, names,
sockets, notes and deliberately promoted handoffs. Removed source elements
and links remain for review; an unavailable source is not treated as deletion.
Refreshing can re-add source blocks previously removed from the canvas.

Removing a canvas block removes its patch wires and their Toolbench-owned
handoffs, not linked claim/request/assumption records or unrelated legacy data.
There is no Run button.

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

This vocabulary is agreed planning direction. It is **not yet implemented**
as a Toolbench category field, palette, colour scheme or executable interface.
Current structural block kinds such as activity, data, request, provider,
assumption and claim are separate from these proposed function categories.

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
[ABD-26](https://app.speckle.systems/workspaces/abd-26); actual project, model
and version IDs are supplied by the user.

The example uses pinned `specklepy[bundle]==2026.9.1` and the 2026.9 bundle APIs,
not the older object-graph format. Tokens stay in the user's local environment.
It is import-safe, read-only unless `--publish` is supplied, and separates the
caller-owned model from the reusable calculation. Results identify their run,
input version, function version and caller-declared Git code revision.
Publication status and result readback are checked; an object count is a
connection smoke test, not an IFC element count or design judgement.

Offline SDK round-trip and orchestration tests exist. A live authenticated
workspace receive/publish still needs validation with actual IDs and local
credentials. No student Python runs in the Node server. No Toolbench execution,
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

Workshop records use the existing per-team `masterbpmn:<teamId>` localStorage
key. Diagram drafts use separate `:general:xml` and `:scoped:xml` keys.

Preserved collections:

- `toolbenchNodes`, `toolbenchWires`: visual patch and source links.
- `claims`, `requests`, `offers`, `assumptions`, `evidence`: claim/planning data
  and retained historical evidence.
- `mappings`, `nominations`, `dependencies`, `activities`, `references`: existing
  diagram mappings, handoffs and records from retired interfaces.

Missing/non-array collections normalise to empty arrays. Existing dependency
type values and free-text source/target records remain compatible.
Toolbench wires create/update their own proposed handoffs in `dependencies`,
identified by `toolbenchWireId`; unrelated handoffs remain untouched.

**Download workspace** saves the current diagram drafts locally and exports
the team and record collections as JSON. The JSON does not contain BPMN XML;
download each diagram separately. Canvas/model compatibility is not established
by a successful export.

## Current limitations and source checks

- Browser-local, single-user prototype: no authentication, database, server-side
  saving, shared records or concurrent multi-team canvas.
- No student-code execution, automatic test evidence, formal approval workflow,
  authoritative master editor, automatic code generator or BPMN interpreter.
- Archived forms cannot be used to create/edit their old record types.
- No reference-table contents, IFC extraction service or managed shared storage.
- Diagram mappings can become stale; no complete version history or
  reset-to-submission workflow exists.
- Check GitHub permissions, rate limits and configured URLs when sources fail.
- ARC-04 has no configured repository; ARC-06's configured general source is
  SVG rather than editable BPMN.
- Source review found identical Design Markdown for ARC-02 and IND-10 in their
  separately configured repositories. Confirm intended ownership/reuse before
  counting them as independent providers.

## Next scope to agree

Keep the next step small. Candidate work, not an automatic implementation order:

1. Validate the standalone Speckle template against an actual authorized source
   version and separate results model in ABD-26, with credentials entered locally.
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
npm install
npm run build
npm start
```

Open `http://localhost:3000`; `PORT` can override the port.
`/api/health` should return JSON.

`npm run dev` starts Vite, but no API proxy is configured; use the production
server for full local integration.

Focused validation:

```text
node --test src/workshop-data.test.js src/claim-data.test.js src/toolbench-data.test.js
npm run build
```

The data tests cover legacy restoration/export, source-claim capture,
provider/assumption rules, historical evidence, BPMN projection, non-destructive
regeneration, sockets/wires, handoff compatibility and downstream warnings.
Browser validation should cover the three tabs, Design-to-Toolbench action,
dragging/wiring, source refresh, team isolation, reloads, exports and small screens.

The standalone Python template has its own pinned dependencies and setup guide.
After setting up the local virtual environment, run its focused offline tests:

```text
.\.venv\Scripts\python.exe -m unittest discover -s student-template -p "test_*.py" -v
```

On 26 October, nine tests passed, including actual SDK bundle serialization and
readback, import safety, CLI safeguards, unique run IDs, mocked receive/publish,
ingestion failure/timeout handling and upload-failure cleanup on Windows.
Syntax compilation passed. This does not establish live workspace access,
permissions, source-format compatibility or successful remote publication.

Render uses one Web Service, configured in `render.yaml`:

- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Express serves static frontend assets; `PORT` comes from the environment.

After deployment, check health and real student source loading from the
deployed URL. Do not change this pattern without an agreed deployment scope.

## Continuation prompt

> Continue MasterBPMN by reading PROJECT_NOTES.md, then inspect the relevant
> source modules before proposing changes. The only tabs are Design, Team
> diagrams and Toolbench. Retired forms must not be described as available;
> preserve their saved records in storage/exports. Students' existing A2
> claims drive the visual planning experience. The agreed function vocabulary
> is Capture, Connect, Calculate, Check, Compare and Communicate; category UI
> is not implemented. A standalone student Speckle Python template exists under
> student-template; it is not integrated with Toolbench. Read its setup guide
> before testing; live workspace validation is still outstanding. Speckle is
> intended for student data exchange, not the app's live canvas database.
> Reusable functions should
> accept caller-owned inputs, return structured data and avoid import-time
> model loading; local examples belong under a main guard. Keep information
> flow distinct from BPMN process order and human review. Preserve source
> snapshots, canvas annotations, legacy data and historical evidence. Do not
> add a database, authentication or hosted student-code execution without
> agreed scope.

[A2]: https://github.com/timmcginley/41934/blob/main/Assignments/A2.md
[ABD]: https://timmcginley.github.io/41936/Project/index.html
[analyst]: https://github.com/timmcginley/BIManalyst_g_xy
[manager]: https://github.com/timmcginley/BIMmanager_g_xy
