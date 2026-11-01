import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseConfig } from './supabase-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const teamsPath = path.join(__dirname, 'data', 'teams.json');
const designCache = new Map();

app.use(express.json({ limit: '2mb' }));

async function getTeams() {
  return JSON.parse(await fs.readFile(teamsPath, 'utf8'));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'MasterBPMN' }));
app.get('/api/speckle/config', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({
    serverUrl: 'https://app.speckle.systems',
    appId: process.env.SPECKLE_APP_ID || 'bc5cdc2972',
    redirectUrl: process.env.SPECKLE_REDIRECT_URL || 'http://localhost:3000/speckle/callback'
  });
});
app.get('/api/config', (_req, res) => {
  const url = process.env.SUPABASE_URL || supabaseConfig.url;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || supabaseConfig.publishableKey;
  if (!publishableKey.startsWith('sb_publishable_')) {
    return res.status(500).json({ error: 'SUPABASE_PUBLISHABLE_KEY must be a public sb_publishable_ key, not a secret key.' });
  }
  res.set('Cache-Control', 'no-store').json({ url, publishableKey });
});
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

app.get('/api/design/:teamId', async (req, res) => {
  const teams = await getTeams().catch(error => {
    console.error(error);
    res.status(500).json({ error: 'Unable to load team registry.' });
  });
  if (!teams) return;

  const team = teams.find(item => item.id === req.params.teamId);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const cached = designCache.get(team.id);
  if (cached && req.query.refresh !== '1') return res.json({ ...cached, cached: true });

  try {
    const repository = new URL(team.repositoryUrl);
    if (repository.hostname !== 'github.com') {
      return res.status(422).json({ error: 'The configured repository is not hosted on GitHub.' });
    }
    const [owner, repoName] = repository.pathname.split('/').filter(Boolean);
    if (!owner || !repoName) return res.status(422).json({ error: 'The configured repository URL is incomplete.' });
    const repoPath = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName.replace(/\.git$/, ''))}`;
    const headers = { 'User-Agent': 'MasterBPMN/0.1', Accept: 'application/vnd.github+json' };

    const repositoryResponse = await fetch(repoPath, { headers });
    if (!repositoryResponse.ok) {
      return res.status(502).json({ error: `Unable to inspect repository (${repositoryResponse.status}).` });
    }
    const repositoryInfo = await repositoryResponse.json();
    const branch = repositoryInfo.default_branch;
    if (!branch) return res.status(502).json({ error: 'GitHub did not report a default branch for this repository.' });

    const treeResponse = await fetch(`${repoPath}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers });
    if (!treeResponse.ok) return res.status(502).json({ error: `Unable to search repository files (${treeResponse.status}).` });
    const tree = await treeResponse.json();
    const readmes = (tree.tree || []).filter(file => {
      const isMarkdown = /\.md(?:own)?$/i.test(file.path);
      const isA2Document = /(^|\/)a2(\/|$)/i.test(file.path) && isMarkdown;
      return file.type === 'blob' &&
        (/(^|\/)readme(?:\.[^/]*)?$/i.test(file.path) || isA2Document);
    });
    readmes.sort((left, right) => {
      const score = file => {
        const path = file.path.toLowerCase();
        const name = path.split('/').pop();
        return (/(^|\/)a2(\/|$)/.test(path) ? 50 : 0) +
          (/^readme(?:\.[^/]*)?$/.test(name) ? 30 : 0) +
          (/^(a2|assignment|submission|answers?)([-_ ].*)?\.md$/.test(name) ? 10 : 0);
      };
      return score(right) - score(left) || left.path.length - right.path.length;
    });
    if (!readmes.length) return res.status(404).json({ error: 'No README file was found in this repository.' });

    const contentPath = readmes[0].path.split('/').map(encodeURIComponent).join('/');
    const contentResponse = await fetch(`${repoPath}/contents/${contentPath}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!contentResponse.ok) return res.status(502).json({ error: `Unable to load ${readmes[0].path} (${contentResponse.status}).` });
    const file = await contentResponse.json();
    if (file.encoding !== 'base64' || typeof file.content !== 'string') {
      return res.status(502).json({ error: `GitHub returned an unsupported format for ${readmes[0].path}.` });
    }
    const result = {
      path: readmes[0].path,
      branch,
      markdown: Buffer.from(file.content, 'base64').toString('utf8')
    };
    designCache.set(team.id, result);
    res.json({ ...result, cached: false });
  } catch (error) {
    console.error(`Unable to load README for ${team.id}:`, error);
    res.status(502).json({ error: `Unable to load README: ${error.message}` });
  }
});

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'MasterBPMN server error.' });
});

app.listen(PORT, () => console.log(`MasterBPMN listening on ${PORT}`));
