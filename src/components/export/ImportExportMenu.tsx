import { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, FileJson, FileSpreadsheet, FileUp, FolderGit2, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImportaDati from '@/components/import/ImportaDati';
import { exportStateSnapshot, type StateSnapshot } from '@/lib/export/exportSnapshot';
import { exportWorkbook } from '@/lib/export/exportWorkbook';
import { readRegiaFile } from '@/lib/import/readRegiaFile';
import { listRepoSnapshots } from '@/lib/import/repoImports';
import { useAppStore } from '@/lib/storage/store';
import type { AppState } from '@/types/domain';

function MenuVoce({ titolo, dettaglio }: { titolo: string; dettaglio: React.ReactNode }) {
  return (
    <span>
      <span className="block font-medium">{titolo}</span>
      <span className="block text-xs text-muted-foreground">{dettaglio}</span>
    </span>
  );
}

function quandoSalvato(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'data sconosciuta'
    : d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
}

/** What the restore is about to bring in, so the confirmation isn't a blind "are you sure?". */
function riepilogo(s: StateSnapshot): string {
  return [
    `${s.lineItems.length} movimenti`,
    `${s.fundEntries.length} fondi`,
    `${s.budgetItems?.length ?? 0} voci di budget`,
    `${s.dipendenti?.length ?? 0} dipendenti`,
    `${s.ruoli?.length ?? 0} ruoli`,
    `${s.supplyChain?.prodotti?.length ?? 0} prodotti`,
  ].join(' · ');
}

/**
 * One place for moving the whole Regia in and out: export to Excel (readable, and re-importable
 * thanks to its hidden data sheet) or JSON; restore from a file or from a snapshot committed in
 * csv-imports/; and the movimenti (CSV/Excel) import wizard, opened in a dialog.
 */
export default function ImportExportMenu({ state }: { state: AppState }) {
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ nome: string; snapshot: StateSnapshot } | null>(null);
  const [importaAperto, setImportaAperto] = useState(false);
  // Snapshots committed in csv-imports/ (read at build time, so this never changes at runtime).
  const salvatiNelRepo = useMemo(() => listRepoSnapshots(), []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      setPending({ nome: file.name, snapshot: await readRegiaFile(file) });
    } catch (e) {
      toast.error('File non importato', { description: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <ArrowDownUp />
            Importa / Esporta
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Esporta tutta la Regia
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="items-start"
            onSelect={() => {
              exportWorkbook(state);
              toast.success('Regia esportata in Excel', { description: 'Controlla la cartella dei download.' });
            }}
          >
            <FileSpreadsheet className="mt-0.5" />
            <MenuVoce
              titolo="Excel (.xlsx) — consigliato"
              dettaglio="Un foglio per area, da aprire in Excel o Google Sheets. Si può anche reimportare qui."
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="items-start"
            onSelect={() => {
              exportStateSnapshot(state);
              toast.success('Regia esportata in JSON', { description: 'Controlla la cartella dei download.' });
            }}
          >
            <FileJson className="mt-0.5" />
            <MenuVoce
              titolo="JSON (.json)"
              dettaglio={
                <>
                  Copia tecnica. Messa in <code>csv-imports/</code> come <code>stato-sito.json</code> il sito la
                  propone da ricaricare.
                </>
              }
            />
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Importa
          </DropdownMenuLabel>
          <DropdownMenuItem className="items-start" onSelect={() => fileRef.current?.click()}>
            <FileUp className="mt-0.5" />
            <MenuVoce
              titolo="Ripristina da file Regia…"
              dettaglio="Un .xlsx o .json esportato da qui: sostituisce tutti i dati di questo dispositivo."
            />
          </DropdownMenuItem>
          {salvatiNelRepo.map(({ name, snapshot }) => (
            <DropdownMenuItem
              key={name}
              className="items-start"
              onSelect={() => setPending({ nome: `csv-imports/${name}`, snapshot })}
            >
              <FolderGit2 className="mt-0.5" />
              <MenuVoce
                titolo={`Ripristina ${name}`}
                dettaglio={`Salvato nella cartella csv-imports/ il ${quandoSalvato(snapshot.savedAt)}.`}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="items-start" onSelect={() => setImportaAperto(true)}>
            <Table2 className="mt-0.5" />
            <MenuVoce
              titolo="Importa dati da CSV/Excel…"
              dettaglio="In qualsiasi schermata: movimenti, fondi, dipendenti, ruoli, organi, filiera, progetti, WBS, rischi."
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          // Reset so picking the same file again still fires onChange.
          e.target.value = '';
        }}
      />

      <Dialog open={importaAperto} onOpenChange={setImportaAperto}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importa dati</DialogTitle>
            <DialogDescription>
              Scegli dove importare, poi il file: un CSV o un Excel, anche quello esportato da Regia.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 min-h-0 overflow-y-auto px-1">
            <ImportaDati onFatto={() => setImportaAperto(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare la Regia da &quot;{pending?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Salvato il {pending ? quandoSalvato(pending.snapshot.savedAt) : ''}:{' '}
                  {pending ? riepilogo(pending.snapshot) : ''}.
                </p>
                <p>
                  Tutti i dati attuali di questo dispositivo (Gestione economica, HR, Governance, Supply Chain)
                  vengono sostituiti da quelli del file. Se non sei sicuro, scarica prima un backup.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                exportWorkbook(state);
                toast.success('Backup scaricato', { description: 'Ora puoi ripristinare senza rischi.' });
              }}
            >
              Scarica prima un backup
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pending) {
                  loadSnapshot(pending.snapshot);
                  toast.success('Regia ripristinata', { description: riepilogo(pending.snapshot) });
                }
                setPending(null);
              }}
            >
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
