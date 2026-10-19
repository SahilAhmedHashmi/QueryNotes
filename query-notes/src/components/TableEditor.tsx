import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { Plus, Trash2, ClipboardPaste } from "lucide-react";
import type { DataTable } from "../model";
export default function TableEditor({
  tables,
  onChange,
  label,
}: {
  tables: DataTable[];
  onChange: (t: DataTable[]) => void;
  label: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!importId) return;
    function trap(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setImportId(null);
        return;
      }
      if (e.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button,textarea,input,[tabindex="0"]',
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [importId]);
  function update(id: string, patch: Partial<DataTable>) {
    onChange(tables.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function importData() {
    if (!paste.trim()) {
      setError("Paste a header row and at least one data row.");
      return;
    }
    const result = Papa.parse<string[]>(
      paste.replace(/^[\r\n]+|[\r\n]+$/g, ""),
      { skipEmptyLines: true },
    );
    // A one-column table has no delimiter; PapaParse's guess warning is benign.
    const errors = result.errors.filter(
      (error) => error.code !== "UndetectableDelimiter",
    );
    if (errors.length) {
      setError(errors[0].message);
      return;
    }
    const [columns, ...rows] = result.data;
    if (!columns?.length || !rows.length) {
      setError("Include column names in the first row, then your data.");
      return;
    }
    if (rows.some((r) => r.length !== columns.length)) {
      setError("Every row must have the same number of cells as the header.");
      return;
    }
    update(importId!, { columns, rows });
    setImportId(null);
    setPaste("");
    setError("");
  }
  return (
    <div className="table-editor-group">
      {tables.map((t) => (
        <div className="table-editor" key={t.id}>
          <div className="table-editor-top">
            <label>
              Table name
              <input
                aria-label={`${label} table name`}
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="button small-button"
              onClick={() => {
                setImportId(t.id);
                setPaste("");
                setError("");
              }}
            >
              <ClipboardPaste size={15} />
              Paste data
            </button>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove ${t.name} table`}
              onClick={() => {
                if (window.confirm(`Remove table ${t.name}?`))
                  onChange(tables.filter((x) => x.id !== t.id));
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {t.columns.map((c, j) => (
                    <th key={j}>
                      <div className="column-input">
                        <input
                          aria-label={`${t.name} column ${j + 1}`}
                          value={c}
                          onChange={(e) =>
                            update(t.id, {
                              columns: t.columns.map((x, k) =>
                                k === j ? e.target.value : x,
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          disabled={t.columns.length === 1}
                          aria-label={`Remove column ${j + 1}`}
                          onClick={() =>
                            update(t.id, {
                              columns: t.columns.filter((_, k) => k !== j),
                              rows: t.rows.map((r) =>
                                r.filter((_, k) => k !== j),
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={i}>
                    {t.columns.map((_, j) => (
                      <td key={j}>
                        <input
                          aria-label={`${t.name} row ${i + 1} column ${j + 1}`}
                          value={r[j] ?? ""}
                          onChange={(e) =>
                            update(t.id, {
                              rows: t.rows.map((x, k) =>
                                k === i
                                  ? x.map((v, col) =>
                                      col === j ? e.target.value : v,
                                    )
                                  : x,
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove row ${i + 1}`}
                        onClick={() =>
                          update(t.id, {
                            rows: t.rows.filter((_, k) => k !== i),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-editor-actions">
            <button
              type="button"
              onClick={() =>
                update(t.id, { rows: [...t.rows, t.columns.map(() => "")] })
              }
            >
              <Plus size={14} />
              Add row
            </button>
            <button
              type="button"
              onClick={() =>
                update(t.id, {
                  columns: [...t.columns, `column_${t.columns.length + 1}`],
                  rows: t.rows.map((r) => [...r, ""]),
                })
              }
            >
              <Plus size={14} />
              Add column
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="button dashed"
        onClick={() =>
          onChange([
            ...tables,
            {
              id: crypto.randomUUID(),
              name: `${label === "Before" ? "input" : "result"}_${tables.length + 1}`,
              columns: ["id", "name"],
              rows: [["", ""]],
            },
          ])
        }
      >
        <Plus size={16} />
        Add {label.toLowerCase()} table
      </button>
      {importId && (
        <div className="modal-backdrop">
          <div
            ref={dialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Paste table data"
          >
            <h2>Paste your table</h2>
            <p>
              Copy from Excel or paste CSV. The first row becomes the column
              names. Pasting replaces this table's data.
            </p>
            <textarea
              autoFocus
              aria-label="CSV or spreadsheet data"
              rows={8}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"id,name\n1,Asha\n2,Dev"}
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="button-row">
              <button className="button" onClick={() => setImportId(null)}>
                Cancel
              </button>
              <button className="button primary" onClick={importData}>
                Use data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
