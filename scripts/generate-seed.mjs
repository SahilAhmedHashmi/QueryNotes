import { readFileSync, writeFileSync } from "node:fs";
const samples = JSON.parse(
  readFileSync(new URL("../src/samples.json", import.meta.url), "utf8"),
);
const lines = [
  "-- Optional demo seed. Run AFTER schema.sql in the Supabase SQL Editor.",
  "-- Samples are clearly labelled. Existing drafts are never overwritten.",
  "begin;",
];
for (let i = 0; i < samples.length; i++) {
  const n = samples[i];
  const date = `2026-01-0${3 - i}T10:00:00Z`;
  const content = JSON.stringify(n).replaceAll("'", "''");
  lines.push(
    `insert into public.drafts(id,slug,content,version,updated_at,published_at) values ('${n.id}','${n.slug}','${content}'::jsonb,1,'${date}','${date}') on conflict do nothing;`,
  );
  lines.push(
    `insert into public.published_notes(id,slug,content,published_at,updated_at) select id,slug,content,'${date}','${date}' from public.drafts where id='${n.id}' and version=1 on conflict do nothing;`,
  );
}
lines.push("commit;");
writeFileSync(
  new URL("../supabase/seed.sql", import.meta.url),
  lines.join("\n") + "\n",
);
console.log("Generated supabase/seed.sql");
