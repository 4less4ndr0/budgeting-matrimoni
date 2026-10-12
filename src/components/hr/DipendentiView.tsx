import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cake, Mail, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RuoloSelect from '@/components/hr/RuoloSelect';
import { anzianita, eta, fullName, nextBirthday, prossimiCompleanni } from '@/lib/hr/hr';
import { useAppStore } from '@/lib/storage/store';
import type { Dipendente } from '@/types/domain';

type Bozza = Omit<Dipendente, 'id'>;

const BOZZA_VUOTA: Bozza = {
  nome: '',
  cognome: '',
  dataNascita: '',
  ruoloId: null,
  email: '',
  telefono: '',
  dataAssunzione: '',
  note: '',
};

const FINESTRA_COMPLEANNI = 30; // giorni

function dataBreve(iso: string): string {
  return iso ? format(new Date(`${iso}T00:00:00`), 'd MMM yyyy', { locale: it }) : '—';
}

function quando(giorni: number): string {
  if (giorni === 0) return 'oggi';
  if (giorni === 1) return 'domani';
  return `tra ${giorni} giorni`;
}

function DipendenteForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Bozza;
  onSave: (bozza: Bozza) => void;
  onCancel: () => void;
}) {
  const [bozza, setBozza] = useState<Bozza>(initial);
  const set = (patch: Partial<Bozza>) => setBozza((b) => ({ ...b, ...patch }));
  const valido = bozza.nome.trim() !== '' || bozza.cognome.trim() !== '';

  return (
    <form
      className="flex min-h-0 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onSave({ ...bozza, nome: bozza.nome.trim(), cognome: bozza.cognome.trim() });
      }}
    >
      <div className="grid gap-4 overflow-y-auto px-0.5 pb-0.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-nome">Nome</Label>
          <Input id="dip-nome" autoFocus value={bozza.nome} onChange={(e) => set({ nome: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-cognome">Cognome</Label>
          <Input id="dip-cognome" value={bozza.cognome} onChange={(e) => set({ cognome: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Ruolo</Label>
          <RuoloSelect value={bozza.ruoloId} onChange={(ruoloId) => set({ ruoloId })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-nascita">Data di nascita</Label>
          <Input
            id="dip-nascita"
            type="date"
            value={bozza.dataNascita}
            onChange={(e) => set({ dataNascita: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-assunzione">Data di assunzione</Label>
          <Input
            id="dip-assunzione"
            type="date"
            value={bozza.dataAssunzione}
            onChange={(e) => set({ dataAssunzione: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-email">Email</Label>
          <Input
            id="dip-email"
            type="email"
            inputMode="email"
            value={bozza.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dip-telefono">Telefono</Label>
          <Input
            id="dip-telefono"
            type="tel"
            inputMode="tel"
            value={bozza.telefono}
            onChange={(e) => set({ telefono: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="dip-note">Note</Label>
          <textarea
            id="dip-note"
            rows={3}
            placeholder="Contratto, competenze, taglia divisa, allergie…"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm"
            value={bozza.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" disabled={!valido}>
          Salva
        </Button>
      </div>
    </form>
  );
}

function Contatti({ d }: { d: Dipendente }) {
  if (!d.email && !d.telefono) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      {d.email && (
        <a href={`mailto:${d.email}`} className="flex items-center gap-1.5 truncate hover:underline">
          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{d.email}</span>
        </a>
      )}
      {d.telefono && (
        <a href={`tel:${d.telefono.replace(/\s+/g, '')}`} className="flex items-center gap-1.5 hover:underline">
          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {d.telefono}
        </a>
      )}
    </div>
  );
}

function Compleanno({ d }: { d: Dipendente }) {
  const info = nextBirthday(d.dataNascita);
  if (!info) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="whitespace-nowrap">{format(info.prossimo, 'd MMMM', { locale: it })}</span>
        {info.giorniMancanti <= FINESTRA_COMPLEANNI && (
          <Badge variant="secondary" className="whitespace-nowrap">
            {quando(info.giorniMancanti)}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{eta(d.dataNascita)} anni</div>
    </div>
  );
}

function Assunzione({ d }: { d: Dipendente }) {
  if (!d.dataAssunzione) return <span className="text-muted-foreground">—</span>;
  const anni = anzianita(d.dataAssunzione);
  return (
    <div className="text-sm">
      <div>{dataBreve(d.dataAssunzione)}</div>
      {anni !== null && (
        <div className="text-xs text-muted-foreground">
          {anni === 0 ? 'meno di un anno' : anni === 1 ? '1 anno' : `${anni} anni`}
        </div>
      )}
    </div>
  );
}

export default function DipendentiView() {
  const dipendenti = useAppStore((s) => s.dipendenti);
  const ruoli = useAppStore((s) => s.ruoli);
  const addDipendente = useAppStore((s) => s.addDipendente);
  const updateDipendente = useAppStore((s) => s.updateDipendente);
  const removeDipendente = useAppStore((s) => s.removeDipendente);

  // null = dialog closed, 'nuovo' = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Dipendente | null>(null);
  const [cerca, setCerca] = useState('');

  const nomeRuolo = useMemo(() => {
    const byId = new Map(ruoli.map((r) => [r.id, r.nome]));
    return (id: string | null) => (id ? byId.get(id) ?? '' : '');
  }, [ruoli]);

  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return dipendenti
      .filter(
        (d) =>
          !q ||
          [d.nome, d.cognome, nomeRuolo(d.ruoloId), d.email, d.telefono].some((v) => v.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it'),
      );
  }, [dipendenti, cerca, nomeRuolo]);

  const compleanni = useMemo(() => prossimiCompleanni(dipendenti, FINESTRA_COMPLEANNI), [dipendenti]);

  const inModifica = editing && editing !== 'nuovo' ? dipendenti.find((d) => d.id === editing) : undefined;

  function salva(bozza: Bozza) {
    if (inModifica) {
      updateDipendente(inModifica.id, bozza);
      toast.success(`${fullName(bozza)} aggiornato`);
    } else {
      addDipendente(bozza);
      toast.success(`${fullName(bozza)} aggiunto`);
    }
    setEditing(null);
  }

  function ruoloLabel(d: Dipendente) {
    const nome = nomeRuolo(d.ruoloId);
    return nome ? <span>{nome}</span> : <span className="text-muted-foreground">Nessun ruolo</span>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Cake className="h-4 w-4" />
            Prossimi compleanni
            <InfoTooltip content={`I compleanni dei prossimi ${FINESTRA_COMPLEANNI} giorni, il più vicino per primo.`} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compleanni.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun compleanno nei prossimi {FINESTRA_COMPLEANNI} giorni.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {compleanni.map(({ dipendente, info }) => (
                <li
                  key={dipendente.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${info.giorniMancanti === 0 ? 'border-foreground/40 bg-secondary' : ''}`}
                >
                  <div className="font-medium">{fullName(dipendente)}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(info.prossimo, 'EEEE d MMMM', { locale: it })} · {quando(info.giorniMancanti)} · compie{' '}
                    {info.eta} anni
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Dipendenti
            <span className="font-normal text-muted-foreground">({dipendenti.length})</span>
            <InfoTooltip content="L'anagrafica del personale. Il ruolo assegnato qui è quello che compare nell'organigramma." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, ruolo, contatto…"
                className="pl-9"
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
              />
            </div>
            <Button onClick={() => setEditing('nuovo')}>
              <Plus />
              Aggiungi dipendente
            </Button>
          </div>

          {/* Mobile: one card per dipendente, consistent with the rest of the app. */}
          <div className="space-y-3 sm:hidden">
            {elenco.map((d) => (
              <div key={d.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{fullName(d) || 'Senza nome'}</div>
                    <div className="text-sm">
                      {ruoloLabel(d)}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(d.id)} title="Modifica">
                      <Pencil className="text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setPendingDelete(d)} title="Elimina">
                      <Trash2 className="text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Compleanno
                    </div>
                    <Compleanno d={d} />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Assunzione
                    </div>
                    <Assunzione d={d} />
                  </div>
                </div>
                {(d.email || d.telefono) && (
                  <div className="mt-3">
                    <Contatti d={d} />
                  </div>
                )}
                {d.note && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{d.note}</p>}
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome e cognome</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Compleanno</TableHead>
                  <TableHead>Assunzione</TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {elenco.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{fullName(d) || 'Senza nome'}</div>
                      {d.note && (
                        <div className="max-w-[16rem] truncate text-xs text-muted-foreground" title={d.note}>
                          {d.note}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {ruoloLabel(d)}
                    </TableCell>
                    <TableCell>
                      <Compleanno d={d} />
                    </TableCell>
                    <TableCell>
                      <Assunzione d={d} />
                    </TableCell>
                    <TableCell className="max-w-[14rem]">
                      <Contatti d={d} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(d.id)} title="Modifica">
                        <Pencil className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(d)} title="Elimina">
                        <Trash2 className="text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {elenco.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              {dipendenti.length === 0 ? 'Nessun dipendente ancora inserito.' : 'Nessun dipendente corrisponde alla ricerca.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{inModifica ? `Modifica ${fullName(inModifica)}` : 'Nuovo dipendente'}</DialogTitle>
            <DialogDescription>Serve almeno il nome o il cognome; tutto il resto è facoltativo.</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <DipendenteForm
              // Remount per dipendente so the draft always starts from the right data.
              key={editing}
              initial={inModifica ? { ...inModifica } : BOZZA_VUOTA}
              onSave={salva}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {pendingDelete ? fullName(pendingDelete) : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparisce dall&apos;elenco e dall&apos;organigramma. Il suo ruolo resta, eventualmente vacante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  removeDipendente(pendingDelete.id);
                  toast.success(`${fullName(pendingDelete)} eliminato`);
                }
                setPendingDelete(null);
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
