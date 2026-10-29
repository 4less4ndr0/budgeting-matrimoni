import { Check, Minus, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { NumeroInput } from '@/components/common/NumeroInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  NOME_CLASSE,
  classifica,
  formula,
  relazione,
  totaliConLegate,
  type ClasseImpresa,
  type TipoRelazione,
} from '@/lib/dimensione/dimensione';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { ImpresaLegata } from '@/types/domain';

function eur(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function mln(n: number): string {
  return `${(n / 1_000_000).toLocaleString('it-IT')} mln €`;
}

function ula(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

const COLORE_CLASSE: Record<ClasseImpresa, string> = {
  micro: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  piccola: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  media: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  grande: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

const COLORE_RELAZIONE: Record<TipoRelazione, string> = {
  autonoma: 'bg-secondary text-secondary-foreground',
  associata: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  collegata: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

function RelazioneBadge({ impresa }: { impresa: ImpresaLegata }) {
  const r = relazione(impresa);
  const conta = r.peso === 0 ? 'non conta' : `conta al ${Math.round(r.peso * 10000) / 100}%`;
  return (
    <Badge className={cn('whitespace-nowrap border-transparent font-normal', COLORE_RELAZIONE[r.tipo])}>
      {r.tipo} · {conta}
    </Badge>
  );
}

function Esito({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="dato mancante" />;
  return ok ? (
    <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="rispettata" />
  ) : (
    <X className="mx-auto h-4 w-4 text-red-600 dark:text-red-400" aria-label="superata" />
  );
}

function ImpresaLegataEditor({ impresa }: { impresa: ImpresaLegata }) {
  const update = useAppStore((s) => s.updateImpresaLegata);
  const remove = useAppStore((s) => s.removeImpresaLegata);
  const set = (patch: Partial<ImpresaLegata>) => update(impresa.id, patch);
  const id = (campo: string) => `legata-${impresa.id}-${campo}`;

  return (
    <div className="rounded-lg border p-3">
      {/* Phone: name on its own row, relation badge + delete below it. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="min-w-0 flex-1 basis-full sm:w-auto sm:basis-auto"
          placeholder="Nome dell'impresa"
          value={impresa.nome}
          onChange={(e) => set({ nome: e.target.value })}
        />
        <RelazioneBadge impresa={impresa} />
        <Button variant="ghost" size="icon" className="ml-auto sm:ml-0" onClick={() => remove(impresa.id)} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('quota')} className="font-normal text-muted-foreground">
            Quota (%)
          </Label>
          <NumeroInput id={id('quota')} value={impresa.quota} onChange={(v) => set({ quota: v ?? 0 })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('ula')} className="font-normal text-muted-foreground">
            ULA
          </Label>
          <NumeroInput id={id('ula')} value={impresa.ula} onChange={(v) => set({ ula: v })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('fatt')} className="font-normal text-muted-foreground">
            Fatturato (€)
          </Label>
          <NumeroInput id={id('fatt')} value={impresa.fatturato} onChange={(v) => set({ fatturato: v })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id('bil')} className="font-normal text-muted-foreground">
            Totale di bilancio (€)
          </Label>
          <NumeroInput id={id('bil')} value={impresa.totaleBilancio} onChange={(v) => set({ totaleBilancio: v })} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
        <label className="flex items-center gap-2">
          <Checkbox checked={impresa.controlloCda} onCheckedChange={(c) => set({ controlloCda: c === true })} />
          Nomina la maggioranza del CdA (o la nostra nomina il suo)
        </label>
        {/* The "i" stays outside the <label>: clicking it must not tick the box. */}
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-2">
            <Checkbox checked={impresa.investitoreEsente} onCheckedChange={(c) => set({ investitoreEsente: c === true })} />
            Investitore esente
          </label>
          <InfoTooltip content="Società pubbliche di partecipazione, venture capital, università o centri di ricerca senza scopo di lucro, investitori istituzionali (anche fondi di sviluppo regionali), enti locali con bilancio < 10 mln € e < 5.000 abitanti: con una quota tra 25% e 50% l'impresa resta autonoma." />
        </div>
      </div>
    </div>
  );
}

export default function DimensioneImpresaView() {
  const dim = useAppStore((s) => s.dimensioneImpresa);
  const numeroDipendenti = useAppStore((s) => s.dipendenti.length);
  const updateDimensione = useAppStore((s) => s.updateDimensioneImpresa);
  const addImpresaLegata = useAppStore((s) => s.addImpresaLegata);

  const ulaProprie = dim.ulaManuale ?? numeroDipendenti;
  const propri = { ula: ulaProprie, fatturato: dim.fatturato, totaleBilancio: dim.totaleBilancio };
  const partenza = classifica(propri);
  const totali = totaliConLegate(propri, dim.imprese);
  const esito = classifica(totali);
  const contano = dim.imprese.filter((i) => relazione(i).peso > 0);
  const nomiIncompleti = dim.imprese.filter((i) => totali.incomplete.includes(i.id)).map((i) => i.nome || 'senza nome');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              La tua impresa
              <InfoTooltip content="Dati dell'ultimo esercizio contabile chiuso al momento della domanda (Raccomandazione 2003/361/CE, DM 18 aprile 2005)." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5 sm:max-w-[12rem]">
              <Label htmlFor="dim-esercizio" className="font-normal text-muted-foreground">
                Esercizio di riferimento
              </Label>
              <Input
                id="dim-esercizio"
                placeholder="Es. 2025"
                value={dim.esercizio}
                onChange={(e) => updateDimensione({ esercizio: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-secondary/60 p-3">
                <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Effettivi (ULA)
                  <InfoTooltip
                    content={
                      <>
                        Unità lavorative annue: chi ha lavorato a tempo pieno tutto l&apos;anno conta 1, part-time e
                        periodi parziali in frazioni. Si contano dipendenti, proprietari gestori e soci con attività
                        regolare retribuita; <strong>non</strong> apprendisti, contratti di formazione o inserimento,
                        cassa integrazione straordinaria, congedi di maternità o parentali.
                      </>
                    }
                  />
                </div>
                {dim.ulaManuale === null ? (
                  <>
                    <div className="mt-1 text-lg font-bold">{numeroDipendenti}</div>
                    <div className="text-xs text-muted-foreground">dall&apos;anagrafica HR</div>
                    <button
                      type="button"
                      className="mt-1 text-xs underline underline-offset-2 hover:text-foreground"
                      onClick={() => updateDimensione({ ulaManuale: numeroDipendenti })}
                    >
                      Correggi a mano
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mt-1">
                      <NumeroInput value={dim.ulaManuale} onChange={(v) => updateDimensione({ ulaManuale: v ?? 0 })} />
                    </div>
                    <button
                      type="button"
                      className="mt-1 text-xs underline underline-offset-2 hover:text-foreground"
                      onClick={() => updateDimensione({ ulaManuale: null })}
                    >
                      Usa i {numeroDipendenti} dipendenti dell&apos;anagrafica
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-lg bg-secondary/60 p-3">
                <Label
                  htmlFor="dim-fatturato"
                  className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Fatturato annuo
                  <InfoTooltip content="Voce A.1 del Conto Economico: ricavi delle vendite e delle prestazioni, al netto di sconti, IVA e altre imposte legate al volume d'affari. Non è il valore della produzione (totale della classe A)." />
                </Label>
                <div className="mt-1">
                  <NumeroInput
                    id="dim-fatturato"
                    placeholder="€"
                    value={dim.fatturato}
                    onChange={(v) => updateDimensione({ fatturato: v })}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dim.fatturato !== null ? eur(dim.fatturato) : 'Voce A.1 del Conto Economico'}
                </div>
              </div>

              <div className="rounded-lg bg-secondary/60 p-3">
                <Label
                  htmlFor="dim-bilancio"
                  className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Totale di bilancio
                  <InfoTooltip content="Totale dell'attivo dello Stato Patrimoniale." />
                </Label>
                <div className="mt-1">
                  <NumeroInput
                    id="dim-bilancio"
                    placeholder="€"
                    value={dim.totaleBilancio}
                    onChange={(v) => updateDimensione({ totaleBilancio: v })}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dim.totaleBilancio !== null ? eur(dim.totaleBilancio) : 'Totale attivo dello Stato Patrimoniale'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Dimensione d&apos;impresa
              <InfoTooltip content="Le ULA sono obbligatorie; tra fatturato e totale di bilancio basta rispettarne uno. Con imprese associate o collegate si sommano anche i loro dati." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {esito.classe ? (
              <>
                <div
                  className={cn(
                    'rounded-lg px-4 py-3 text-center text-2xl font-bold',
                    COLORE_CLASSE[esito.classe],
                  )}
                >
                  {NOME_CLASSE[esito.classe]}
                </div>
                {contano.length > 0 && partenza.classe && partenza.classe !== esito.classe && (
                  <p className="text-sm">
                    Da sola sarebbe <strong>{NOME_CLASSE[partenza.classe].toLowerCase()}</strong>: la sposta il peso
                    delle imprese associate e collegate.
                  </p>
                )}
                {esito.provvisoria && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Provvisoria: calcolata solo sulle ULA. Inserisci il fatturato o il totale di bilancio.
                  </p>
                )}
                {nomiIncompleti.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Mancano dati di: {nomiIncompleti.join(', ')} (contati come 0, il risultato può essere
                    sottostimato).
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Servono almeno le ULA.</p>
            )}
            <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
              <li>· Dati dell&apos;ultimo esercizio chiuso al momento della domanda.</li>
              <li>· Il legale rappresentante dichiara la dimensione con una DSAN.</li>
              <li>· La dimensione dichiarata resta invariata per tutta la durata del progetto.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Imprese associate e collegate
            <InfoTooltip content="Inserisci sia chi ha quote della tua impresa sia le imprese di cui la tua ha quote, con la percentuale più alta tra capitale e diritti di voto. Sotto il 25% l'impresa è autonoma e non conta; dal 25% al 50% è associata e conta pro quota; oltre il 50% (o con il controllo del CdA) è collegata e conta al 100%. Per catene di partecipazioni indica la quota che lega ciascuna impresa al gruppo (es. C al 32% di B, collegata al 60%: C entra al 32%)." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dim.imprese.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessuna: la tua impresa è autonoma e conta solo con i propri dati.
            </p>
          )}
          {dim.imprese.map((i) => (
            <ImpresaLegataEditor key={i.id} impresa={i} />
          ))}
          <Button variant="secondary" onClick={addImpresaLegata}>
            <Plus />
            Aggiungi impresa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Verifica delle soglie
            <InfoTooltip content="✓ soglia rispettata, ✗ superata, – dato mancante." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Formula: </span>
            <span className="font-medium">{formula('mia impresa', dim.imprese)}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'ULA totali', value: ula(totali.ula) },
              { label: 'Fatturato totale', value: eur(totali.fatturato) },
              { label: 'Totale di bilancio', value: eur(totali.totaleBilancio) },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-secondary/60 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{x.label}</div>
                <div className="mt-1 text-lg font-bold">{x.value}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">ULA</TableHead>
                  <TableHead className="text-center">Fatturato</TableHead>
                  <TableHead className="text-center">Totale bilancio</TableHead>
                  <TableHead className="text-center">Esito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esito.esiti.map((e) => {
                  const attiva = e.soglia.classe === esito.classe;
                  return (
                    <TableRow key={e.soglia.classe} className={attiva ? 'bg-secondary/60' : undefined}>
                      <TableCell className="font-medium">{NOME_CLASSE[e.soglia.classe]}</TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs text-muted-foreground">&lt; {e.soglia.ulaMax}</div>
                        <Esito ok={e.ulaOk} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs text-muted-foreground">≤ {mln(e.soglia.fatturatoMax)}</div>
                        <Esito ok={e.fatturatoOk} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs text-muted-foreground">≤ {mln(e.soglia.bilancioMax)}</div>
                        <Esito ok={e.bilancioOk} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Esito ok={e.rispettata} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
