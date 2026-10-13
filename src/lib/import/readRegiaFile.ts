import * as XLSX from 'xlsx';
import { parseSnapshotJson, type StateSnapshot } from '../export/exportSnapshot';
import { snapshotJsonFromWorkbook } from '../export/exportWorkbook';

/**
 * Reads a full Regia backup: either the .json snapshot or the .xlsx exported by Regia (from
 * its hidden data sheet). Throws an Error with a message meant for the user otherwise.
 */
export function parseRegiaBuffer(name: string, buffer: ArrayBuffer): StateSnapshot {
  if (name.toLowerCase().endsWith('.json')) {
    const snapshot = parseSnapshotJson(new TextDecoder().decode(buffer));
    if (!snapshot) throw new Error('Il file .json non è un salvataggio di Regia.');
    return snapshot;
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('Il file non si riesce ad aprire: serve un .xlsx o un .json esportato da Regia.');
  }
  const json = snapshotJsonFromWorkbook(wb);
  if (json === null) {
    throw new Error(
      'Questo Excel non contiene i dati di Regia (manca il foglio nascosto). Per importare solo dei movimenti usa "Importa movimenti da CSV/Excel".',
    );
  }
  const snapshot = parseSnapshotJson(json);
  if (!snapshot) throw new Error('I dati dentro questo Excel sono danneggiati o sono stati modificati.');
  return snapshot;
}

export async function readRegiaFile(file: File): Promise<StateSnapshot> {
  return parseRegiaBuffer(file.name, await file.arrayBuffer());
}
