import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import {
  Plus,
  LockKeyhole,
  LogOut,
  Eye,
  Save,
  Send,
  X,
  FileText,
  Trash2,
  Pencil,
  ExternalLink,
} from "lucide-react";
import {
  canDemo,
  configured,
  supabase,
  friendlyError,
  listDrafts,
  saveDraft,
  publishDraft,
  deleteDraft,
  unpublishDraft,
} from "./data";
import {
  blankNote,
  slugify,
  validateNote,
  topics,
  type Draft,
  type Note,
} from "./model";
import { DifficultyBadge, NoteArticle } from "./components/Content";
import RichEditor from "./components/RichEditor";
import TableEditor from "./components/TableEditor";
import { useNotes } from "./App";
export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(configured);
  const [allowed, setAllowed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [active, setActive] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { reload } = useNotes();
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !session) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    supabase.rpc("is_note_admin").then(({ data, error }) => {
      if (!cancelled) {
        setAllowed(Boolean(data));
        if (error) setError(error.message);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setDrafts(await listDrafts());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (allowed || demo) void refresh();
  }, [allowed, demo]);
  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        return;
      }
    }
    setDemo(false);
    setActive(null);
    setAllowed(false);
  }
  async function remove(d: Draft) {
    if (
      !window.confirm(
        `Permanently delete “${d.content.title}” and its published version?`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteDraft(d.id);
      await refresh();
      await reload();
      setMessage("Note deleted.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function unpublish(d: Draft) {
    if (!window.confirm("Unpublish this note? The draft will be kept.")) return;
    setBusy(true);
    try {
      await unpublishDraft(d.id);
      await refresh();
      await reload();
      setMessage("Note unpublished. Your draft is kept.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <main className="container empty-state">
        <p>Checking editor access…</p>
      </main>
    );
  if (recovery && session)
    return <PasswordReset onDone={() => setRecovery(false)} />;
  if (!allowed && !demo)
    return (
      <Login
        session={session}
        error={error}
        onSignOut={signOut}
        onDemo={() => {
          setDemo(true);
          setError("");
        }}
      />
    );
  if (active)
    return (
      <NoteEditor
        key={active.id}
        draft={active}
        demo={demo}
        onClose={() => {
          setActive(null);
          void refresh();
        }}
        onPublished={reload}
      />
    );
  return (
    <main className="container admin-page">
      {demo && (
        <div className="demo-banner">
          <strong>Local demo</strong> Changes are stored in this browser only.
          Connect Supabase before deploying.
        </div>
      )}
      <div className="admin-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>
            The editor<span className="brand-period">.</span>
          </h1>
          <p>Work through a problem. Publish when you're ready.</p>
        </div>
        <div className="button-row">
          <button className="button" onClick={() => void signOut()}>
            <LogOut size={16} />
            {demo ? "Leave demo" : "Sign out"}
          </button>
          <button
            className="button primary"
            onClick={() => {
              const content = blankNote();
              setActive({
                id: content.id,
                slug: "",
                content,
                version: 0,
                updated_at: new Date().toISOString(),
                published_at: null,
              });
            }}
          >
            <Plus size={17} />
            New problem
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="workspace-summary">
        <span>
          <strong>{drafts.length}</strong> total notes
        </span>
        <span>
          <strong>{drafts.filter((d) => d.published_at).length}</strong>{" "}
          published
        </span>
        <span>
          <strong>{drafts.filter((d) => !d.published_at).length}</strong> drafts
        </span>
      </div>
      {loading ? (
        <p>Loading your drafts…</p>
      ) : drafts.length ? (
        <div className="draft-list">
          {drafts.map((d) => (
            <div className="draft-row" key={d.id}>
              <div className="draft-icon">
                <FileText size={20} />
              </div>
              <div className="draft-description">
                <h3>{d.content.title || "Untitled problem"}</h3>
                <div>
                  <span
                    className={`status ${d.published_at ? "published" : "draft"}`}
                  >
                    {d.published_at ? "Published" : "Draft"}
                  </span>
                  <DifficultyBadge value={d.content.difficulty} />
                  <span className="muted">
                    Edited {new Date(d.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="draft-actions">
                <button
                  className="button small-button"
                  disabled={busy}
                  onClick={() => setActive(d)}
                >
                  <Pencil size={14} />
                  Edit
                </button>
                {d.published_at && (
                  <>
                    <Link
                      className="icon-button"
                      to={`/notes/${d.slug}`}
                      aria-label={`View ${d.content.title}`}
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void unpublish(d)}
                    >
                      Unpublish
                    </button>
                  </>
                )}
                <button
                  className="icon-button danger"
                  disabled={busy}
                  aria-label={`Delete ${d.content.title}`}
                  onClick={() => void remove(d)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Your first note starts here</h2>
          <p>Click New problem to add a question, tables, and your solution.</p>
        </div>
      )}
    </main>
  );
}
function Login({
  session,
  error,
  onDemo,
  onSignOut,
}: {
  session: Session | null;
  error: string;
  onDemo: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setErr(error.message);
    setBusy(false);
  }
  async function google() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
  }
  async function reset() {
    if (!supabase) return;
    if (!email.trim()) {
      setErr("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (error) setErr(error.message);
    else
      setMessage(
        "If this account exists, a password reset link has been sent.",
      );
    setBusy(false);
  }
  return (
    <main className="login-page container">
      <div className="login-card">
        <span className="login-icon">
          <LockKeyhole size={24} />
        </span>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Back to the notebook.</h1>
        <p>Sign in to write, refine, and publish your SQL notes.</p>
        {session ? (
          <>
            <p className="error" role="alert">
              This account does not have editor access. The owner must be added
              in the database setup.
            </p>
            <button className="button" onClick={() => void onSignOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              className="button google-button"
              disabled={!configured || busy}
              onClick={() => void google()}
            >
              <span className="google-g">G</span>Continue with Google
            </button>
            <div className="or-divider">
              <span>or use email</span>
            </div>
            <form onSubmit={(e) => void login(e)}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={!configured}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  disabled={!configured}
                />
              </label>
              <button className="button primary" disabled={!configured || busy}>
                {busy ? "Please wait…" : "Sign in"}
              </button>
              <button
                type="button"
                className="text-button reset-link"
                disabled={!configured || busy}
                onClick={() => void reset()}
              >
                Forgot password?
              </button>
            </form>
          </>
        )}
        {(err || error) && (
          <p className="error" role="alert">
            {err || error}
          </p>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {!configured && (
          <div className="setup-notice">
            <strong>Authentication isn't connected yet.</strong>
            <p>Follow the included README to connect your Supabase project.</p>
            {canDemo && (
              <button className="button" onClick={onDemo}>
                Try the local editor demo
              </button>
            )}
          </div>
        )}
        <Link className="login-back" to="/">
          Back to the public notebook
        </Link>
      </div>
    </main>
  );
}
function PasswordReset({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="container login-page">
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await supabase!.auth.updateUser({ password });
          if (error) setError(error.message);
          else onDone();
          setBusy(false);
        }}
      >
        <h1>Set a new password</h1>
        <label>
          New password
          <input
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          Update password
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
function NoteEditor({
  draft,
  demo,
  onClose,
  onPublished,
}: {
  draft: Draft;
  demo: boolean;
  onClose: () => void;
  onPublished: () => Promise<void>;
}) {
  const [note, setNote] = useState<Note>(structuredClone(draft.content));
  const [version, setVersion] = useState(draft.version);
  const [stamp, setStamp] = useState(JSON.stringify(draft.content));
  const [published, setPublished] = useState(Boolean(draft.published_at));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [customTag, setCustomTag] = useState("");
  const dirty = stamp !== JSON.stringify(note);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    function guard(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest?.("a");
      if (
        dirty &&
        link?.getAttribute("href")?.startsWith("/") &&
        !window.confirm("Leave without saving your changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty]);
  function patch(p: Partial<Note>) {
    setNote((n) => ({ ...n, ...p }));
    setMessage("");
  }
  function close() {
    if (!dirty || window.confirm("Leave without saving your changes?"))
      onClose();
  }
  async function save(publish = false) {
    setError("");
    setMessage("");
    const content = { ...note, slug: note.slug || slugify(note.title) };
    if (!content.title.trim()) {
      setError("Add a title to save this draft.");
      return;
    }
    if (publish) {
      const validation = validateNote(content);
      if (validation) {
        setError(validation);
        return;
      }
    }
    setBusy(true);
    try {
      let v = version;
      if (dirty || version === 0) {
        const saved = await saveDraft(content, version);
        v = saved.version;
        setVersion(v);
        setNote(content);
        setStamp(JSON.stringify(content));
      }
      if (publish) {
        await publishDraft(content.id, v);
        setPublished(true);
        await onPublished();
        setMessage("Published. Visitors can now see this version.");
      } else setMessage("Draft saved. Your published version has not changed.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const rich = (
    key: "problem" | "approach" | "explanation" | "takeaways" | "performance",
    label: string,
    description?: string,
  ) => (
    <div className="editor-section">
      <div className="field-title">
        <h2>{label}</h2>
        {description && <p>{description}</p>}
      </div>
      <RichEditor
        label={label}
        value={note[key]}
        onChange={(value) => patch({ [key]: value })}
      />
    </div>
  );
  return (
    <main
      className={`container note-editor-page ${preview ? "preview-mode" : ""}`}
    >
      {demo && (
        <div className="demo-banner">
          <strong>Local demo</strong> Saved in this browser only.
        </div>
      )}
      <div className="editor-actionbar">
        <button className="text-button" disabled={busy} onClick={close}>
          <X size={16} />
          Close editor
        </button>
        <span className="save-status">
          {dirty ? "Unsaved changes" : version ? "Draft saved" : "New draft"}
        </span>
        <div className="button-row">
          <button className="button" onClick={() => setPreview(!preview)}>
            <Eye size={16} />
            {preview ? "Back to editing" : "Preview"}
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => void save()}
          >
            <Save size={16} />
            Save draft
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void save(true)}
          >
            <Send size={16} />
            {busy
              ? "Working…"
              : published
                ? "Update published post"
                : "Publish"}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {preview ? (
        <>
          <div className="preview-banner">
            Private preview · Only publishing makes this version public.
          </div>
          <NoteArticle note={note} preview />
        </>
      ) : (
        <div className="editor-layout">
          <div className="editor-main">
            <div className="editor-title">
              <p className="eyebrow">
                {published ? "REFINE YOUR NOTE" : "A NEW QUERY NOTE"}
              </p>
              <input
                className="title-input"
                aria-label="Problem title"
                value={note.title}
                placeholder="Give your problem a title…"
                onChange={(e) =>
                  patch({
                    title: e.target.value,
                    ...(!version && note.slug === slugify(note.title)
                      ? { slug: slugify(e.target.value) }
                      : {}),
                  })
                }
              />
              <label>
                Short summary
                <textarea
                  rows={2}
                  value={note.summary}
                  onChange={(e) => patch({ summary: e.target.value })}
                  placeholder="A short introduction for the notebook card."
                />
              </label>
            </div>
            {rich(
              "problem",
              "The problem",
              "Describe the question, constraints, and what the query should return.",
            )}
            <div className="editor-section">
              <h2>Before / sample data</h2>
              <p className="muted">
                Add the input tables. You can paste rows from Excel or CSV.
              </p>
              <TableEditor
                tables={note.before}
                onChange={(before) => patch({ before })}
                label="Before"
              />
            </div>
            {rich(
              "approach",
              "My approach",
              "Explain your thinking before getting into the query.",
            )}
            <div className="editor-section">
              <h2>The SQL solution</h2>
              <p className="muted">
                MySQL · Your code is displayed with syntax highlighting.
              </p>
              <textarea
                className="sql-editor"
                aria-label="SQL solution"
                spellCheck={false}
                rows={12}
                value={note.sql}
                onChange={(e) => patch({ sql: e.target.value })}
                placeholder="SELECT ..."
              />
            </div>
            <div className="editor-section">
              <h2>After / expected output</h2>
              <p className="muted">
                Show the result your solution should produce.
              </p>
              <TableEditor
                tables={note.after}
                onChange={(after) => patch({ after })}
                label="After"
              />
            </div>
            {rich(
              "explanation",
              "Breaking it down",
              "Walk through the solution step by step.",
            )}
            {rich("takeaways", "Key takeaways")}
            <details className="editor-section optional-section">
              <summary>Optional: alternative solution</summary>
              <textarea
                className="sql-editor"
                aria-label="Alternative SQL solution"
                spellCheck={false}
                rows={7}
                value={note.alternative}
                onChange={(e) => patch({ alternative: e.target.value })}
                placeholder="Another SQL approach…"
              />
            </details>
            <details className="editor-section optional-section">
              <summary>Optional: performance notes</summary>
              <RichEditor
                label="Performance notes"
                value={note.performance}
                onChange={(performance) => patch({ performance })}
              />
            </details>
          </div>
          <aside className="editor-sidebar">
            <h2>Note settings</h2>
            <label>
              Difficulty
              <select
                value={note.difficulty}
                onChange={(e) =>
                  patch({ difficulty: e.target.value as Note["difficulty"] })
                }
              >
                <option>Easy</option>
                <option>Moderate</option>
                <option>Hard</option>
              </select>
            </label>
            <label>
              URL slug
              <input
                value={note.slug}
                onChange={(e) => patch({ slug: e.target.value })}
                placeholder="your-problem-title"
              />
            </label>
            <p className="field-help">
              /notes/{note.slug || "your-problem-title"}
            </p>
            <div className="tag-settings">
              <h3>SQL topics</h3>
              <div className="tag-options">
                {[...new Set([...topics, ...note.tags])].map((t) => (
                  <button
                    className={note.tags.includes(t) ? "selected" : ""}
                    aria-pressed={note.tags.includes(t)}
                    key={t}
                    onClick={() =>
                      patch({
                        tags: note.tags.includes(t)
                          ? note.tags.filter((x) => x !== t)
                          : [...note.tags, t],
                      })
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="custom-tag">
                <input
                  aria-label="Custom SQL topic"
                  placeholder="Add your own topic"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (customTag.trim())
                        patch({
                          tags: [...new Set([...note.tags, customTag.trim()])],
                        });
                      setCustomTag("");
                    }
                  }}
                />
                <button
                  aria-label="Add topic"
                  className="icon-button"
                  onClick={() => {
                    if (customTag.trim())
                      patch({
                        tags: [...new Set([...note.tags, customTag.trim()])],
                      });
                    setCustomTag("");
                  }}
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={note.isSample}
                onChange={(e) => patch({ isSample: e.target.checked })}
              />
              Label as sample problem
            </label>
            <div className="publishing-note">
              <LockKeyhole size={17} />
              <p>
                {published
                  ? "Saved edits stay private until you update the published post."
                  : "Drafts and previews are private. Publish when your solution is ready."}
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
