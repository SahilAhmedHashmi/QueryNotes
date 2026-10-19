import { createClient } from "@supabase/supabase-js";
import samples from "./samples.json";
import type { Draft, Note, Published } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(
  url && key && !url.includes("your-project") && !key.startsWith("your-"),
);
export const supabase = configured ? createClient(url, key) : null;
export const canDemo =
  !configured &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const storeKey = "query-notes-local-demo-v1";
type DemoStore = { drafts: Draft[]; published: Published[] };
const initial = (): DemoStore => ({
  drafts: (samples as Note[]).map((content, i) => ({
    id: content.id,
    slug: content.slug,
    content,
    version: 1,
    updated_at: `2026-01-0${3 - i}T10:00:00Z`,
    published_at: `2026-01-0${3 - i}T10:00:00Z`,
  })),
  published: (samples as Note[]).map((content, i) => ({
    id: content.id,
    slug: content.slug,
    content,
    published_at: `2026-01-0${3 - i}T10:00:00Z`,
    updated_at: `2026-01-0${3 - i}T10:00:00Z`,
  })),
});
function demoStore(): DemoStore {
  try {
    const raw = localStorage.getItem(storeKey);
    return raw ? JSON.parse(raw) : initial();
  } catch {
    return initial();
  }
}
function writeDemo(s: DemoStore) {
  if (!canDemo) throw Error("The local demo is available only on localhost.");
  localStorage.setItem(storeKey, JSON.stringify(s));
}
export async function listPublished(): Promise<Published[]> {
  if (!supabase)
    return (canDemo ? demoStore() : initial()).published.sort((a, b) =>
      b.published_at.localeCompare(a.published_at),
    );
  const { data, error } = await supabase
    .from("published_notes")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function listDrafts(): Promise<Draft[]> {
  if (!supabase) {
    if (!canDemo) throw Error("Connect Supabase to use the private editor.");
    return demoStore().drafts.sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function saveDraft(
  content: Note,
  expectedVersion: number,
): Promise<Draft> {
  if (!supabase) {
    const s = demoStore();
    const old = s.drafts.find((d) => d.id === content.id);
    if ((old?.version ?? 0) !== expectedVersion)
      throw Error("This draft changed in another tab. Reload before saving.");
    if (s.drafts.some((d) => d.id !== content.id && d.slug === content.slug))
      throw Error("That URL slug is already used.");
    const draft: Draft = {
      id: content.id,
      slug: content.slug,
      content: structuredClone(content),
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
      published_at: old?.published_at ?? null,
    };
    s.drafts = s.drafts.filter((d) => d.id !== content.id).concat(draft);
    writeDemo(s);
    return draft;
  }
  const { data, error } = await supabase.rpc("save_note_draft", {
    note_id: content.id,
    note_slug: content.slug,
    note_content: content,
    expected_version: expectedVersion,
  });
  if (error) throw error;
  return data as Draft;
}
export async function publishDraft(id: string, version: number): Promise<void> {
  if (!supabase) {
    const s = demoStore();
    const d = s.drafts.find((d) => d.id === id);
    if (!d || d.version !== version)
      throw Error("Draft changed. Reload before publishing.");
    const now = new Date().toISOString();
    const old = s.published.find((p) => p.id === id);
    s.published = s.published
      .filter((p) => p.id !== id)
      .concat({
        id,
        slug: d.slug,
        content: structuredClone(d.content),
        published_at: old?.published_at ?? now,
        updated_at: now,
      });
    d.published_at = now;
    writeDemo(s);
    return;
  }
  const { error } = await supabase.rpc("publish_note", {
    note_id: id,
    expected_version: version,
  });
  if (error) throw error;
}
export async function unpublishDraft(id: string): Promise<void> {
  if (!supabase) {
    const s = demoStore();
    s.published = s.published.filter((p) => p.id !== id);
    const d = s.drafts.find((x) => x.id === id);
    if (d) d.published_at = null;
    writeDemo(s);
    return;
  }
  const { error } = await supabase.rpc("unpublish_note", { note_id: id });
  if (error) throw error;
}
export async function deleteDraft(id: string): Promise<void> {
  if (!supabase) {
    const s = demoStore();
    s.published = s.published.filter((p) => p.id !== id);
    s.drafts = s.drafts.filter((p) => p.id !== id);
    writeDemo(s);
    return;
  }
  const { error } = await supabase.from("drafts").delete().eq("id", id);
  if (error) throw error;
}
export function friendlyError(e: unknown) {
  const msg =
    e && typeof e === "object" && "message" in e
      ? String(e.message)
      : "Something went wrong. Please try again.";
  if (msg.includes("duplicate key"))
    return "That URL slug is already used. Choose another one.";
  return msg;
}
