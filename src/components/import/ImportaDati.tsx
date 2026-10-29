import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ImportView from '@/components/import/ImportView';
import {
  DESTINAZIONI,
  destinazione as trovaDestinazione,
  mappaturaIncompleta,
  norm,
  righeDaFoglio,
  suggerisciColonne,
  type Destinazione,
} from '@/lib/import/destinazioni';
import { readSheets, type NamedSheet } from '@/lib/import/parseFile';
import { useAppStore } from '@/lib/storage/store';

const MOVIMENTI = 'movimenti';
const NESSUNA = '-1';

/** Destinations grouped by area, in the order of the areas at the top of the app. */
const AREE = ['Gestione economica', 'HR', 'Governance', 'Supply Chain', 'Progetti'];

/** The current data, read at the moment of the import (not a stale render-time copy). */
function statoCorrente() {
  return useAppStore.getState();
}

function ImportaGenerico({ d, onFatto }: { d: Destinazione; onFatto: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fogli, setFogli] = useState<NamedSheet[] | null>(null);
  const [nomeFile, setNomeFile] = useState('');
  const [foglio, setFoglio] = useState('');
  const [colonne, setColonne] = useState<Record<string, number>>({});
  const [anteprima, setAnteprima] = useState(false);
  const [errore, setErrore] = useState('');

  const sheet = fogli?.find((f) => f.name === foglio)?.sheet ?? null;
  const mancanti = sheet ? mappaturaIncompleta(d, colonne) : [];

  function scegliFoglio(nome: string, elenco: NamedSheet[]) {
    setFoglio(nome);
    const s = elenco.find((f) => f.name === nome)?.sheet;
    setColonne(s ? suggerisciColonne(d.campi, s.headers) : {});
    setAnteprima(false);
  }

  async function leggi(file: File) {
    setErrore('');
    try {
      const elenco = readSheets(await file.arrayBuffer());
      if (elenco.length === 0) {
        setErrore('Il file sembra vuoto.');
        return;
      }
      setFogli(elenco);
      setNomeFile(file.name);
      // Regia's own export: preselect the sheet with this kind of data.
      const preferito = elenco.find((f) => d.fogli.some((x) => norm(x) === norm(f.name))) ?? elenco[0];
      scegliFoglio(preferito.name, elenco);
    } catch {
      setErrore('Non riesco a leggere il file: serve un CSV o un Excel (.xlsx).');
    }
  }

  // Dry run on the current data: exactly what confirming would do.
  const esito = useMemo(
    () => (anteprima && sheet ? d.importa(statoCorrente(), righeDaFoglio(sheet, colonne)) : null),
    [anteprima, sheet, colonne, d],
  );

  function conferma() {
    if (!sheet) return;
    // Recomputed on the latest state, in case something changed while the dialog was open.
    const e = d.importa(statoCorrente(), righeDaFoglio(sheet, colonne));
    useAppStore.setState(e.patch);
    toast.success(`${d.label}: ${e.nuovi} ${e.nuovi === 1 ? 'nuovo' : 'nuovi'}, ${e.aggiornati} ${e.aggiornati === 1 ? 'aggiornato' : 'aggiornati'}`, {
      description: e.scartati ? `${e.scartati} ${e.scartati === 1 ? 'riga scartata' : 'righe scartate'}.` : undefined,
    });
    onFatto();
  }

  if (!fogli) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-sm text-muted-foreground hover:bg-secondary/50"
        >
          <UploadCloud className="h-6 w-6" />
          Scegli un file .csv o .xlsx
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void leggi(f);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-muted-foreground">
          Va bene anche l&apos;Excel esportato da Regia: scegli il foglio, le colonne si abbinano da sole. Le righe con lo
          stesso nome aggiornano quelle esistenti, le celle vuote non cancellano nulla.
        </p>
        {errore && (
          <Alert variant="destructive">
            <AlertDescription>{errore}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (esito) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Nuovi', esito.nuovi],
            ['Aggiornati', esito.aggiornati],
            ['Scartati', esito.scartati],
          ].map(([l, n]) => (
            <div key={l} className="rounded-lg bg-secondary/60 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{l}</div>
              <div className="text-xl font-bold">{n}</div>
            </div>
          ))}
        </div>
        {esito.note.length > 0 && (
          <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
            {esito.note.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Niente viene cancellato: si aggiungono i nuovi e si aggiornano gli esistenti.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAnteprima(false)}>
            <ArrowLeft />
            Indietro
          </Button>
          <Button onClick={conferma} disabled={esito.nuovi + esito.aggiornati === 0}>
            Importa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        File: <span className="font-medium">{nomeFile}</span>
      </p>
      {fogli.length > 1 && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label className="font-normal text-muted-foreground">Foglio</Label>
          <Select value={foglio} onValueChange={(v) => scegliFoglio(v, fogli)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fogli.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.name} · {f.sheet.rows.length} righe
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {sheet && (
        <>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abbina le colonne</div>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {d.campi.map((c) => (
                <div key={c.key} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                  <Label className="font-normal">
                    {c.label}
                    {c.obbligatorio && ' *'}
                  </Label>
                  <Select
                    value={String(colonne[c.key] ?? -1)}
                    onValueChange={(v) => {
                      setColonne({ ...colonne, [c.key]: Number(v) });
                      setAnteprima(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NESSUNA}>
                        <span className="text-muted-foreground">— non presente —</span>
                      </SelectItem>
                      {sheet.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Colonna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Prime righe del file · {sheet.rows.length} in tutto
            </div>
            <div className="max-h-48 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheet.headers.map((h, i) => (
                      <TableHead key={i} className="whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {sheet.headers.map((_, j) => (
                        <TableCell key={j} className="max-w-[12rem] truncate whitespace-nowrap">
                          {r[j]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {mancanti.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Manca la colonna per: {mancanti.join(', ')}.</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFogli(null);
                setAnteprima(false);
              }}
            >
              <ArrowLeft />
              Altro file
            </Button>
            <Button onClick={() => setAnteprima(true)} disabled={mancanti.length > 0}>
              Anteprima
              <ArrowRight />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Import into any screen: pick the destination, then the file. Movimenti keep their dedicated
 * wizard (sign/type handling, replace mode); everything else goes through the generic one.
 */
export default function ImportaDati({ onFatto }: { onFatto: () => void }) {
  const [dest, setDest] = useState(MOVIMENTI);
  const d = trovaDestinazione(dest);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label className="font-normal text-muted-foreground">Cosa vuoi importare?</Label>
        <Select value={dest} onValueChange={setDest}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREE.map((area) => (
              <SelectGroup key={area}>
                <SelectLabel>{area}</SelectLabel>
                {area === 'Gestione economica' && <SelectItem value={MOVIMENTI}>Movimenti (costi ed entrate)</SelectItem>}
                {DESTINAZIONI.filter((x) => x.area === area).map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {d ? d.descrizione : 'Estratti conto e simili: costi ed entrate del conto economico, con data e importo.'}
        </p>
      </div>
      {/* Keyed by destination: switching starts the wizard over. */}
      {d ? <ImportaGenerico key={d.id} d={d} onFatto={onFatto} /> : <ImportView bare />}
    </div>
  );
}
