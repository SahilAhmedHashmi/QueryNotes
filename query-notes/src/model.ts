export type Difficulty = "Easy" | "Moderate" | "Hard";
export interface DataTable {
  id: string;
  name: string;
  columns: string[];
  rows: string[][];
}
export interface Note {
  id: string;
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  tags: string[];
  problem: string;
  approach: string;
  sql: string;
  explanation: string;
  takeaways: string;
  alternative: string;
  performance: string;
  before: DataTable[];
  after: DataTable[];
  isSample: boolean;
}
export interface Draft {
  id: string;
  slug: string;
  content: Note;
  version: number;
  updated_at: string;
  published_at: string | null;
}
export interface Published {
  id: string;
  slug: string;
  content: Note;
  published_at: string;
  updated_at: string;
}
export const topics = [
  "Aggregation",
  "Joins",
  "Window functions",
  "CTEs",
  "Subqueries",
  "Date functions",
  "Ranking",
  "Data cleaning",
];
export function blankNote(): Note {
  return {
    id: crypto.randomUUID(),
    slug: "",
    title: "",
    summary: "",
    difficulty: "Easy",
    tags: [],
    problem: "",
    approach: "",
    sql: "",
    explanation: "",
    takeaways: "",
    alternative: "",
    performance: "",
    before: [],
    after: [],
    isSample: false,
  };
}
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const textOnly = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function validateNote(n: Note): string | null {
  if (!n.title.trim()) return "Add a title.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n.slug))
    return "Use a URL slug with lowercase letters, numbers, and hyphens.";
  if (!textOnly(n.problem)) return "Describe the problem before publishing.";
  if (!n.sql.trim()) return "Add your SQL solution before publishing.";
  if (!textOnly(n.explanation)) return "Add an explanation before publishing.";
  for (const table of [...n.before, ...n.after]) {
    if (!table.name.trim() || table.columns.some((c) => !c.trim()))
      return "Give every table and column a name.";
  }
  return null;
}
