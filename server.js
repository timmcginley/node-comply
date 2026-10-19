import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const teamsPath = path.join(__dirname, 'data', 'teams.json');

app.use(express.json({ limit: '2mb' }));

async function getTeams() {
  return JSON.parse(await fs.readFile(teamsPath, 'utf8'));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'MasterBPMN' }));
app.get('/api/teams', async (_req, res, next) => {
  try { res.json(await getTeams()); } catch (error) { next(error); }
});

app.get('/api/diagram/:teamId/:kind', async (req, res, next) => {
  try {
    const { teamId, kind } = req.params;
    if (!['general', 'scoped'].includes(kind)) return res.status(400).json({ error: 'Unknown diagram kind.' });
    const teams = await getTeams();
    const team = teams.find(item => item.id === teamId);
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    const diagram = team.diagrams?.[kind];
    if (!diagram?.url || diagram.format !== 'bpmn') {
      return res.status(422).json({ error: diagram?.status || 'No editable BPMN is configured.' });
    }
    const response = await fetch(diagram.url, { headers: { 'User-Agent': 'MasterBPMN/0.1' } });
    if (!response.ok) return res.status(502).json({ error: `Source returned ${response.status}.` });
    const xml = await response.text();
    if (!xml.includes('<')) return res.status(502).json({ error: 'Source did not return XML.' });
    res.type('application/xml').send(xml);
  } catch (error) { next(error); }
});

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'MasterBPMN server error.' });
});

app.listen(PORT, () => console.log(`MasterBPMN listening on ${PORT}`));
