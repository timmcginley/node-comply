# Changelog

Record meaningful changes, decisions and validation here, newest first.
[PROJECT_NOTES.md](PROJECT_NOTES.md) remains the current-state and continuation
guide. Entries distinguish implemented behaviour from future direction; they
do not imply a deployment or release.

## 2026-10-26

### Deployment configuration

- Updated `render.yaml` from `free` to `starter` to match the user's paid
  web-service compute upgrade. This does not attach persistent storage or
  implement authentication; neither is configured yet.

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

### Direction clarified

- Discussed durable workspace revisions, conflict-safe shared saving, local
  recovery and complete ZIP export/import before adding more functionality.
  None of these persistence features is implemented.
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

### Validation

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
- No web application changes or deployment in this step.

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
