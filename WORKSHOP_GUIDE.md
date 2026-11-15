# From a shared need to a useful result

## Tomorrow's workshop

Your role is not just to produce data or code. It is to help other members of
the design team make informed decisions.

Start with a small function that runs. Improve it through feedback from someone
who needs its output.

This is a teaching workflow, not a list of existing app features. Use the canvas
to describe suggestions and outputs. Share code and result links through your
team repository, and request and record reviews through conversation or GitHub.
Do not assume that attaching code makes it run in the canvas.
The folder convention and automatic runner described below are proposed
scaffolding, not features already implemented in the app or a supplied template.
Until they are available, record the same information and share links manually.

## First half: agree the need before coding

### 1. Find a recipient

Look at the canvas suggestions. Identify a capability your team needs, or find
another team that needs something your team could provide.

Record the receiving team against the suggestion using the existing description.
The receiving team is expressing a need, not rating the suggestion or promising
that its implementation will work.

### 2. Agree the smallest useful output

Provider and receiver discuss:

- What design question will this information help answer?
- What should the function return, including units where relevant?
- Which building model will you start with?

Use the suggestion description and output labels to record the agreement.
Keep it small enough to implement and test today.

For example: "Return window IDs and areas in square metres, so the receiving
team can use them in its glazing analysis." Agree whether this means all windows
or a particular subset.

### 3. Confirm the purpose

Before linking code, the receiving team confirms:

> Yes, this proposed output would help our analysis.

For this exercise, find a recipient before implementing the suggestion. This is
a lesson rule, not a software restriction. Your own team's analysis can be a
valid need, but look for opportunities to collaborate across teams.

## Second half: implement, review and use

### 4. Develop a basic function that runs

Follow the [Working Together template](https://github.com/timmcginley/41934/blob/main/Activities/workingTogether.md):
provide a clearly named callable function with one primary Capture, Connect,
Calculate, Check, Compare or Communicate purpose.

Start with the agreed output. Explain missing information and limitations;
do not disguise an error or missing data as a valid zero.

Link the implementation to the suggestion through its description or your team
repository. Check whether an existing function or result could meet the need
before writing another implementation.

#### Keep each capability in a named A4 folder

The proposed template can be copied into an existing repository under `A4`;
you do not need to create a new repository. GitHub's **Use this template**
normally creates a new repository, so download and copy the function folder
when working in an existing one.

For example:

```text
A4/
  capture-windows/
    README.md
    code/
      main.py
    runner.py
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
The README explains its purpose, how to run it, output meanings and limitations.
Each output has a stable identifier, such as `window-areas`, matching the agreed
output. A friendly display label can change without renaming that identifier.
Each run groups the outputs produced together for a particular building model.

The intended scaffolding lets you focus on the analysis function in
`code/main.py`; a supplied runner would manage result files and run records.
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

Share the selected result link with the receiving team and record it alongside
the suggestion. Linking code is not evidence that it ran; sharing a result does
not yet mean another team has used it.

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

### 7. Incorporate it into the receiving team's analysis

After review, the receiving team tries the result as an input to its own code,
dataset or analysis. Check that it relates to the intended building-model version.
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

For example: "We used the window areas to compare glazing options, but need
orientation before interpreting the differences."

An output can pass review without being used yet. An output can also be useful
because it reveals a gap rather than providing a final answer.

## End-of-session check

Be ready to show:

1. Who needed the capability and the agreed output.
2. The code and the selected shared run from an identified building model.
3. The receiving team's review of that specific run and output.
4. If used, where the result contributed and what was learned.

Unfinished work is welcome: explain your current step and what is blocking the
next one. Save canvas changes explicitly with **Save course canvas** or
**Save shared workspace**, as appropriate; moving blocks does not save them to
the shared database.
