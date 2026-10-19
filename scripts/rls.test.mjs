import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const visitor = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const samples = JSON.parse(
  readFileSync(new URL("../src/samples.json", import.meta.url), "utf8"),
);
test("Database authorization, private edits, version conflicts and publish lifecycle", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${admin}'),('${visitor}');`,
    );
    await db.exec(
      readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    );
    await db.exec(`insert into public.note_admins values('${admin}');`);
    await db.exec(`set role anon;`);
    assert.equal(
      (await db.query("select count(*)::int as n from published_notes")).rows[0]
        .n,
      0,
    );
    await assert.rejects(
      () => db.query("select * from drafts"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("insert into note_admins values($1)", [visitor]),
      /permission denied/,
    );
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${visitor}',false);`,
    );
    assert.equal(
      (await db.query("select is_note_admin() as ok")).rows[0].ok,
      false,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from drafts")).rows[0].n,
      0,
    );
    const n = structuredClone(samples[0]);
    await assert.rejects(
      () => db.query("select save_note_draft($1,$2,$3,0)", [n.id, n.slug, n]),
      /Editor access required/,
    );
    await assert.rejects(
      () =>
        db.query("insert into drafts(id,slug,content) values($1,$2,$3)", [
          n.id,
          n.slug,
          n,
        ]),
      /row-level security/,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false);`,
    );
    assert.equal(
      (await db.query("select is_note_admin() as ok")).rows[0].ok,
      true,
    );
    const saved = (
      await db.query("select save_note_draft($1,$2,$3,0) as d", [
        n.id,
        n.slug,
        n,
      ])
    ).rows[0].d;
    assert.equal(saved.version, 1);
    await db.query("select publish_note($1,1)", [n.id]);
    const originalPublished = (
      await db.query("select published_at from published_notes where id=$1", [
        n.id,
      ])
    ).rows[0].published_at;
    n.title = "Private edited title";
    await db.query("select save_note_draft($1,$2,$3,1)", [n.id, n.slug, n]);
    assert.equal(
      (
        await db.query(
          "select content->>'title' as title from published_notes where id=$1",
          [n.id],
        )
      ).rows[0].title,
      samples[0].title,
    );
    await assert.rejects(
      () => db.query("select save_note_draft($1,$2,$3,1)", [n.id, n.slug, n]),
      /changed in another tab/,
    );
    await assert.rejects(
      () => db.query("select publish_note($1,1)", [n.id]),
      /changed or deleted/,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${visitor}',false);`,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from drafts")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select content->>'title' as title from published_notes"))
        .rows[0].title,
      samples[0].title,
    );
    await assert.rejects(
      () => db.query("select publish_note($1,2)", [n.id]),
      /Editor access required/,
    );
    await assert.rejects(
      () =>
        db.query(
          "insert into published_notes(id,slug,content) values($1,$2,$3)",
          [n.id, n.slug, n],
        ),
      /row-level security/,
    );
    assert.equal(
      (await db.query("delete from drafts where id=$1 returning id", [n.id]))
        .rows.length,
      0,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false);`,
    );
    await db.query("select publish_note($1,2)", [n.id]);
    const after = (
      await db.query("select * from published_notes where id=$1", [n.id])
    ).rows[0];
    assert.equal(after.content.title, n.title);
    assert.equal(String(after.published_at), String(originalPublished));
    await db.query("select unpublish_note($1)", [n.id]);
    assert.equal(
      (await db.query("select count(*)::int as n from published_notes")).rows[0]
        .n,
      0,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from drafts")).rows[0].n,
      1,
    );
    await db.query("select publish_note($1,2)", [n.id]);
    await db.query("delete from drafts where id=$1", [n.id]);
    assert.equal(
      (await db.query("select count(*)::int as n from published_notes")).rows[0]
        .n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("Sample seed runs without exposing unsaved edits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$ select null::uuid $$;`,
    );
    await db.exec(
      readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    );
    await db.exec(
      readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    await db.exec(
      readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    assert.equal(
      (await db.query("select count(*)::int as n from published_notes")).rows[0]
        .n,
      3,
    );
  } finally {
    await db.close();
  }
});
