# Changelog

Record meaningful changes, decisions and validation here, newest first.
[PROJECT_NOTES.md](PROJECT_NOTES.md) remains the current-state and continuation
guide. Entries distinguish implemented behaviour from future direction; they
do not imply a deployment or release.

## 2026-10-26

### Added

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

- Speckle serves student Python information exchange; the web app stays in Node.
  App persistence/concurrent editing is a separate decision.
- Separate function definitions, execution records and published results.
  Expected outputs are not completed results; old results remain tied to their
  original inputs and requirements.
- Future Toolbench blocks may link an explicitly supplied GitHub file, revision
  and callable. No source-linking UI, Python execution or result reuse is added.
- Updated project notes and introduced this changelog.

### Validation

- Nine Python tests passed, including real SDK bundle serialization/readback and
  mocked network orchestration. Syntax compilation and diff whitespace checks
  passed.
- Fixed Windows temporary-file cleanup when upload fails before the SDK finishes
  its bundle writers.
- Live authenticated receive/publish in
  [ABD-26](https://app.speckle.systems/workspaces/abd-26) remains unverified:
  actual model/version IDs, permissions and locally entered credentials are
  needed. Older object-graph source versions are outside this template's scope.
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
