# MasterBPMN Project Notes

## Product intent


MasterBPMN is a student-facing process-integration workspace that builds on course assessment A2. It treats submitted work from [A2] as the starting point by preloading each team's general and scoped BPMN diagrams.

The application supports three linked levels:

1. General BPMN: the professional process and the primary source for the disciplinary master map.
2. Scoped BPMN: the detailed computational implementation of the team's tool.
3. Disciplinary master BPMN: a curated process assembled from nominated general elements and accepted dependencies.

The first implementation focuses on ARC, followed by IND, STR, MAT and BLD.

## Deployment target

MasterBPMN is a Node application intended for Render, using the same broad deployment pattern as BoxBuild:

- one GitHub repository;
- one Render Web Service;
- Node/Express production server;
- Vite build step;
- `PORT` read from the environment;
- static frontend served by Express;
- health endpoint at `/api/health`.

Render settings are encoded in `render.yaml`:

- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/api/health`

## Current mock-up capabilities

- A single team selector driven by `data/teams.json` for ARC, IND, STR, MAT and BLD; the discipline is encoded in each team ID.
- General and scoped BPMNs preloaded through a server-side allowlisted proxy.
- Read-only Design tab at the far left that locates each team's README, normalizes its A2a–A2g sections, links back to the GitHub source, and can refresh README content from GitHub.
- Side-by-side editable bpmn-js modelers.
- Upload replacement BPMN files.
- Download edited general and scoped BPMN files.
- Select an element in each diagram and create a semantic connection.
- Nominate a selected general element for the ARC master.
- Activity-led **Inputs, outputs & handoffs** tab with scoped activity notes, responsible teams/roles, information needed and produced, and repeated-work review prompts.
- Plan reusable lookup tables/reference information, including planned storage, maintaining team, source IFC provenance, contents/keys/units, and refresh rules; link several references to an activity and see which activities use a reference.
- Declare handoffs with source, target, exchanged information and type; optionally link either end to an actual scoped activity.
- Accessible, paraphrased ISO 19650 learning guidance on hover, keyboard focus, click or tap; Escape dismisses explanations.
- Store workshop metadata and draft XML in browser localStorage.
- Export the workspace metadata as JSON.
- Preserve a clear distinction between submitted and workshop versions.

## Important product decisions

### General BPMN drives the master

The general BPMN is the source of events, activities, gateways and data objects nominated for the master map. The scoped BPMN is normally too detailed for direct merging.

### Scoped BPMN remains linked

A master activity should eventually act as a collapsed call activity linked to the relevant scoped tool process.

### Nominations are reviewed

Students nominate elements. They do not directly change the authoritative disciplinary master. This prevents duplicates, incompatible naming and accidental low-level detail.

### Dependencies are explicit data

Execution order must not be inferred from visual diagram position alone. It should come from accepted process, data, model, decision, human and optional dependencies.

### Start with activities, not dependency terminology

Students describe scoped **activities** (tasks, subprocesses and call activities), not events or gateways, as the work their tools perform. The Inputs, outputs & handoffs tab supports three steps:

1. Describe an activity: purpose, responsible team or role, information needed, information produced, reusable references used, and similar/repeated work to review.
2. Plan reusable reference information: identify a lookup table, planned storage location, maintaining team, source IFC information or other provenance, contents/keys/units, and when it must be checked or rebuilt. These plans can be created first, then selected while editing activity notes.
3. Connect activities and teams: explicitly name providers, recipients and exchanged information or conditions. Select local scoped activities where applicable; describe external teams or activities in text.

Activity notes and reference plans can be edited or removed. Each scoped activity has one notes record per team workspace. Missing activity links are shown after diagram replacement or deletion, and activity notes can be relinked through editing. Removing a reference that is in use requires confirmation and leaves a visible missing-reference marker in its activity notes.

Repeated-work notes are review candidates only: compare purpose, inputs, outputs and responsibility before deciding whether two activities should be combined. There is no automatic duplicate detection or merging. The general BPMN still drives master nominations; scoped activities are not automatically promoted.

### ISO 19650 as a learning scaffold

Plain-language questions come first. Info icons connect them to information requirements, information exchange, task teams, information containers and responsibility matrices. Guidance is paraphrased, not quoted normative text, and does not establish formal appointments or claim ISO 19650 compliance.

A named file or table can be considered an information container when it is an identifiable, retrievable collection of information. Recording a storage location alone does not implement a common data environment (CDE), its review workflow, or managed sharing. Activity responsibility notes are a starting point for an eventual responsibility matrix, not a completed formal matrix.

### Preserve workshop data compatibility

The existing `masterbpmn:<teamId>` localStorage key, `dependencies` collection and original dependency type values remain unchanged. Older records with free-text source/target continue to display and export without requiring activity IDs. New `activities` and `references` arrays default to empty for old workspaces. New handoffs may include `sourceActivityId`, `targetActivityId` and `teamId`.

All these records are included in the existing workspace JSON download and persist separately from diagram XML. No server-side schema, authentication, deployment or submitted-source changes are needed.

### Submitted work is immutable

Repository submissions are loaded as provenance. Student edits create a workshop version. Reset-to-submission and version history should be added before production use.

## Current limitations

This is a UX mock-up, not a production collaboration system.

- No authentication.
- No database.
- No server-side saving.
- No concurrent multi-user editing.
- No authoritative ARC master editor yet.
- No graphical dependency network yet.
- Lookup-table plans are metadata only: no table contents, IFC extraction, cache invalidation or shared storage service is implemented.
- Activity responsibility and repeated-work notes are team-local proposals, not agreed cross-team allocations; recipient confirmation and review are not implemented.
- External handoff participants and repeated-work candidates are free text, not validated links to other teams' diagram elements.
- Diagram mappings are stored in localStorage and can become stale if element IDs are deleted.
- Workshop records are local to the browser and are not shared between users; design answers remain in the source README on GitHub.
- The workspace export contains metadata, while BPMN files are downloaded separately.
- URL availability and repository permissions must be checked.
- ARC-06 general is currently an SVG and cannot be edited as BPMN.
- ARC-04 has no configured repository.

## Suggested data model

The following model includes future fields; current workshop records are deliberately smaller.

### Activity notes (implemented)

- `id`, `teamId`, `scopedElementId`, `name` (label snapshot)
- `owner`: responsible team or role
- `purpose`, `inputs`, `outputs`
- `referenceIds[]`: reusable reference plans used by the activity
- `repeated`: candidate similar activities/teams for human review

### Reusable reference plan (implemented)

- `id`, `teamId`, `name`, `location` (planned storage, not an upload)
- `owner`: maintaining team or role
- `source`, `contents`, `refresh`

### Handoff compatibility (implemented)

- Existing `dependencies[]`: `from`, `to`, `type`, `object`
- Optional new local scoped links: `sourceActivityId`, `targetActivityId`, `teamId`
- UI terminology is "handoff"; stored type values retain the original dependency names for compatibility.

### Team

- `id`
- `subject`
- `teamNumber`
- `repositoryUrl`
- `diagrams.general`
- `diagrams.scoped`
- future `toolManifest`

### Diagram version

- `teamId`
- `kind`: general or scoped
- `sourceUrl`
- `sourceCommit`
- `submittedAt`
- `xml`
- `version`
- `status`

### Mapping

- `id`
- `teamId`
- `generalElementId`
- `scopedElementIds[]`
- `relationship`
- `explanation`
- `createdBy`
- `createdAt`
- `valid`

### Master nomination

- `id`
- `sourceTeamId`
- `sourceDiagramVersion`
- `sourceElementId`
- `sourceLabel`
- `proposedLabel`
- `proposedType`
- `reason`
- `requiredInputs[]`
- `producedOutputs[]`
- `status`: proposed, accepted, merged, rejected

### Dependency

- `id`
- `sourceTeamId`
- `sourceElementId`
- `targetTeamId`
- `targetElementId`
- `dependencyType`
- `informationObject`
- `format`
- `required`
- `ifcRequirements[]`
- `fallback`
- `status`: declared, reciprocal, validated, implemented, unresolved, broken

## Recommended next sprints

### Sprint M0: Validate the workshop mock-up

- Run locally.
- Confirm all configured student BPMNs import.
- Correct URLs and filenames.
- Test with one ARC team.
- Observe whether side-by-side editing works on classroom screens.

### Sprint M1: Reliable version handling

- Add Reset to submitted version.
- Add explicit Save workshop draft.
- Add export package containing both BPMNs and metadata.
- Detect mappings whose BPMN element IDs no longer exist.
- Add clear unsaved-change warnings.

### Sprint M2: Review workflow

- Add facilitator view.
- Add nomination status: proposed, accepted, merged, rejected.
- Add comments and review notes.
- Add terminology normalisation.
- Add duplicate detection by label and BPMN type.

### Sprint M3: ARC master builder

- Add a third bpmn-js modeler for the ARC master.
- Allow accepted nominations to create candidate master elements.
- Preserve provenance from master element to source team and source BPMN element.
- Represent implemented tools as call activities.
- Do not automatically construct sequence flows without review.

### Sprint M4: Dependency graph

- Add team, process and information views.
- Visualise required and optional edges differently.
- Support reciprocal confirmation by receiving teams.
- Flag orphan inputs, unused outputs, cycles and broken dependencies.
- Derive a tentative execution order from required dependencies.

### Sprint M5: Persistent deployment

- Add a database, likely PostgreSQL on Render.
- Add session/project records.
- Add facilitator and student access controls.
- Store diagram XML, mappings, nominations and dependencies server-side.
- Add audit events and backups.

### Sprint M6: Tool-library bridge

- Define a tool manifest for ARC, IND, STR, MAT and BLD packages.
- Map accepted master call activities to tool manifests.
- Define common input validation and result envelopes.
- Build the loader only after the process and dependency contracts stabilise.

## Tool manifest direction

A future team library should declare:

- stable tool ID;
- discipline and team;
- package/module name;
- version;
- entry operation;
- accepted inputs;
- produced outputs;
- IFC schema/entity/property requirements;
- configuration schema;
- dependencies;
- failure modes;
- result schema.

The master loader should discover and validate tools through this manifest rather than depending on internal student implementation details.

## Local development

```bash
npm install
npm run dev
```

Vite runs the frontend development server. The current frontend expects `/api` routes, so for full local integration either run the production build or add a Vite proxy in a later sprint.

Production-style local run:

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000`.

Run the focused workshop data tests with `node --test src/workshop-data.test.js`. These use Node's built-in test runner and cover legacy restoration, new record round trips, safe text rendering, activity filtering, and missing-link detection.

## Render deployment

1. Push the MasterBPMN folder contents to a GitHub repository.
2. In Render, create a Blueprint from the repository, using `render.yaml`; or create a Web Service manually.
3. Confirm the build command is `npm install && npm run build`.
4. Confirm the start command is `npm start`.
5. Confirm `/api/health` returns JSON after deployment.
6. Test BPMN loading from the Render URL.

## Copilot continuation prompt

Use this at the start of a VS Code Copilot session:

> We are continuing MasterBPMN, a Node/Express and Vite application deployed on Render. Read `PROJECT_NOTES.md`, `data/teams.json`, `server.js`, `src/main.js`, and `src/style.css` before proposing changes. The submitted general and scoped BPMNs are authoritative inputs and must remain distinguishable from workshop drafts. The general BPMN drives nominations to a disciplinary master; the scoped BPMN documents implementation. Dependencies are explicit structured records, not inferred only from sequence flow. Work one sprint item at a time, preserve the current Render deployment pattern, and do not introduce a database or authentication unless the active sprint requires it.

## First task for Copilot in VS Code

Start with Sprint M0:

1. run the production-style build;
2. test `/api/health`;
3. open each configured ARC team;
4. record which general and scoped BPMNs import successfully;
5. fix registry URLs only;
6. do not redesign the application during this validation step.

[A2]:https://github.com/timmcginley/41934/blob/main/Assignments/A2.md
