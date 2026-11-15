# From a team analysis to a useful design contribution

## Tomorrow's workshop

Your role is not just to produce data or code. It is to help other members of
the design team make informed decisions.

Develop your team's analysis, starting with small functions that run. Improve
the analysis through feedback from people who need its findings.

### This week: develop the team analysis

Work in your existing **Team diagrams** canvas. Make the analysis concrete:
its design question, required information, supporting functions and useful
outputs. Not every block needs to become code; some represent decisions,
manual activities or context.

Identify who could use the overall analysis. You do not need a separate request
or recipient for every internal function before you can develop it.

### Next week: connect contributions at subject level

Revisit **Subject diagrams** to coordinate the teams' analyses and information
handoffs. A subject block could summarise a team's contribution and reference
its whole team canvas, rather than duplicate all its internal blocks.
That explicit canvas reference is a proposed approach, not an existing link
created by assigning a team to a block.

The distinction to test is: **team canvases develop the work; subject canvases
coordinate the contributions**. Do not maintain matching copies this week.

Our main aim is to avoid unnecessary repeated analysis caused by teams not
knowing about each other's work. Reusing individual functions supports that aim,
but is not the main collaboration task. Deliberately independent analyses can
still be valuable for checking or comparison.

This is a teaching workflow, not a list of existing app features. Use the canvas
to describe suggestions and outputs. Share code and result links through your
team repository, and request and record reviews through conversation or GitHub.
Do not assume that attaching code makes it run in the canvas.
The folder convention and automatic runner described below are proposed
scaffolding, not features already implemented in the app or a supplied template.
Until they are available, record the same information and share links manually.

## First half: clarify the analysis and its purpose

### 1. Find a recipient

Start from your team's existing analysis. Identify who could use its findings
and what design decision those findings would inform. The recipient may be
another team or your own design analysis.

Record the recipient and purpose in the description of the relevant analysis
or output block. Keep cross-team conversations focused on the analysis handoff,
not collecting interest in every internal function. No star, rating or formal
request is required.

### 2. Agree the smallest useful output

Provider and receiver discuss:

- What design question will this information help answer?
- What should the analysis deliver, including units where relevant?
- Which building model will you start with?

Use the suggestion description and output labels to record the agreement.
Keep it small enough to implement and test today.

For example: "Provide fire-safety findings and flagged element IDs, so the
receiving team can review its proposed layout." Agree the scope, criteria and
limitations. The providing team decides which supporting functions and
intermediate datasets are needed to produce that handoff.

### 3. Confirm the purpose

Where a receiving team is available, check your interpretation with them:

> Yes, this proposed output would help our analysis.

If a recipient is not yet available, record the intended use and what still
needs agreement. This does not block exploratory coding or useful internal
functions. Cross-team need is not a prerequisite for attaching code.

## Second half: implement, review and use

### 4. Develop the supporting code

Follow the [Working Together template](https://github.com/timmcginley/41934/blob/main/Activities/workingTogether.md):
provide a clearly named callable function with one primary Capture, Connect,
Calculate, Check, Compare or Communicate purpose.

Start with one small working part of your analysis. Explain missing information and limitations;
do not disguise an error or missing data as a valid zero.

Link implementations to the relevant team-canvas suggestions through their
descriptions or your team repository. Check whether another team's existing
analysis or result could meet the need before repeating it. Reuse supporting
functions where useful, without turning duplicate detection into another task.

#### Keep each capability in a named A4 folder

The proposed template can be copied into an existing repository under `A4`;
you do not need to create a new repository. GitHub's **Use this template**
normally creates a new repository, so download and copy the function folder
when working in an existing one.

Use a project layout adapted from Box 3 of
[Good enough practices in scientific computing (Wilson et al., 2017)](https://doi.org/10.1371/journal.pcbi.1005510).
The paper provides the project-organisation foundation; the run folders,
`run.json` and `published.json` below are our proposed additions.

For example:

```text
A4/
  capture-windows/
    CITATION.cff
    README.md
    CHANGELOG.md
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
        window-count/
          data.json
      published.json
```

Link the suggestion to the function folder, such as `A4/capture-windows`.
Keep the responsibilities of the folders clear:

- `README.md`: purpose, quick start and links to the outputs.
- `CHANGELOG.md`: a required, human-readable history of meaningful changes.
  Add a dated entry before sharing an updated implementation or publishing a
  changed result. Explain what changed and its effect on the receiving team,
  especially changes to output fields, units, assumptions or interpretation.
  Record the initial working version too. Routine test runs do not need entries;
  their individual executions belong in the run records.
- `CITATION.cff`: authorship and how to acknowledge this capability.
- `LICENSE`: the agreed software reuse terms. Respect any existing repository
  licence; do not introduce conflicting terms. Code licensing does not grant
  permission to redistribute a building model or its data.
- `requirements.txt`: the Python dependencies needed to run the code.
- `data/`: approved input data, kept separate from generated results.
  Its README explains how to obtain the agreed model and identify its version;
  the model can remain outside the repository when it cannot be redistributed.
- `doc/`: the agreed output definitions, units, assumptions and limitations.
- `src/main.py`: the student-written callable analysis function.
- `src/runall.py`: the proposed supplied runner that executes the analysis and
  records the run. Its name does not imply that it executes all canvas blocks.
- `results/`: generated outputs, run records and the published-run selection.

An existing repository-level citation or licence can be referenced rather than
duplicated unnecessarily. Students should not have to create extra documents
just to fill folders: start with short, useful explanations.

The changelog is a workshop requirement, not an automated check in the current
app. Include it in peer review before accepting an updated delivery. It explains
changes; Git records code history and `run.json` records individual executions.

Each output has a stable identifier, such as `window-areas`, matching the agreed
output. A friendly display label can change without renaming that identifier.
Each run groups the outputs produced together for a particular building model.

The intended scaffolding lets you focus on the analysis function in
`src/main.py`; a supplied runner would manage result files and run records.
Predictable folders would let the app discover code and results from one folder
URL in future, but that discovery is not implemented yet.

### 5. Run it and share the actual output

Run the code against the agreed building model. Save the result in a shareable
format appropriate to the output, such as JSON or CSV.

Alongside the result, record:

- The building model and version used.
- The code revision used, preferably a GitHub commit link.
- Any settings, assumptions or limitations needed to interpret the output.

#### Give every run a stable identity

Each execution creates a new, uniquely named run folder. Do not overwrite
previous runs when the code, model or settings change.

`run.json` describes that execution; it is not the output data itself.
The proposed runner would generate it automatically, recording the run ID,
building-model identity/version (ideally a file hash for a local IFC), code
commit, whether the code had uncommitted changes, settings and output file paths.
Record assumptions and limitations alongside it.

Preserve the run folder and commit the shared files to GitHub. A commit-specific
link identifies their exact published contents, even after the branch changes.
Do not commit private model data or credentials; share only approved outputs.

#### Separate testing from publishing

You may create many test runs. The receiving team should not have to browse them
or automatically receive whichever file was generated last.

Choose a run that is ready for someone else to try. The proposed
`results/published.json` acts as a pointer to that run for the agreed
building-model version. It does not contain the results or replace `run.json`.
A future runner could offer **Publish this run**; for now, clearly identify and
link the chosen run manually.

Publishing means "ready for review", not "reviewed" or "used". Commit and push
the selected run and its publication pointer so others can access them.
For multiple models, keep the published selection distinct for each model
version; never substitute a result from a different building.

Share the selected analysis result with the receiving team and record its link
alongside the relevant team-canvas output. You do not need external review of
every intermediate dataset. Linking code is not evidence that it ran; sharing
a result does not yet mean another team has used it.

### 6. Request a review

Ask the receiving team:

> Is this the output we agreed, and is it suitable to try in your analysis?

The receiver checks its meaning, format, units, coverage and stated limitations.
Identify the specific run and output being reviewed, not just the latest
publication pointer. Record a short response beside that result or in GitHub:

- **Ready to try:** suitable for the agreed next step.
- **Needs changes:** explain the smallest change needed.
- **Need clarified:** revise the agreement if the original request was unclear.

Improve and rerun as needed. Review is not a guarantee of engineering correctness
or proof that the output supports a design claim.

### 7. Incorporate it into the receiving team's design work

After review, the receiving team tries the result as an input to its own code,
dataset, analysis or design decision. It does not have to become a Python input
to count as use. Check that it relates to the intended building-model version.
Where suitable, reuse the existing result rather than repeat the computation.

Keep a reference to the particular result used. Record any transformations or
assumptions introduced when incorporating it.

The intended default when first connecting is the **latest published output for
the agreed building-model version**, not the latest test run. Once reviewed or
used, retain the exact run ID, output identifier and commit-specific reference.
New test runs do not change that input. A newer published result is an update
to consider, not permission to silently replace data already used.

### 8. Explain its contribution

Only after using the result, acknowledge its use and add one short reflection:

> What did this help us decide, or what limitation did it reveal?

For example: "We used the flagged doors to review the proposed escape route,
but need to confirm the occupancy assumptions before changing the layout."

An output can pass review without being used yet. An output can also be useful
because it reveals a gap rather than providing a final answer.

## End-of-session check

Be ready to show:

1. Your team's analysis, its intended recipient and the decision it supports.
2. The code and the selected shared run from an identified building model.
3. The receiving team's review of that specific run and output.
4. If used, where the result contributed and what was learned.

Unfinished work is welcome: explain your current step and what is blocking the
next one. Save canvas changes explicitly with **Save course canvas** or
**Save shared workspace**, as appropriate; moving blocks does not save them to
the shared database.
