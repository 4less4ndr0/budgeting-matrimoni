import { useMemo, useRef, useState } from 'react';
import {
  INTERNAL_FIELDS,
  normalizeRows,
  suggestMapping,
  type ColumnMapping,
  type TypeFallback,
} from '../../lib/import/columnMapping';
import { parseFile, type RawSheet } from '../../lib/import/parseFile';
import { useAppStore } from '../../lib/storage/store';

type Step = 'upload' | 'mapping' | 'confirm';

export default function ImportView() {
  const importLineItems = useAppStore((s) => s.importLineItems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [sheet, setSheet] = useState<RawSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: -1,
    category: -1,
    description: -1,
    amount: -1,
    type: -1,
  });
  const [typeFallback, setTypeFallback] = useState<TypeFallback>('all-cost');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [error, setError] = useState<string>('');

  async function handleFile(file: File) {
    setError('');
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0) {
        setError('Il file sembra vuoto o non leggibile.');
        return;
      }
      setSheet(parsed);
      setMapping(suggestMapping(parsed.headers));
      setFileName(file.name);
      setStep('mapping');
    } catch {
      setError('Non sono riuscito a leggere il file. Assicurati che sia un CSV o un XLSX valido.');
    }
  }

  const normalized = useMemo(() => {
    if (!sheet || step !== 'confirm') return null;
    return normalizeRows(sheet, { mapping, typeFallback });
  }, [sheet, mapping, typeFallback, step]);

  const canProceedToConfirm = mapping.date > -1 && mapping.amount > -1;

  function reset() {
    setStep('upload');
    setSheet(null);
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function confirmImport() {
    if (!normalized) return;
    importLineItems(normalized.items, importMode);
    reset();
  }

  return (
    <div>
      <div className="card">
        <h2>Importa costi/entrate da CSV o Excel</h2>
        <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Il file originale non viene mai modificato: i dati vengono letti una sola volta e
          copiati nella dashboard, dove puoi editarli liberamente.
        </p>

        {step === 'upload' && (
          <div
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            Trascina qui un file .csv o .xlsx, oppure clicca per selezionarlo
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        {step !== 'upload' && sheet && (
          <>
            <p className="muted">
              File: <strong>{fileName}</strong> — {sheet.rows.length} righe rilevate
            </p>

            <h3 style={{ marginTop: 18 }}>Mappa le colonne</h3>
            {INTERNAL_FIELDS.map((field) => (
              <div className="field-row" key={field.key}>
                <label>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                <select
                  value={mapping[field.key]}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field.key]: Number(e.target.value) }))
                  }
                >
                  <option value={-1}>— nessuna —</option>
                  {sheet.headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      {h || `Colonna ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {mapping.type === -1 && (
              <div className="field-row">
                <label>Come determinare costo/entrata</label>
                <select
                  value={typeFallback}
                  onChange={(e) => setTypeFallback(e.target.value as TypeFallback)}
                >
                  <option value="all-cost">Tutte le righe sono costi</option>
                  <option value="sign">Usa il segno dell'importo (negativo = costo)</option>
                </select>
              </div>
            )}

            <h3 style={{ marginTop: 18 }}>Anteprima righe grezze</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {sheet.headers.map((h, i) => (
                      <th key={i}>{h || `Colonna ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {sheet.headers.map((_, j) => (
                        <td key={j}>{row[j] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {step === 'mapping' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn secondary" onClick={reset}>
                  Annulla
                </button>
                <button
                  className="btn"
                  disabled={!canProceedToConfirm}
                  onClick={() => setStep('confirm')}
                >
                  Continua →
                </button>
              </div>
            )}

            {step === 'confirm' && normalized && (
              <>
                <h3 style={{ marginTop: 18 }}>
                  Anteprima normalizzata ({normalized.items.length} righe valide
                  {normalized.skippedRowCount > 0
                    ? `, ${normalized.skippedRowCount} scartate (data/importo non validi)`
                    : ''}
                  )
                </h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Descrizione</th>
                        <th>Importo</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalized.items.slice(0, 10).map((item, i) => (
                        <tr key={i}>
                          <td>{item.date}</td>
                          <td>{item.category}</td>
                          <td>{item.description}</td>
                          <td>{item.amount.toFixed(2)} €</td>
                          <td>
                            <span className={`pill ${item.type}`}>
                              {item.type === 'cost' ? 'Costo' : 'Entrata'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="field-row" style={{ marginTop: 16 }}>
                  <label>Modalità import</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                  >
                    <option value="append">Aggiungi ai dati esistenti</option>
                    <option value="replace">Sostituisci tutti i dati esistenti</option>
                  </select>
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button className="btn secondary" onClick={() => setStep('mapping')}>
                    ← Indietro
                  </button>
                  <button
                    className="btn"
                    disabled={normalized.items.length === 0}
                    onClick={confirmImport}
                  >
                    Importa {normalized.items.length} righe
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
