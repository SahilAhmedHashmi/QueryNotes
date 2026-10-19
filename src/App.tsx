import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  Braces,
  Search,
  Sun,
  Moon,
  Mail,
  SlidersHorizontal,
  X,
  BookOpen,
  Code2,
  Database,
  ExternalLink,
} from "lucide-react";
import { listPublished, friendlyError } from "./data";
import type { Published } from "./model";
import { DifficultyBadge, NoteArticle } from "./components/Content";
const Admin = lazy(() => import("./Admin"));
const contactEmail = "sahilhashmi2450@gmail.com";
const NotesContext = createContext<{
  notes: Published[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}>({ notes: [], loading: true, error: "", reload: async () => {} });
export const useNotes = () => useContext(NotesContext);
function ScrollReset() {
  const loc = useLocation();
  useEffect(() => {
    if (!loc.hash) window.scrollTo(0, 0);
  }, [loc.pathname]);
  return null;
}
function ContactButton({ className }: { className: string }) {
  const [status, setStatus] = useState("Get in touch");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setStatus("Email copied");
    } catch {
      setStatus("Couldn't copy email");
    }
  }
  return (
    <button
      className={className}
      type="button"
      title="Copy email address"
      onClick={copyEmail}
    >
      <Mail size={17} />
      <span aria-live="polite">{status}</span>
    </button>
  );
}
function Header() {
  const [dark, setDark] = useState(() => {
    try {
      return (
        localStorage.getItem("query-notes-theme") === "dark" ||
        (!localStorage.getItem("query-notes-theme") &&
          matchMedia("(prefers-color-scheme: dark)").matches)
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("query-notes-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Braces size={23} />
          </span>
          query notes<span className="brand-period">.</span>
        </Link>
        <nav>
          <NavLink to="/" end>
            Notes
          </NavLink>
          <NavLink to="/about">About</NavLink>
          <ContactButton className="contact-nav" />
        </nav>
        <button
          className="theme-button"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
function Home() {
  const { notes, loading, error, reload } = useNotes();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All levels");
  const [topic, setTopic] = useState("All topics");
  const tags = [...new Set(notes.flatMap((n) => n.content.tags))].sort();
  const filtered = notes.filter(
    ({ content: n }) =>
      (difficulty === "All levels" || n.difficulty === difficulty) &&
      (topic === "All topics" || n.tags.includes(topic)) &&
      `${n.title} ${n.summary} ${n.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const active = query || difficulty !== "All levels" || topic !== "All topics";
  return (
    <main className="container">
      <section className="home-intro">
        <div className="intro-main">
          <div className="eyebrow intro-eyebrow">
            <span className="mini-rule" />A SQL PROBLEM-SOLVING JOURNAL
          </div>
          <h1>
            Every query has
            <br />a <span>thought process.</span>
          </h1>
          <p>
            Problems, solutions, and the thinking in between.
            <br className="desktop-break" /> Exploring data, one MySQL query at
            a time.
          </p>
          <div className="intro-bottom">
            <span>
              <Code2 size={16} />
              MySQL
            </span>
            <span>
              <BookOpen size={16} />
              Solutions explained
            </span>
            <span>
              <Database size={16} />
              Before & after data
            </span>
          </div>
        </div>
        <aside className="profile-card">
          <div className="profile-top">
            <span className="avatar">SH</span>
            <span className="profile-kicker">
              THE PERSON BEHIND
              <br />
              THE QUERIES
            </span>
          </div>
          <h2>Sahil Ahmed Hashmi</h2>
          <p>Data analyst · Guwahati, India</p>
          <p className="profile-description">
            Making sense of data with SQL, Python, and a curious mind.
          </p>
          <Link to="/about">
            A little about me
            <ExternalLink size={14} />
          </Link>
        </aside>
      </section>
      <section className="notes-section">
        <div className="section-heading">
          <div>
            <h2>
              The notebook
              <span>
                {loading ? "—" : notes.length.toString().padStart(2, "0")}
              </span>
            </h2>
            <p>A closer look at how I solve SQL problems.</p>
          </div>
          <span className="sort-label">Newest published first</span>
        </div>
        <div className="filters">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Search problems"
              placeholder="Search problems or topics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </div>
          <SlidersHorizontal size={17} className="filter-icon" />
          <label className="sr-only" htmlFor="difficulty">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>All levels</option>
            <option>Easy</option>
            <option>Moderate</option>
            <option>Hard</option>
          </select>
          <label className="sr-only" htmlFor="topic">
            Topic
          </label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option>All topics</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="empty-state">Opening the notebook…</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Couldn't load the notes</h3>
            <p>{error}</p>
            <button className="button" onClick={() => void reload()}>
              Try again
            </button>
          </div>
        ) : filtered.length ? (
          <div className="note-grid">
            {filtered.map(({ content: n }, i) => (
              <Link className="note-card" key={n.id} to={`/notes/${n.slug}`}>
                <div className="note-card-top">
                  <span className="note-number">
                    NOTE{" "}
                    {String(notes.findIndex((p) => p.id === n.id) + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>
                  <DifficultyBadge value={n.difficulty} />
                </div>
                <div className="note-card-icon">
                  <Braces size={23} />
                </div>
                <h3>{n.title}</h3>
                <p>{n.summary}</p>
                <div className="tags">
                  {n.tags.slice(0, 3).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="note-card-bottom">
                  <span>{n.isSample ? "SAMPLE PROBLEM" : "MYSQL NOTE"}</span>
                  <span>
                    Read the solution
                    <ExternalLink size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>{notes.length ? "No matching notes" : "A fresh notebook"}</h3>
            <p>
              {notes.length
                ? "Try another keyword or clear the filters."
                : "SQL problems will appear here when they are published."}
            </p>
            {active && (
              <button
                className="button"
                onClick={() => {
                  setQuery("");
                  setDifficulty("All levels");
                  setTopic("All topics");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="notebook-footnote">
          <span>
            {filtered.length} {filtered.length === 1 ? "note" : "notes"}{" "}
            {active ? "matching your filters" : "in the notebook"}
          </span>
          {notes.some((n) => n.content.isSample) && (
            <span>Sample problems demonstrate the format.</span>
          )}
        </div>
      </section>
    </main>
  );
}
function NotePage() {
  const { slug } = useParams();
  const { notes, loading, error } = useNotes();
  const note = notes.find((n) => n.slug === slug);
  useEffect(() => {
    document.title = note
      ? `${note.content.title} — Query Notes`
      : "Query Notes";
    return () => {
      document.title = "Query Notes — Sahil Ahmed Hashmi";
    };
  }, [note]);
  return (
    <main className="container article-container">
      <Link className="breadcrumb" to="/">
        Notebook / <span>{note?.content.title || "Note"}</span>
      </Link>
      {loading ? (
        <p>Loading note…</p>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : note ? (
        <NoteArticle note={note.content} />
      ) : (
        <div className="empty-state">
          <h1>Note not found</h1>
          <p>This note may have been unpublished or its link changed.</p>
          <Link className="button" to="/">
            Back to notebook
          </Link>
        </div>
      )}
    </main>
  );
}
function About() {
  return (
    <main className="container about-page">
      <p className="eyebrow">BEHIND THE NOTEBOOK</p>
      <div className="about-layout">
        <div>
          <span className="avatar large">SH</span>
          <h1>
            Sahil Ahmed
            <br />
            Hashmi<span className="brand-period">.</span>
          </h1>
          <p className="about-lead">
            Data analyst. Curious problem solver.
            <br />
            Based in Guwahati, India.
          </p>
          <ContactButton className="button primary" />
        </div>
        <div className="about-copy">
          <h2>
            Good answers start
            <br />
            with better questions.
          </h2>
          <p>
            I work with SQL, Python, and Excel to clean data, analyse workforce
            and payroll trends, and build practical reporting tools.
          </p>
          <p>
            My background combines a Master's in Computer Application with a
            Bachelor's in Physics. I enjoy the process of turning a messy
            dataset into something clear and useful.
          </p>
          <p>
            Query Notes is a place to share that process: the problem, the
            approach, the query, and what I learned along the way.
          </p>
          <div className="about-skills">
            <span>SQL</span>
            <span>Python</span>
            <span>Excel</span>
            <span>Power BI</span>
            <span>Data analysis</span>
          </div>
          <div className="about-contact">
            <p className="eyebrow">LET'S TALK DATA</p>
            <span>{contactEmail}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
function Footer() {
  return (
    <footer className="site-footer container">
      <div>
        <Link to="/" className="footer-brand">
          query notes.
        </Link>
        <span>Thoughtfully queried. Clearly explained.</span>
      </div>
      <div>
        <span>© {new Date().getFullYear()} Sahil Ahmed Hashmi</span>
        <Link to="/admin">Editor</Link>
      </div>
    </footer>
  );
}
export default function App() {
  const [notes, setNotes] = useState<Published[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setNotes(await listPublished());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <BrowserRouter>
      <NotesContext.Provider value={{ notes, loading, error, reload }}>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <ScrollReset />
        <Header />
        <div id="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notes/:slug" element={<NotePage />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/admin/*"
              element={
                <Suspense
                  fallback={
                    <main className="container empty-state">
                      Opening the editor…
                    </main>
                  }
                >
                  <Admin />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <main className="container empty-state">
                  <h1>Page not found</h1>
                  <Link className="button" to="/">
                    Back to notebook
                  </Link>
                </main>
              }
            />
          </Routes>
        </div>
        <Footer />
      </NotesContext.Provider>
    </BrowserRouter>
  );
}
