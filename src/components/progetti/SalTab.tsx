import { differenceInCalendarDays } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumeroInput } from '@/components/common/NumeroInput';
import { NOME_CLASSE, classeNostraImpresa } from '@/lib/dimensione/dimensione';
import {
  allineaSal,
  avvisiSal,
  codiceOr,
  contributoAtteso,
  costiPianificati,
  documentiMancanti,
  intensitaNostra,
  orOrdinati,
  periodiSal,
  totaleCosti,
  type CostiRS,
  type PeriodoSal,
  termini,
} from '@/lib/progetti/calcoli';
import { DOCUMENTI_SAL, TIPI_SOGGETTO } from '@/lib/progetti/defaults';
import { INFO_CATEGORIE, INFO_DOCUMENTI } from '@/lib/progetti/glossario';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { Progetto, Sal, StatoSal, TipologiaRS } from '@/types/domain';
import { AvvisiBox, Campo, Info, dataBreve, eur, pulisci } from './comuni';

type Aggiorna = (c: Partial<Progetto> | ((p: Progetto) => Progetto)) => void;

const STATI: Array<{ id: StatoSal; label: string }> = [
  { id: 'aperto', label: 'Aperto' },
  { id: 'in-preparazione', label: 'In preparazione' },
  { id: 'presentato', label: 'Presentato' },
  { id: 'approvato', label: 'Approvato' },
  { id: 'erogato', label: 'Erogato' },
];

const TIPI: TipologiaRS[] = ['RI', 'SS'];

function giorniA(d: Date | null): string | null {
  if (!d) return null;
  const g = differenceInCalendarDays(d, new Date());
  if (g < 0) return `scaduta da ${-g} gg`;
  if (g === 0) return 'oggi';
  return `tra ${g} gg`;
}

function SalCard({
  p,
  per,
  sal,
  intensita,
  aperto,
  aggiornaSal,
}: {
  p: Progetto;
  per: PeriodoSal;
  sal: Sal;
  intensita: { ri: number; ss: number };
  aperto: boolean;
  aggiornaSal: (change: (s: Sal) => Sal) => void;
}) {
  const categorie = Array.from(new Set([...pulisci(p.bando.categorieCosto), ...Object.keys(sal.costiRendicontati.RI ?? {}), ...Object.keys(sal.costiRendicontati.SS ?? {})]));
  const pianificati = costiPianificati(p, per.meseDa, per.meseA);
  const rendicontati: CostiRS = { RI: sal.costiRendicontati.RI ?? {}, SS: sal.costiRendicontati.SS ?? {} };
  const mancanti = documentiMancanti(p, sal);
  const totDoc = p.or.length * DOCUMENTI_SAL.length;

  return (
    <details open={aperto} className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
        <span className="font-semibold">SAL {per.numero}</span>
        <span className="text-sm text-muted-foreground">
          M{per.meseDa}–M{per.meseA} · {dataBreve(per.dal)} → {dataBreve(per.al)}
        </span>
        <Badge variant="secondary" className="font-normal">
          {STATI.find((s) => s.id === sal.stato)?.label}
        </Badge>
        <span className="ml-auto text-sm">
          Contributo atteso <span className="font-semibold">{eur(contributoAtteso(rendicontati, intensita))}</span>
        </span>
      </summary>

      <div className="space-y-4 border-t p-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo label="Stato" info="statoSal">
            <Select value={sal.stato} onValueChange={(v) => aggiornaSal((s) => ({ ...s, stato: v as StatoSal }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATI.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Target interno <Info k="targetInterno" />
            </div>
            <div className="font-semibold">{dataBreve(per.target)}</div>
            <div className="text-xs text-muted-foreground">{giorniA(per.target)}</div>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Scadenza del bando <Info k="scadenzaSal" />
            </div>
            <div className="font-semibold">{per.scadenza ? dataBreve(per.scadenza) : '—'}</div>
            <div className="text-xs text-muted-foreground">{per.scadenza ? giorniA(per.scadenza) : 'manca nella scheda bando'}</div>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
            <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Documenti <Info k="documentiSal" />
            </div>
            <div className="font-semibold">
              {totDoc - mancanti}/{totDoc}
            </div>
            <div className="text-xs text-muted-foreground">{mancanti ? `${mancanti} da raccogliere` : totDoc ? 'completi' : `nessun ${termini(p).sigla}`}</div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            Costi pianificati e rendicontati
            <Info k="costiRendicontati" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-1 text-left font-medium">Categoria</th>
                  {TIPI.map((t) => (
                    <th key={t} colSpan={2} className="py-1 text-center font-medium">
                      {t} · pianificati / rendicontati
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorie.map((c) => (
                  <tr key={c} className="border-t">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1">
                        {c}
                        {INFO_CATEGORIE[c] && <InfoTooltip content={INFO_CATEGORIE[c]} />}
                      </span>
                    </td>
                    {TIPI.map((t) => {
                      const pian = pianificati[t][c] ?? 0;
                      const rend = rendicontati[t][c];
                      const sforo = rend !== undefined && rend > pian + 0.005;
                      return (
                        <td key={t} colSpan={2} className="py-1.5">
                          <div className="grid grid-cols-2 items-center gap-2 px-1">
                            <span className="text-right tabular-nums text-muted-foreground">{eur(pian)}</span>
                            <div className={cn(sforo && '[&_input]:border-red-500 [&_input]:text-red-600')}>
                              <NumeroInput
                                aria-label={`${c} ${t} rendicontati`}
                                value={rend ?? null}
                                onChange={(v) =>
                                  aggiornaSal((s) => {
                                    const tip = { ...(s.costiRendicontati[t] ?? {}) };
                                    if (v === null) delete tip[c];
                                    else tip[c] = v;
                                    return { ...s, costiRendicontati: { ...s.costiRendicontati, [t]: tip } };
                                  })
                                }
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="py-1.5">Totale</td>
                  {TIPI.map((t) => (
                    <td key={t} colSpan={2} className="py-1.5">
                      <div className="grid grid-cols-2 gap-2 px-1 tabular-nums">
                        <span className="text-right">{eur(totaleCosti(pianificati, t))}</span>
                        <span className="px-3">{eur(totaleCosti(rendicontati, t))}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            Documenti da raccogliere
            <Info k="documentiSal" />
          </div>
          {p.or.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun {termini(p).sigla} nella WBS.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {orOrdinati(p).map((or) => (
                <div key={or.id} className="rounded-md border p-2.5">
                  <div className="mb-1.5 truncate text-sm font-medium">
                    {codiceOr(p, or.id)} {or.titolo}
                  </div>
                  <div className="space-y-1">
                    {/* The "i" stays outside the <label>: clicking it must not tick the box. */}
                    {DOCUMENTI_SAL.map((doc) => (
                      <div key={doc} className="flex items-start gap-1 text-sm">
                        <label className="flex items-start gap-2">
                          <Checkbox
                            className="mt-0.5"
                            checked={!!sal.documenti[or.id]?.[doc]}
                            onCheckedChange={(c) =>
                              aggiornaSal((s) => ({
                                ...s,
                                documenti: { ...s.documenti, [or.id]: { ...(s.documenti[or.id] ?? {}), [doc]: c === true } },
                              }))
                            }
                          />
                          {doc}
                        </label>
                        <InfoTooltip content={INFO_DOCUMENTI[doc]} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

export default function SalTab({ p, aggiorna }: { p: Progetto; aggiorna: Aggiorna }) {
  const dim = useAppStore((s) => s.dimensioneImpresa);
  const numeroDipendenti = useAppStore((s) => s.dipendenti.length);
  const classe = classeNostraImpresa(dim, numeroDipendenti);
  const intensita = intensitaNostra(p, classe);
  const periodi = periodiSal(p);
  const sal = allineaSal(p);
  // Open by default: the first SAL not yet paid out (the one you're working on).
  const corrente = periodi.find((per) => sal.find((s) => s.numero === per.numero)?.stato !== 'erogato')?.numero;
  const totaleContributo = periodi.reduce((tot, per) => {
    const s = sal.find((x) => x.numero === per.numero)!;
    return tot + contributoAtteso({ RI: s.costiRendicontati.RI ?? {}, SS: s.costiRendicontati.SS ?? {} }, intensita);
  }, 0);

  const aggiornaSal = (numero: number) => (change: (s: Sal) => Sal) =>
    aggiorna((x) => ({ ...x, sal: allineaSal(x).map((s) => (s.numero === numero ? change(s) : s)) }));

  return (
    <div className="space-y-4">
      <AvvisiBox avvisi={avvisiSal(p)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            SAL e rendicontazione
            <InfoTooltip content="Stato avanzamento lavori: ogni sei mesi rendiconti le spese per ricevere il contributo. Chiudere la documentazione in 45 giorni riduce gli errori e tiene in equilibrio la cassa." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Campo label="Periodicità SAL (mesi)" info="periodicitaSal">
              <NumeroInput step="1" min="1" value={p.salMesi} onChange={(v) => aggiorna({ salMesi: Math.max(v ?? 6, 1) })} />
            </Campo>
            <Campo label="Target interno (giorni dalla chiusura)" info="targetInterno">
              <NumeroInput step="1" value={p.targetInternoGiorni} onChange={(v) => aggiorna({ targetInternoGiorni: v ?? 45 })} />
            </Campo>
            <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
              <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Intensità di aiuto (noi) <Info k="intensitaNoi" />
            </div>
              <div className="font-semibold">
                RI {intensita.ri}% · SS {intensita.ss}%
              </div>
              <div className="text-xs text-muted-foreground">
                {classe ? NOME_CLASSE[classe] : TIPI_SOGGETTO.find((t) => t.id === intensita.tipo)?.label}
                {p.collaborazioneEffettiva && p.bando.maggiorazionePct ? ` · +${p.bando.maggiorazionePct} collaborazione` : ''}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
              <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contributo atteso totale <Info k="contributoAtteso" />
            </div>
              <div className="font-semibold">{eur(totaleContributo)}</div>
              <div className="text-xs text-muted-foreground">sui costi rendicontati</div>
            </div>
          </div>

          {periodi.length === 0 ? (
            <p className="text-sm text-muted-foreground">Imposta data di inizio e durata nella Scheda progetto per generare i SAL.</p>
          ) : (
            <div className="space-y-2">
              {periodi.map((per) => (
                <SalCard
                  key={per.numero}
                  p={p}
                  per={per}
                  sal={sal.find((s) => s.numero === per.numero)!}
                  intensita={intensita}
                  aperto={per.numero === corrente}
                  aggiornaSal={aggiornaSal(per.numero)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
