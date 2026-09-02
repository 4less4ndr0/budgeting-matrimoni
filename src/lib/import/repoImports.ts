/**
 * Auto-discovers CSV files committed in `csv-imports/` at the repo root.
 *
 * Vite's `import.meta.glob` scans the folder at build/dev-server time, so any file
 * dropped in there shows up here with zero registration — no manifest to maintain.
 * In `npm run dev` this updates live when a file is added/removed; on the published
 * site it only picks up files that were present at the last build (i.e. committed and
 * pushed before the GitHub Actions deploy ran).
 */
const modules = import.meta.glob('/csv-imports/*.csv', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export interface RepoImportFile {
  /** File name only, e.g. "2026-01-conto-corrente.csv" */
  name: string;
  /** Raw file content */
  content: string;
}

export function listRepoImports(): RepoImportFile[] {
  return Object.entries(modules)
    .map(([path, content]) => ({ name: path.split('/').pop() ?? path, content }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

/** Wraps raw CSV text as a File, so it can go through the same parseFile() pipeline as a manual upload. */
export function repoImportToFile(file: RepoImportFile): File {
  return new File([file.content], file.name, { type: 'text/csv' });
}
