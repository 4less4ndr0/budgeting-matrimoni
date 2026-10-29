import * as XLSX from 'xlsx';

export interface RawSheet {
  headers: string[];
  rows: string[][];
}

/**
 * Reads a File (CSV or XLSX — SheetJS auto-detects) into raw string headers/rows.
 * Uses raw:false so cells come back as display strings we control the parsing of,
 * instead of SheetJS guessing numbers/dates for us.
 */
export async function parseFile(file: File): Promise<RawSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }
  return sheetToRaw(workbook.Sheets[firstSheetName]);
}

export interface NamedSheet {
  name: string;
  sheet: RawSheet;
}

/**
 * Every visible, non-empty sheet of a workbook (a CSV is a one-sheet workbook). Regia's hidden
 * data sheet is skipped: it's for restoring, not for importing rows.
 */
export function readSheets(buffer: ArrayBuffer): NamedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const hidden = new Set((workbook.Workbook?.Sheets ?? []).filter((s) => s.Hidden).map((s) => s.name));
  return workbook.SheetNames.filter((name) => !hidden.has(name) && name !== '_regia')
    .map((name) => ({ name, sheet: sheetToRaw(workbook.Sheets[name]) }))
    .filter((s) => s.sheet.headers.length > 0);
}

function sheetToRaw(sheet: XLSX.WorkSheet): RawSheet {
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...rest] = grid;
  const headers = headerRow.map((h) => String(h ?? '').trim());
  const rows = rest.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));

  return { headers, rows };
}
