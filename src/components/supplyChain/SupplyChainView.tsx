import { useMemo, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fullName } from '@/lib/hr/hr';
import { useAppStore } from '@/lib/storage/store';
import {
  ATTIVITA_PRIMARIE,
  ATTIVITA_SUPPORTO,
  TIPI_ATTORE,
  attivitaDef,
  nomeAttore,
  riepilogoAttori,
  tipoLabel,
  type AttivitaDef,
} from '@/lib/supplyChain/porter';
import { cn } from '@/lib/utils';
import type { AttivitaPorter, AttoreFiliera, TipoAttore } from '@/types/domain';

// Same color for a tipo everywhere (diagram chips, dialog, summary table).
const COLORE_TIPO: Record<TipoAttore, string> = {
  interno: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  fornitore: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  partner: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  distributore: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  consulente: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  altro: 'bg-secondary text-secondary-foreground',
};

function TipoBadge({ tipo, children }: { tipo: TipoAttore; children?: React.ReactNode }) {
  return (
    <Badge className={cn('max-w-full border-transparent font-normal', COLORE_TIPO[tipo])}>
      {children ?? tipoLabel(tipo)}
    </Badge>
  );
}

const NESSUN_DIPENDENTE = '__nessuno__';

/** One activity of Porter's diagram: click it to manage who covers it. */
function AttivitaCella({
  def,
  attori,
  nome,
  onOpen,
  className,
}: {
  def: AttivitaDef;
  attori: AttoreFiliera[];
  nome: (a: AttoreFiliera) => string;
  onOpen: () => void;
  className?: string;
}) {
  const vuota = attori.length === 0;
  const supporto = def.area === 'supporto';
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Gestisci gli attori di questa attività"
      className={cn(
        'flex min-w-0 gap-2 rounded-md border p-3 text-left transition-colors hover:bg-secondary/60',
        supporto ? 'flex-col md:flex-row md:items-center' : 'flex-col',
        vuota ? 'border-dashed' : 'bg-card',
        className,
      )}
    >
      <div className={cn('text-sm font-semibold leading-tight', supporto && 'md:w-52 md:shrink-0')}>{def.nome}</div>
      <div className="flex min-w-0 flex-wrap gap-1">
        {vuota ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plus className="h-3 w-3" />
            Aggiungi attori
          </span>
        ) : (
          attori.map((a) => (
            <TipoBadge key={a.id} tipo={a.tipo}>
              <span className="truncate" title={nome(a)}>
                {nome(a)}
              </span>
            </TipoBadge>
          ))
        )}
      </div>
    </button>
  );
}

function AttoriDialog({
  prodottoId,
  prodottoNome,
  attivita,
  onClose,
}: {
  prodottoId: string;
  prodottoNome: string;
  attivita: AttivitaPorter | null;
  onClose: () => void;
}) {
  const attoriTutti = useAppStore((s) => s.supplyChain.attori);
  const dipendenti = useAppStore((s) => s.dipendenti);
  const addAttore = useAppStore((s) => s.addAttore);
  const updateAttore = useAppStore((s) => s.updateAttore);
  const removeAttore = useAppStore((s) => s.removeAttore);

  const [tipo, setTipo] = useState<TipoAttore>('fornitore');
  const [dipendenteId, setDipendenteId] = useState(NESSUN_DIPENDENTE);
  const [nomeNuovo, setNomeNuovo] = useState('');
  const [note, setNote] = useState('');

  const attori = attoriTutti.filter((a) => a.prodottoId === prodottoId && a.attivita === attivita);
  const ordinati = useMemo(
    () => [...dipendenti].sort((a, b) => fullName(a).localeCompare(fullName(b), 'it')),
    [dipendenti],
  );
  const conDipendente = tipo === 'interno' && dipendenteId !== NESSUN_DIPENDENTE;
  const valido = conDipendente || nomeNuovo.trim() !== '';

  function aggiungi() {
    if (!attivita || !valido) return;
    addAttore({
      prodottoId,
      attivita,
      tipo,
      dipendenteId: conDipendente ? dipendenteId : null,
      nome: conDipendente ? '' : nomeNuovo.trim(),
      note: note.trim(),
    });
    setNomeNuovo('');
    setNote('');
    setDipendenteId(NESSUN_DIPENDENTE);
  }

  const def = attivita ? attivitaDef(attivita) : null;

  return (
    <Dialog open={attivita !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{def?.nome}</DialogTitle>
          <DialogDescription>
            {prodottoNome} · {def?.descrizione}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-0.5 pb-0.5">
          {attori.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun attore per questa attività.</p>
          ) : (
            <ul className="space-y-3">
              {attori.map((a) => (
                <li key={a.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {a.dipendenteId ? (
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">{nomeAttore(a, dipendenti)}</div>
                    ) : (
                      <Input
                        className="flex-1"
                        value={a.nome}
                        onChange={(e) => updateAttore(a.id, { nome: e.target.value })}
                      />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeAttore(a.id)} title="Togli da questa attività">
                      <Trash2 className="text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                    <Select
                      value={a.tipo}
                      // A dipendente link only makes sense for internal actors.
                      onValueChange={(v) =>
                        updateAttore(a.id, {
                          tipo: v as TipoAttore,
                          ...(v !== 'interno' && a.dipendenteId
                            ? { dipendenteId: null, nome: nomeAttore(a, dipendenti) }
                            : {}),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPI_ATTORE.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Note (cosa fa, condizioni, contatto…)"
                      value={a.note}
                      onChange={(e) => updateAttore(a.id, { note: e.target.value })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="text-sm font-medium">Aggiungi attore</div>
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <div className="flex flex-col gap-1.5">
                <Label className="font-normal text-muted-foreground">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAttore)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPI_ATTORE.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tipo === 'interno' && ordinati.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <Label className="font-normal text-muted-foreground">Dipendente</Label>
                  <Select value={dipendenteId} onValueChange={setDipendenteId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NESSUN_DIPENDENTE}>
                        <span className="text-muted-foreground">Un reparto o un nome libero…</span>
                      </SelectItem>
                      {ordinati.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {fullName(d) || 'Senza nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {!conDipendente && (
                <div className={cn('flex flex-col gap-1.5', tipo === 'interno' && ordinati.length > 0 && 'sm:col-span-2')}>
                  <Label className="font-normal text-muted-foreground">
                    {tipo === 'interno' ? 'Reparto o persona' : 'Nome'}
                  </Label>
                  <Input
                    placeholder={tipo === 'interno' ? 'Es. Ufficio acquisti' : 'Es. Rossi Logistica S.r.l.'}
                    value={nomeNuovo}
                    onChange={(e) => setNomeNuovo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="font-normal text-muted-foreground">Note (facoltative)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
                />
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={aggiungi} disabled={!valido}>
              <Plus />
              Aggiungi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplyChainView() {
  const { prodotti, attori } = useAppStore((s) => s.supplyChain);
  const dipendenti = useAppStore((s) => s.dipendenti);
  const addProdotto = useAppStore((s) => s.addProdotto);
  const updateProdotto = useAppStore((s) => s.updateProdotto);
  const removeProdotto = useAppStore((s) => s.removeProdotto);

  const [selezionatoId, setSelezionatoId] = useState<string | null>(null);
  const [nuovoNome, setNuovoNome] = useState('');
  const [attivitaAperta, setAttivitaAperta] = useState<AttivitaPorter | null>(null);
  const [confermaElimina, setConfermaElimina] = useState(false);

  // Falls back to the first prodotto when nothing (or a since-deleted one) is selected.
  const prodotto = prodotti.find((p) => p.id === selezionatoId) ?? prodotti[0];
  const attoriProdotto = useMemo(
    () => (prodotto ? attori.filter((a) => a.prodottoId === prodotto.id) : []),
    [attori, prodotto],
  );
  const di = (attivita: AttivitaPorter) => attoriProdotto.filter((a) => a.attivita === attivita);
  const nome = (a: AttoreFiliera) => nomeAttore(a, dipendenti);
  const riepilogo = useMemo(() => riepilogoAttori(attoriProdotto, dipendenti), [attoriProdotto, dipendenti]);
  const coperte = new Set(attoriProdotto.map((a) => a.attivita)).size;

  function creaProdotto() {
    const n = nuovoNome.trim();
    if (!n) return;
    setSelezionatoId(addProdotto(n));
    setNuovoNome('');
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Prodotti
            <InfoTooltip content="Ogni prodotto o servizio ha la sua catena del valore: scegline uno per vedere chi presidia ciascuna attività." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prodotti.length > 0 && (
            <div role="tablist" className="flex flex-wrap gap-2">
              {prodotti.map((p) => {
                const attivo = p.id === prodotto?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={attivo}
                    onClick={() => setSelezionatoId(p.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-secondary',
                      attivo && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {p.nome || 'Prodotto senza nome'}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 sm:max-w-md">
            <Input
              placeholder={prodotti.length === 0 ? 'Nome del primo prodotto o servizio' : 'Nuovo prodotto o servizio'}
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && creaProdotto()}
            />
            <Button variant="secondary" onClick={creaProdotto} disabled={!nuovoNome.trim()}>
              <Plus />
              Aggiungi
            </Button>
          </div>

          {prodotto && (
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-[16rem_1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label className="font-normal text-muted-foreground">Nome</Label>
                <Input value={prodotto.nome} onChange={(e) => updateProdotto(prodotto.id, { nome: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="font-normal text-muted-foreground">Descrizione</Label>
                <Input
                  placeholder="Cos'è, a chi si rivolge…"
                  value={prodotto.descrizione}
                  onChange={(e) => updateProdotto(prodotto.id, { descrizione: e.target.value })}
                />
              </div>
              <Button variant="outline" onClick={() => setConfermaElimina(true)}>
                <Trash2 />
                Elimina prodotto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {prodotto && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-1.5">
                Catena del valore · {prodotto.nome || 'Prodotto senza nome'}
                <InfoTooltip content="Il modello di Porter: le attività primarie portano il prodotto dal fornitore al cliente, quelle di supporto le rendono possibili. Clicca un'attività per indicare chi la svolge." />
                <span className="text-sm font-normal text-muted-foreground">
                  · {coperte}/9 attività presidiate
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TIPI_ATTORE.map((t) => (
                  <TipoBadge key={t.id} tipo={t.id} />
                ))}
              </div>

              {/* Porter's diagram: support activities as full-width bands on top, primary ones
                  as five columns below, "Margine" as the arrow tip on the right. On a phone it
                  collapses to a single column and the arrow tip goes away. */}
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[repeat(5,minmax(0,1fr))_3rem]">
                <div className="pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:col-span-5 md:col-start-1">
                  Attività di supporto
                </div>
                {ATTIVITA_SUPPORTO.map((def) => (
                  <AttivitaCella
                    key={def.id}
                    def={def}
                    attori={di(def.id)}
                    nome={nome}
                    onOpen={() => setAttivitaAperta(def.id)}
                    className="md:col-span-5 md:col-start-1"
                  />
                ))}
                <div className="pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:col-span-5 md:col-start-1">
                  Attività primarie
                </div>
                {ATTIVITA_PRIMARIE.map((def) => (
                  <AttivitaCella
                    key={def.id}
                    def={def}
                    attori={di(def.id)}
                    nome={nome}
                    onOpen={() => setAttivitaAperta(def.id)}
                    className="md:min-h-[8rem]"
                  />
                ))}
                <div
                  aria-hidden
                  className="hidden items-center justify-center bg-secondary text-xs font-semibold uppercase tracking-widest text-muted-foreground [clip-path:polygon(0_0,100%_50%,0_100%)] md:col-start-6 md:row-start-2 md:row-end-8 md:flex"
                >
                  <span className="-translate-x-2 [writing-mode:vertical-rl]">Margine</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                Attori della filiera
                <InfoTooltip content="Gli stessi attori visti uno per uno, con tutte le attività che coprono per questo prodotto." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riepilogo.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ancora nessun attore: clicca un&apos;attività della catena per aggiungerne.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attore</TableHead>
                      <TableHead>Attività</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riepilogo.map((r) => (
                      <TableRow key={r.chiave}>
                        <TableCell className="align-top">
                          <div className="font-medium">{r.nome}</div>
                          <TipoBadge tipo={r.tipo} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {r.attivita.map((id) => (
                              <Badge key={id} variant="outline" className="font-normal">
                                {attivitaDef(id).nome}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <AttoriDialog
            key={`${prodotto.id}-${attivitaAperta}`}
            prodottoId={prodotto.id}
            prodottoNome={prodotto.nome || 'Prodotto senza nome'}
            attivita={attivitaAperta}
            onClose={() => setAttivitaAperta(null)}
          />

          <AlertDialog open={confermaElimina} onOpenChange={setConfermaElimina}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare &quot;{prodotto.nome || 'Prodotto senza nome'}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Si cancella anche la sua catena del valore ({attoriProdotto.length}{' '}
                  {attoriProdotto.length === 1 ? 'attore' : 'attori'}). Gli altri prodotti e l&apos;anagrafica
                  dipendenti non vengono toccati.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    removeProdotto(prodotto.id);
                    toast.success(`Prodotto "${prodotto.nome || 'senza nome'}" eliminato`);
                    setSelezionatoId(null);
                  }}
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
