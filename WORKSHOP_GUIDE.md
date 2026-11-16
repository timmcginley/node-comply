# Develop an analysis tool others can use

Help another team analyse a building without repeating work unnecessarily.
Start with small functions that run, then improve them through feedback.

## Student tasks

## Week 11: develop your team's tool

Work in **Team diagrams**. You do not need to copy your blocks into a subject
canvas or find a recipient for every internal function.

### 11.1 Find who needs your analysis

Identify a team that could use your analysis outputs in its own tool.
Your own team can be the first user.

In the relevant block's **Notes**, record:

- Who needs the output?
- What will their tool do with it?

**Responsible team** identifies the provider, not the receiver.

### 11.2 Agree a useful output

Discuss with the receiving team:

- What data should you return, including element IDs and units where relevant?
- Which building model and version will you use?
- What would make the output suitable for their tool?

Name the output under **Produces** and record scope and limitations in **Notes**.
Choose something small enough to implement and test.

For example: "Return door GlobalIds, measured widths and missing-width flags,
so the receiving team's escape-route tool can check its selected doors."

### 11.3 Check your agreement

Ask the receiving team:

> Would this output give your tool the information it needs?

Record their response or any unresolved questions in **Notes**. If no recipient
is available yet, record your intended use and continue; this does not block coding.

### 11.4 Build and test a small function

Follow the [Working Together example](https://github.com/timmcginley/41934/blob/main/Activities/workingTogether.md).
You can start coding now; do not wait for a finished output agreement.

1. Copy the [IFC starter template](https://github.com/timmcginley/node-comply-template) into your existing repository as
   `A4/your-capability-name`.
2. Follow its [setup instructions](https://github.com/timmcginley/node-comply-template#readme). In `src/settings.py`,
   set your local IFC path, keeping the `r` before the quotes:
   `MODEL_PATH = r"C:\Models\building.ifc"`.
   Run the unchanged example first; it counts windows.
3. Edit `src/main.py`: keep a clearly named callable function, starting with
   `analyse(model)`, and adapt it to one small part of your analysis.
4. Run again and inspect `results/run-.../result.json`. Each run creates a new
   folder; previous results are not overwritten.
5. Commit your code and link its GitHub folder in the block's **Notes**.

#### Run the example on Windows

Open a terminal in your copied capability folder. For first-time setup with
Python 3.14 installed:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe src\runall.py
```

After editing your function, repeat only the last command. Use your
course-supported Python version if different.

If you already installed IfcOpenShell directly into Python 3.14, you can instead
open a terminal in `src` and run `py -3.14 runall.py`.
If `python` reports a missing package although `pip` says it is installed,
they may refer to different Python installations. Install packages using the
same interpreter that runs the script, for example
`py -3.14 -m pip install -r ..\requirements.txt` from `src`.

Run **`runall.py`**, not `main.py`: `main.py` defines the analysis function;
the runner loads your model, calls it and prints the saved result location.

Give each function one main Capture, Connect, Calculate, Check, Compare or
Communicate purpose. Report missing information explicitly; do not turn errors
into valid zeros. Update `CHANGELOG.md` for meaningful changes and their effect
on the output.

The starter loads a real IfcOpenShell model and saves JSON locally. It does not
run inside node-comply or automatically share results. We will refine the outputs
from your agreements without requiring you to rewrite the whole tool.

Not every canvas block needs code: some describe decisions or manual activities.
Reuse existing analyses or functions where useful.

**Before the checkpoint:** save with **Save shared workspace**. Moving blocks
or clicking **Save block** does not save the workspace to the shared database.

## Week 12: connect tools and exchange results

Revisit **Subject diagrams** to coordinate team contributions without redrawing
every internal function. For now, describe the providing team and reference its
team canvas manually; assigning a team does not create that link automatically.

### 12.1 Share an identified result

Run the tested code on the agreed model and share one selected result, such as
the starter's `result.json`, through your repository. Record alongside it:

- The model and version.
- The code revision and settings.
- The output meaning, units and limitations.

Keep previous shared results. Make clear which result is ready for review;
do not make receivers choose between all your test runs. Share only data you
have permission to redistribute.

### 12.2 Ask the receiving team to review it

> Is this the agreed output, in a form your tool can use?

Record a short response against the specific result:

- **Ready to try**
- **Needs changes**, with the smallest required change
- **Need clarified**, if the original agreement needs revising

Review checks suitability for the agreed purpose, not universal correctness.

### 12.3 Use the result in the receiving team's functions

The receiving team tries the result as an input to its own analysis tool.
Check the model version, format, IDs and units. Record any transformations or
extra assumptions.

Keep a reference to the exact result used. Do not silently replace it when the
provider shares a newer result.

### 12.4 Explain what it enabled

After trying the result, add one short reflection:

> What did this enable our tool to do, or what was missing?

For example: "Our route-checking function can now flag narrow doors, but cannot
assess doors whose widths are missing."

Passing review and being used are different. If integration is blocked, explain
why rather than claiming successful use.

## Week 13: present your work

### 13.1 Final presentation

Show:

1. Your analysis tool, its recipient and the agreed output.
2. Working code and an identified result from a specific building model.
3. The receiving team's review.
4. How another tool used the result, or what blocked integration.

Explain limitations and what you would improve next.

---

## Staff tasks and development notes

This section is for teaching preparation and node-comply development, not extra
student tasks. Proposed automation below is not currently available.

### Support week 11 first

1. Walk through 11.1-11.3 using existing Notes and Needs/Produces sockets.
   Avoid new forms, ratings or a requirement for demand on every function.
2. At the checkpoint, ask students to save explicitly, then **Download all
   canvases**. The combined export separates shared saves from this browser's
   recovery drafts; it does not collect other devices' unsaved work.
3. Use the [basic IFC starter](https://github.com/timmcginley/node-comply-template) for 11.4 now. Review the
   real handoffs before extending it with output contracts and run metadata.
   Do not promise to complete and test it during the break.
4. Walk through 11.4 locally with a small example. Linking code does not execute
   it in node-comply. Keep source-code review distinct from result review.

### Keep week 12 possible without building it all now

- A subject block could summarise a team's contribution and reference its whole
  team canvas. Team assignment alone is not that reference; do not duplicate
  all internal blocks as a workaround.
- Agree stable output identifiers and model identity before automating discovery.
- Start with manual result links and review notes. Later, discover the latest
  selected shared result for the agreed model version, while retaining exact
  run/output references for review and use.
- New test runs must not update consumers. New shared results are updates to
  consider, not automatic replacements for inputs already used.
- Do not add a generic execution engine, duplicate matching, scoring or formal
  approval workflow to support these initial tasks.

### Available starter and proposed extensions

The [basic IFC starter](https://github.com/timmcginley/node-comply-template) is available now: an import-safe
`analyse(model)`, a local runner, JSON output in unique run folders, dependencies,
instructions, changelog and tests. It does not yet generate run provenance or
select results for sharing.

The fuller layout below is a direction for later extension, not a checklist
students must build before coding:

Adapted from Box 3 of
[Wilson et al. (2017), Good enough practices in scientific computing](https://doi.org/10.1371/journal.pcbi.1005510).
Run metadata and shared-result selection are our additions, not the paper's
prescribed structure.

```text
A4/
  capture-windows/
    README.md
    CHANGELOG.md
    CITATION.cff
    LICENSE
    requirements.txt
    data/
      README.md
    doc/
      output-contract.md
    src/
      main.py
      runall.py
    results/
      run-20261116-103000-a82f/
        run.json
        window-areas/
          data.csv
      published.json
```

- Copy a template folder into an existing repository; GitHub's **Use this
  template** normally creates a new repository.
- README: purpose and running instructions. Requirements: Python dependencies.
  Data README: approved inputs and how to obtain the identified model.
  Output contract: record meaning, fields, IDs, units, scope and missing-data
  behaviour.
- Reference existing repository citation/licensing where appropriate. A code
  licence does not grant permission to redistribute models or their data.
- Students edit the callable function in `src/main.py`. The supplied
  `src/runall.py` already runs it locally and saves `result.json`; it does not
  execute the whole canvas. Add richer metadata around that boundary later.
- Require a short changelog for meaningful changes before updated delivery,
  not every test run. Enforcement is initially by peer review.
- `run.json` would record a unique run ID, model identity/version (ideally a
  local-file hash), code revision and dirty state, settings and named output
  paths. A dirty-state flag alone cannot reconstruct uncommitted code.
- Each run gets a new folder. Preserve shared outputs and use commit-specific
  links to identify the exact files reviewed or consumed.
- `published.json` is a provisional name for a selected run per model version.
  Selection means ready for review, not accepted or used. In ISO 19650 terms,
  that is closer to **Shared** than **Published**; settle naming before automation.
- Execution inside node-comply, automatic provenance records, publication
  selection and folder discovery are not implemented. Local execution and
  manual identified links are available now.

### IFC inputs and datasets

Keep the existing Speckle route. Do not require every function to receive a model
or force all downstream functions to use extracted JSON.

Within one execution, a shared loader can pass real IfcOpenShell entities to
functions. Across independent executions, reopen the same identified IFC and
resolve selections by GlobalId when further interrogation is needed. JSON
records are dictionaries, not IFC entities; publish calculated datasets where
those are the intended inputs. Preserve necessary relationships and explicitly
report missing context.
