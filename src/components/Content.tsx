import { useState } from "react";
import DOMPurify from "dompurify";
import Prism from "prismjs";
import "prismjs/components/prism-sql";
import { Check, Copy, Database } from "lucide-react";
import type { DataTable, Note } from "../model";
export function RichText({ html }: { html: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
      }}
    />
  );
}
export function Code({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr(true);
    }
  }
  return (
    <div className="code-block">
      <div className="code-heading">
        <span>
          MYSQL <span className="muted-code">/ solution.sql</span>
        </span>
        <button onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copied" : "Copy SQL"}
        </button>
      </div>
      <pre>
        <code
          dangerouslySetInnerHTML={{
            __html: Prism.highlight(sql, Prism.languages.sql, "sql"),
          }}
        />
      </pre>
      {err && (
        <p className="code-error">
          Copy unavailable. Select the query to copy it manually.
        </p>
      )}
    </div>
  );
}
export function TableView({ table }: { table: DataTable }) {
  return (
    <div className="data-table">
      <div className="table-heading">
        <Database size={15} />
        <strong>{table.name}</strong>
        <span>{table.rows.length} rows</span>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${table.name} table`}
      >
        <table>
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {table.columns.map((_, j) => (
                  <td key={j}>
                    {r[j] || <span className="empty-cell">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function DifficultyBadge({ value }: { value: Note["difficulty"] }) {
  return <span className={`difficulty ${value.toLowerCase()}`}>{value}</span>;
}
export function NoteArticle({
  note,
  preview = false,
}: {
  note: Note;
  preview?: boolean;
}) {
  const sections = [
    ["problem", "The problem"],
    ["data", "Before / sample data"],
    ["approach", "My approach"],
    ["solution", "The SQL solution"],
    ["output", "After / expected output"],
    ["explanation", "Breaking it down"],
    ["takeaways", "Key takeaways"],
    ...(note.alternative ? [["alternative", "Another way"]] : []),
    ...(note.performance ? [["performance", "Performance notes"]] : []),
  ];
  return (
    <>
      <header className="article-header">
        <div className="article-meta">
          <DifficultyBadge value={note.difficulty} />
          <span>MySQL</span>
          {note.isSample && (
            <span className="sample-label">Sample problem</span>
          )}
          {preview && <span className="sample-label">Private preview</span>}
        </div>
        <h1>{note.title || "Untitled problem"}</h1>
        <p>{note.summary}</p>
        <div className="tags">
          {note.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>
      <div className="article-layout">
        <aside className="toc">
          <p className="eyebrow">IN THIS NOTE</p>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          <div className="toc-author">
            <span className="avatar small">SH</span>
            <div>
              <strong>Sahil Ahmed Hashmi</strong>
              <span>Thinking in SQL</span>
            </div>
          </div>
        </aside>
        <article className="article-body">
          <section id="problem">
            <h2>
              <span>01</span>The problem
            </h2>
            <RichText html={note.problem} />
          </section>
          <section id="data">
            <h2>
              <span>02</span>Before / sample data
            </h2>
            {note.before.length ? (
              note.before.map((t) => <TableView key={t.id} table={t} />)
            ) : (
              <p className="muted">No sample tables provided.</p>
            )}
          </section>
          <section id="approach">
            <h2>
              <span>03</span>My approach
            </h2>
            <RichText html={note.approach} />
          </section>
          <section id="solution">
            <h2>
              <span>04</span>The SQL solution
            </h2>
            <Code sql={note.sql} />
          </section>
          <section id="output">
            <h2>
              <span>05</span>After / expected output
            </h2>
            {note.after.length ? (
              note.after.map((t) => <TableView key={t.id} table={t} />)
            ) : (
              <p className="muted">No output table provided.</p>
            )}
          </section>
          <section id="explanation">
            <h2>
              <span>06</span>Breaking it down
            </h2>
            <RichText html={note.explanation} />
          </section>
          <section id="takeaways" className="takeaways">
            <p className="eyebrow">THE TAKEAWAY</p>
            <RichText html={note.takeaways} />
          </section>
          {note.alternative && (
            <section id="alternative">
              <h2>Another way</h2>
              <Code sql={note.alternative} />
            </section>
          )}
          {note.performance && (
            <section id="performance">
              <h2>Performance notes</h2>
              <RichText html={note.performance} />
            </section>
          )}
          <p className="article-end">
            {note.isSample
              ? "This is a demonstration problem, not a claim of original work."
              : "A query note by Sahil Ahmed Hashmi."}
          </p>
        </article>
      </div>
    </>
  );
}
