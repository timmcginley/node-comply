import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { workspacePayload } from '../src/workspace-store.js';

test('PostgreSQL workspace migration enforces private membership, immutable revisions and conflict-checked writes', async t => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const facilitator = '00000000-0000-4000-8000-000000000003';
  const unassigned = '00000000-0000-4000-8000-000000000004';
  const payload = team => workspacePayload(team, { evidence: [{ id: 'archived' }] }, {
    general: '<bpmn>general</bpmn>', scoped: '<bpmn>scoped</bpmn>'
  });
  const migration = await readFile(new URL('./migrations/20261026_workspace.sql', import.meta.url), 'utf8');
  async function role(userId, callback, name = 'authenticated') {
    await db.exec(`set role ${name}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || '']);
    try { return await callback(); }
    finally { await db.exec('reset role'); }
  }
  const save = (team, revision, document = payload(team)) =>
    db.query('select * from public.save_workspace($1, $2, $3::jsonb)', [team, revision, JSON.stringify(document)]);
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.exec(migration);
    await db.query('insert into auth.users values ($1),($2),($3),($4)', [alice, bob, facilitator, unassigned]);
    await db.query("insert into public.team_memberships values ($1,'ARC-01'),($2,'ARC-02')", [alice, bob]);
    await db.query('insert into public.facilitators values ($1)', [facilitator]);

    await t.test('seeded database teams exactly match the public registry', async () => {
      const registry = JSON.parse(await readFile(new URL('../data/teams.json', import.meta.url), 'utf8'));
      const seeded = await db.query('select id from public.teams order by id');
      assert.deepEqual(seeded.rows.map(row => row.id), registry.map(team => team.id).sort());
    });

    await t.test('anonymous sessions cannot read shared data or call the save/access RPCs', async () => {
      await role(null, async () => {
        for (const table of ['teams', 'workspaces', 'workspace_revisions', 'team_memberships', 'facilitators']) {
          await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
        }
        await assert.rejects(save('ARC-01', 0), /permission denied/);
        await assert.rejects(db.query("select public.can_edit_workspace('ARC-01')"), /permission denied/);
      }, 'anon');
    });

    await t.test('students can read only their own membership and cannot escalate their role or edit a foreign team', async () => {
      await role(alice, async () => {
        const memberships = await db.query('select * from public.team_memberships');
        assert.deepEqual(memberships.rows, [{ user_id: alice, team_id: 'ARC-01' }]);
        assert.equal((await db.query('select * from public.facilitators')).rows.length, 0);
        await assert.rejects(db.query('insert into public.facilitators values ($1)', [alice]), /permission denied/);
        await assert.rejects(db.query("insert into public.team_memberships values ($1,'ARC-02')", [alice]), /permission denied/);
        await assert.rejects(save('ARC-02', 0), /not allowed/);
      });
      await role(unassigned, async () => {
        await assert.rejects(save('ARC-01', 0), /not allowed/);
        assert.equal((await db.query('select * from public.teams')).rows.length, 21);
      });
    });

    await t.test('first save atomically stores both diagrams, archived records and authenticated authorship', async () => {
      const document = payload('ARC-01');
      document.updated_by = bob;
      const result = await role(alice, () => save('ARC-01', 0, document));
      const saved = result.rows[0];
      assert.equal(saved.revision, 1);
      assert.equal(saved.updated_by, alice);
      assert.equal(saved.schema_version, 1);
      assert.deepEqual(saved.payload, document);
      const history = await db.query("select * from public.workspace_revisions where team_id='ARC-01'");
      assert.deepEqual(history.rows, [saved]);
    });

    await t.test('all authenticated students can read every shared workspace and revision without seeing another roster', async () => {
      await role(bob, async () => {
        assert.equal((await db.query('select * from public.workspaces')).rows[0].team_id, 'ARC-01');
        assert.equal((await db.query('select * from public.workspace_revisions')).rows[0].updated_by, alice);
        assert.deepEqual((await db.query('select * from public.team_memberships')).rows, [{ user_id: bob, team_id: 'ARC-02' }]);
      });
    });

    await t.test('stale creates and updates cannot overwrite a newer revision or add history', async () => {
      await role(alice, async () => {
        await assert.rejects(save('ARC-01', 0), /WORKSPACE_CONFLICT/);
        const results = await Promise.allSettled([save('ARC-01', 1), save('ARC-01', 1)]);
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
        assert.match(results.find(result => result.status === 'rejected').reason.message, /WORKSPACE_CONFLICT/);
      });
      assert.equal((await db.query("select revision from public.workspaces where team_id='ARC-01'")).rows[0].revision, 2);
      assert.equal((await db.query("select count(*)::int as n from public.workspace_revisions where team_id='ARC-01'")).rows[0].n, 2);
    });

    await t.test('even authorized members cannot bypass the RPC, mutate history, delete workspaces or alter teams', async () => {
      await role(alice, async () => {
        for (const statement of [
          "update public.workspaces set revision=99",
          'delete from public.workspaces',
          'delete from public.workspace_revisions',
          'update public.workspace_revisions set updated_by = auth.uid()',
          "insert into public.teams values ('NEW-01')",
          "insert into public.workspaces select * from public.workspaces"
        ]) await assert.rejects(db.exec(statement), /permission denied/);
      });
    });

    await t.test('facilitators can save any registered team with their own verified authorship', async () => {
      await role(facilitator, async () => {
        const saved = (await save('ARC-02', 0)).rows[0];
        assert.equal(saved.updated_by, facilitator);
        assert.equal(saved.revision, 1);
        assert.equal((await save('ARC-01', 2)).rows[0].revision, 3);
        await assert.rejects(save('NOT-A-TEAM', 0), /Unknown team/);
      });
    });

    await t.test('invalid payloads and revisions are rejected before any current/history mutation', async () => {
      await role(alice, async () => {
        for (const mutate of [
          document => { document.teamId = 'ARC-02'; },
          document => { document.schemaVersion = 2; },
          document => { delete document.records.evidence; },
          document => { document.records.claims = {}; },
          document => { document.diagrams.general = ''; },
          document => { delete document.diagrams.scoped; }
        ]) {
          const document = payload('ARC-01');
          mutate(document);
          await assert.rejects(save('ARC-01', 3, document), /Invalid|invalid|diagram/);
        }
        await assert.rejects(save('ARC-01', -1), /non-negative/);
        await assert.rejects(save('ARC-01', null), /non-negative/);
        const oversized = payload('ARC-01');
        oversized.records.evidence[0].note = 'x'.repeat(10 * 1024 * 1024);
        await assert.rejects(save('ARC-01', 3, oversized), /10 MiB/);
      });
      assert.equal((await db.query("select count(*)::int as n from public.workspace_revisions where team_id='ARC-01'")).rows[0].n, 3);
    });

    await t.test('revoking membership immediately denies subsequent saves', async () => {
      await db.query('delete from public.team_memberships where user_id=$1', [alice]);
      await role(alice, async () => {
        await assert.rejects(save('ARC-01', 3), /not allowed/);
        assert.equal((await db.query('select * from public.workspaces')).rows.length, 2);
      });
    });

    await t.test('database size limit accepts exactly 10 MiB of jsonb text and rejects the next UTF-8 character', async () => {
      const document = payload('MAT-34');
      document.records.evidence[0].note = '';
      const overhead = (await db.query('select octet_length($1::jsonb::text) as n', [JSON.stringify(document)])).rows[0].n;
      document.records.evidence[0].note = 'x'.repeat(10 * 1024 * 1024 - overhead);
      await role(facilitator, async () => {
        assert.equal((await save('MAT-34', 0, document)).rows[0].revision, 1);
        document.records.evidence[0].note += 'é';
        await assert.rejects(save('MAT-34', 1, document), /10 MiB/);
      });
    });
  } finally {
    await db.close();
  }
});
