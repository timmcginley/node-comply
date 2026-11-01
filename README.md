# MasterBPMN

Claim-led building-analysis planning with Design, Team diagrams and Toolbench.

```powershell
npm ci --include=dev
npm test
npm run build
npm start
```

Open `http://localhost:3000`. Express serves the UI and API.

- [Current behaviour and next steps](PROJECT_NOTES.md)
- [Email-code authentication, database setup and pilot checks](supabase/README.md)
- [Changelog](CHANGELOG.md)
- [Standalone student Speckle template](student-template/README.md)

Toolbench now starts with **Capture > Speckle model**: connect Speckle, enter a
project URL, choose a model and exact version, then save the reference. This
block captures a reference, not the model itself.
Choosing a version only stages it: click **Use selected version** to update the
block's applied reference. The inspector confirms the pending selection.
For troubleshooting, the browser console logs `[MasterBPMN Speckle]` events for
version selection (including ignored selections) and application, with reference
IDs and edit/currentness checks only, never authentication tokens or model data.
**Read model properties** also logs unavailable/ignored actions, clicks, request
starts, version-format resolution, completion counts and failures. A started read
without completion or failure is still pending; disabled reads log their input
or editability checks when the IFC inspector opens.
Unsupported-format errors include the returned schema version and reference
format (not the reference contents), so a rejected version can be diagnosed
without copying network responses.
Object-graph reads show each pending page and received/total child-object count
in the inspector and console. A single GraphQL request (including its response
body) has a 20-second timeout, reported explicitly; no partial result is captured.
Large graphs may require many pages even when each request completes normally.

For IFC-class counts, add and wire:
**Speckle model → Load model properties → IFC filter → Count elements → Display value**.
Choose **Read model properties** once in the loader. Its **Model properties**
output can feed several IFC filters, for example one for `IfcWindow` and one
for `IfcSlab`. In each filter, choose the actual property path corresponding to
**Attributes > type** (not Element Type Attributes), enter the exact IFC class,
and choose **Apply IFC filter**. Filtering makes no Speckle request.
In each count block, choose
**Calculate count**, then **Save shared workspace**. Count stays disabled until
the IFC filter has captured a current collection; **Go to IFC filter** takes you
to the required read/capture steps. Errors appear in the inspector as well as
the workspace feedback.

Loaded property tables stay in memory in this browser session only. Refreshing
or changing the app account/workspace clears them, but saved IDs/counts and load
provenance remain. To apply a new filter after refresh, read once again in its
loader. A successful reread or changed model/version invalidates downstream
filters/counts; reapply the filters and recalculate. No raw property tables are
added to shared workspace storage or exports.
Existing combined **Capture: IFC elements** blocks remain usable with their
original direct model input and read/capture controls. They are not converted
automatically. To share one read, add the new loader and filters; their ID outputs
can connect to existing Count blocks after removing the old input wires.

Display value is a read-only text box on the canvas and in its details, with an
editable result label. It accepts one Count output and updates after calculation
without another trigger. Missing/stale data replaces the number with a warning;
a valid zero is displayed as `0`. The displayed value is derived from the saved
Count result rather than stored separately.

This browser-only reader supports both Speckle bundle versions (`schemaVersion: 3`,
`bundle.` reference) and object-graph versions (`schemaVersion: null` or `3`,
32-character content-hash reference). Schema version 3 alone does not imply a
bundle; the reference format determines which supported reader is used.
Bundles use three property tables without geometry; older versions read root JSON
metadata and paginated, projected child properties through the project API.
Both feed the same IFC filter and count unique retained application IDs (using
the instance GlobalId when an older object has no application ID).
Missing data/access is an error, not zero. Changing the source,
class, path or input wire invalidates downstream results. No Python runs and
nothing is published to Speckle. Connect, Check and Compare remain empty.
Category badges and block top accents use the supplied pastel scheme: blue
Capture, red Connect, green Check, purple Calculate/Compare and yellow Communicate.
The canvas remains white and block bodies light grey.

The registered local app uses `http://localhost:3000/speckle/callback`.
Restart Express after rebuilding. Optional `SPECKLE_APP_ID` and
`SPECKLE_REDIRECT_URL` process/Render settings must match your Speckle app
registration; use a production registration/callback for `tools.boxbuild.dk`.
Grant only the read scopes needed for project/model/version metadata and model
artifact reads; a denied artifact read reports the access/scope issue explicitly.
The private model's raw classification path and data access still need live
validation against the registered app. The bundle reader limits each
property file to 32 MiB, objects/paths to 100,000 rows and values to 2,000,000 rows;
older reads use 250-child pages, at most 100,000 objects including the root, and
a 32 MiB root/child JSON budget. Larger models report an error rather than a
partial count. Detached property dictionaries in old graphs are currently
rejected explicitly rather than counted incompletely.
Saved element IDs/results inherit authenticated cross-team workspace visibility,
so use only models approved for sharing with the class.
No Speckle secret or personal access token belongs in configuration or blocks.

Shared saving requires the Supabase migration and facilitator-managed accounts/
memberships. Until that setup is complete, submitted GitHub sources remain
publicly viewable, but shared loading/editing is unavailable.
