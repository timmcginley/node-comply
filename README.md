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

Shared saving requires the Supabase migration and facilitator-managed accounts/
memberships. Until that setup is complete, submitted GitHub sources remain
publicly viewable, but shared loading/editing is unavailable.
