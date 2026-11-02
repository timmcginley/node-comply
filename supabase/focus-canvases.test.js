import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { FOCUS_AREAS, focusPayload } from '../src/focus-data.js';
import { makeBlock } from '../src/toolbench-data.js';
import { workspacePayload } from '../src/workspace-store.js';

test('focus canvases and self-service membership enforce database permissions, isolation and conflicts', async t => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const facilitator = '00000000-0000-4000-8000-000000000003';
  const document = focus => focusPayload(focus, {
    toolbenchNodes: [{ ...makeBlock('proposal', 'suggestion', 'Daylight inputs'), category: 'Capture', owner: 'IND-13' }]
  });
  async function role(user, action, name = 'authenticated') {
    await db.exec(`set role ${name}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
    try { return await action(); }
    finally { await db.exec('reset role'); }
  }
  const choose = team => db.query('select public.choose_team($1) as team', [team]);
  const save = (focus, revision, payload = document(focus)) =>
    db.query('select * from public.save_focus_canvas($1, $2, $3::jsonb)', [focus, revision, JSON.stringify(payload)]);
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    for (const file of ['20261026_workspace.sql', '20261102_focus_canvases.sql']) {
      await db.exec(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await db.query('insert into auth.users values ($1),($2),($3)', [alice, bob, facilitator]);
    await db.query('insert into public.facilitators values ($1)', [facilitator]);

    await t.test('database and client share the exact five focus areas', async () => {
      assert.deepEqual((await db.query('select id from public.focus_areas order by id')).rows.map(row => row.id),
        FOCUS_AREAS.map(area => area.id).sort());
    });
    await t.test('anonymous access is denied and unassigned accounts cannot save course canvases', async () => {
      await role(null, async () => {
        for (const table of ['focus_areas', 'focus_canvases', 'focus_canvas_revisions']) {
          await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
        }
        await assert.rejects(choose('ARC-01'), /permission denied/);
        await assert.rejects(save('architecture', 0), /permission denied/);
      }, 'anon');
      await role(alice, () => assert.rejects(save('architecture', 0), /Join a team/));
    });
    await t.test('accounts choose existing teams for themselves without direct membership or facilitator writes', async () => {
      await role(alice, async () => {
        await assert.rejects(choose('UNKNOWN'), /existing team/);
        assert.equal((await choose('ARC-01')).rows[0].team, 'ARC-01');
        await choose('ARC-01');
        assert.deepEqual((await db.query('select * from public.team_memberships')).rows, [{ user_id: alice, team_id: 'ARC-01' }]);
        await assert.rejects(db.query("insert into public.team_memberships values ($1,'STR-20')", [bob]), /permission denied/);
        await assert.rejects(db.query('insert into public.facilitators values ($1)', [alice]), /permission denied/);
      });
    });
    await t.test('any team member saves any course focus and assigns another team; authorship/history are verified', async () => {
      await role(alice, async () => {
        for (const { id } of FOCUS_AREAS) {
          const saved = (await save(id, 0)).rows[0];
          assert.equal(saved.revision, 1);
          assert.equal(saved.updated_by, alice);
          assert.equal(saved.payload.records.toolbenchNodes[0].owner, 'IND-13');
        }
      });
      await role(bob, async () => {
        const read = await db.query('select * from public.focus_canvases');
        assert.equal(read.rows.length, 5);
        assert.equal((await db.query('select * from public.team_memberships')).rows.length, 0);
        await choose('STR-20');
        assert.equal((await save('architecture', 1)).rows[0].updated_by, bob);
      });
      assert.equal((await db.query("select count(*)::int as n from public.focus_canvas_revisions where focus_id='architecture'")).rows[0].n, 2);
    });
    await t.test('switching removes all former memberships and old-team write permission but preserves saved data', async () => {
      await db.query("insert into public.team_memberships values ($1,'MAT-34')", [alice]);
      await role(alice, async () => {
        await choose('IND-13');
        assert.deepEqual((await db.query('select * from public.team_memberships')).rows, [{ user_id: alice, team_id: 'IND-13' }]);
        assert.equal((await db.query("select public.can_edit_workspace('ARC-01') as allowed")).rows[0].allowed, false);
        assert.equal((await db.query("select public.can_edit_workspace('IND-13') as allowed")).rows[0].allowed, true);
        const teamPayload = workspacePayload('ARC-01', {}, { general: null, scoped: null });
        await assert.rejects(db.query('select public.save_workspace($1, 0, $2)', ['ARC-01', teamPayload]), /not allowed/);
        await assert.rejects(choose('UNKNOWN'), /existing team/);
        assert.equal((await db.query('select team_id from public.team_memberships')).rows[0].team_id, 'IND-13');
        assert.equal((await db.query("select revision from public.focus_canvases where focus_id='architecture'")).rows[0].revision, 2);
      });
    });
    await t.test('stale course saves and malformed assignments are rejected without overwriting other focuses', async () => {
      await role(alice, async () => {
        await assert.rejects(save('architecture', 0), /CANVAS_CONFLICT/);
        await assert.rejects(save('architecture', 1), /CANVAS_CONFLICT/);
        await assert.rejects(save('architecture', null), /non-negative/);
        await assert.rejects(save('UNKNOWN', 0, document('build')), /Unknown focus|Invalid focus/);
        for (const mutate of [
          payload => { payload.focusArea = 'build'; },
          payload => { delete payload.records.evidence; },
          payload => { payload.records.toolbenchNodes[0].owner = 'UNKNOWN'; },
          payload => { payload.records.toolbenchNodes[0].category = 'Architecture'; },
          payload => { payload.records.toolbenchNodes[0].title = ''; },
          payload => { payload.records.toolbenchNodes[0].owner = null; },
          payload => { payload.records.toolbenchNodes[0] = null; }
        ]) {
          const payload = document('architecture');
          mutate(payload);
          await assert.rejects(save('architecture', 2, payload), /Invalid|Unknown|Suggestions/);
        }
        const emptyOwner = document('architecture');
        emptyOwner.records.toolbenchNodes[0].owner = '';
        assert.equal((await save('architecture', 2, emptyOwner)).rows[0].revision, 3);
        assert.equal((await db.query("select revision from public.focus_canvases where focus_id='build'")).rows[0].revision, 1);
      });
    });
    await t.test('competing saves create one revision; the database enforces the exact 10 MiB JSON boundary', async () => {
      await role(alice, async () => {
        const results = await Promise.allSettled([save('build', 1), save('build', 1)]);
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
        assert.match(results.find(result => result.status === 'rejected').reason.message, /CANVAS_CONFLICT/);
        const payload = document('build');
        payload.records.toolbenchNodes[0].note = '';
        const base = (await db.query('select octet_length($1::jsonb::text) as bytes', [JSON.stringify(payload)])).rows[0].bytes;
        payload.records.toolbenchNodes[0].note = 'x'.repeat(10485760 - base);
        assert.equal((await save('build', 2, payload)).rows[0].revision, 3);
        payload.records.toolbenchNodes[0].note += 'x';
        await assert.rejects(save('build', 3, payload), /maximum 10 MiB/);
      });
    });
    await t.test('direct writes/history mutation remain denied; facilitators need no student membership', async () => {
      await role(alice, async () => {
        for (const sql of [
          'delete from public.focus_canvases', 'delete from public.focus_canvas_revisions',
          'update public.focus_canvases set revision=99', "insert into public.focus_areas values ('other')"
        ]) await assert.rejects(db.exec(sql), /permission denied/);
      });
      await role(facilitator, async () => {
        assert.equal((await save('materials', 1)).rows[0].updated_by, facilitator);
        await choose('BLD-40');
        assert.equal((await db.query('select * from public.facilitators')).rows.length, 1);
      });
    });
  } finally { await db.close(); }
});
