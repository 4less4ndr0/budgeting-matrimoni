import type { ReactNode } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  avanzamentoOr,
  avvisiGantt,
  codiceOr,
  codiceTask,
  mesiOr,
  orOrdinati,
  periodiSal,
  periodoMese,
  posizioneOggi,
  taskDiOr,
} from '@/lib/progetti/calcoli';
import { cn } from '@/lib/utils';
import type { Progetto, TipologiaRS } from '@/types/domain';
import { AvvisiBox } from './comuni';

const COL = 34; // px per mese
const ETICHETTA = 'w-40 sm:w-56';

// Bars: RI and SS have their own colour AND a text label (never colour alone). The completed
// part is the more saturated one in both themes.
const BARRA: Record<TipologiaRS | 'nc', { vuota: string; piena: string }> = {
  RI: { vuota: 'bg-sky-300/60 dark:bg-sky-900/70', piena: 'bg-sky-600 dark:bg-sky-400' },
  SS: { vuota: 'bg-violet-300/60 dark:bg-violet-900/70', piena: 'bg-violet-600 dark:bg-violet-400' },
  nc: { vuota: 'bg-muted-foreground/25', piena: 'bg-muted-foreground/60' },
};

const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function Riga({
  etichetta,
  mesi,
  oggi,
  children,
  className,
  altezza = 'h-8',
}: {
  etichetta: ReactNode;
  mesi: number;
  oggi: number | null;
  children?: ReactNode;
  className?: string;
  altezza?: string;
}) {
  return (
    <div className={cn('flex border-b last:border-b-0', className)}>
      <div className={cn('sticky left-0 z-10 flex shrink-0 items-center border-r bg-card px-2 text-xs', ETICHETTA, altezza)}>
        {etichetta}
      </div>
      <div
        className={cn('relative shrink-0', altezza)}
        style={{
          width: mesi * COL,
          // Month grid lines.
          backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${COL - 1}px, hsl(var(--border)) ${COL - 1}px ${COL}px)`,
        }}
      >
        {children}
        {oggi !== null && <div className="absolute inset-y-0 z-[5] w-0.5 bg-red-500" style={{ left: oggi * COL }} />}
      </div>
    </div>
  );
}

function Barra({
  da,
  a,
  tipologia,
  avanzamento,
  sottile,
}: {
  da: number;
  a: number;
  tipologia: TipologiaRS | null;
  avanzamento: number;
  sottile?: boolean;
}) {
  const colori = BARRA[tipologia ?? 'nc'];
  const larghezza = (a - da + 1) * COL - 4;
  return (
    <div
      className={cn('absolute overflow-hidden rounded', colori.vuota, sottile ? 'top-2 h-4' : 'top-1.5 h-5')}
      style={{ left: (da - 1) * COL + 2, width: larghezza }}
      title={`M${da}–M${a} · ${Math.round(avanzamento)}%`}
    >
      <div className={cn('h-full', colori.piena)} style={{ width: `${Math.min(Math.max(avanzamento, 0), 100)}%` }} />
      <span className="absolute inset-0 flex items-center px-1 text-[10px] font-semibold leading-none text-foreground">
        {tipologia ?? '?'}
      </span>
    </div>
  );
}

export default function GanttTab({ p }: { p: Progetto }) {
  const mesi = p.durataMesi ?? 0;
  const inizio = periodoMese(p, 1);
  if (!mesi || !inizio) {
    return (
      <p className="text-sm text-muted-foreground">
        Imposta data di inizio e durata nella Scheda progetto per vedere il Gantt.
      </p>
    );
  }

  const oggi = posizioneOggi(p);
  const ors = orOrdinati(p);
  const sal = periodiSal(p);
  const fineM = periodoMese(p, mesi)!.al;
  const anni = Math.ceil(mesi / 12);

  /** Date → fractional month position (0 = start of M1), clamped to the chart. */
  const posizione = (d: Date) => {
    for (let m = 1; m <= mesi; m++) {
      const per = periodoMese(p, m)!;
      if (d <= per.al) {
        const giorni = differenceInCalendarDays(per.al, per.dal) + 1;
        return m - 1 + Math.max(differenceInCalendarDays(d, per.dal), 0) / giorni;
      }
    }
    return mesi + differenceInCalendarDays(d, fineM) / 30;
  };

  return (
    <div className="space-y-4">
      <AvvisiBox avvisi={avvisiGantt(p)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Gantt
            <InfoTooltip content="Il cronoprogramma: per ogni attività quando inizia, quanto dura e a che punto è. Sotto vedi i SAL e le scadenze di rendicontazione." />
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-sky-600 dark:bg-sky-400" /> RI · ricerca industriale
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-violet-600 dark:bg-violet-400" /> SS · sviluppo sperimentale
            </span>
            <span>tratto più intenso = completato</span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-0.5 bg-red-500" /> oggi
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <div className="w-max min-w-full">
              {/* Header: years, then months with real dates. */}
              <div className="flex border-b bg-secondary/50">
                <div className={cn('sticky left-0 z-10 shrink-0 border-r bg-secondary px-2 py-1 text-xs font-medium', ETICHETTA)}>
                  Anno
                </div>
                {Array.from({ length: anni }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 border-r px-1 py-1 text-center text-xs font-medium"
                    style={{ width: Math.min(12, mesi - i * 12) * COL }}
                  >
                    {ROMANI[i] ?? i + 1} anno
                  </div>
                ))}
              </div>
              <div className="flex border-b bg-secondary/30">
                <div className={cn('sticky left-0 z-10 shrink-0 border-r bg-secondary px-2 py-1 text-xs font-medium', ETICHETTA)}>
                  Attività
                </div>
                {Array.from({ length: mesi }, (_, i) => {
                  const d = periodoMese(p, i + 1)!.dal;
                  return (
                    <div key={i} className="shrink-0 border-r py-0.5 text-center leading-tight" style={{ width: COL }}>
                      <div className="text-[10px] font-medium">M{i + 1}</div>
                      <div className="text-[9px] text-muted-foreground">{format(d, 'MMM yy', { locale: it })}</div>
                    </div>
                  );
                })}
              </div>

              {ors.length === 0 && (
                <Riga etichetta={<span className="text-muted-foreground">Nessun OR nella WBS</span>} mesi={mesi} oggi={oggi} />
              )}

              {ors.map((or) => {
                const { inizio: da, fine: a } = mesiOr(p, or);
                return (
                  <div key={or.id}>
                    <Riga
                      mesi={mesi}
                      oggi={oggi}
                      className="bg-secondary/20"
                      etichetta={
                        <span className="truncate font-semibold" title={or.titolo}>
                          {codiceOr(p, or.id)} {or.titolo}
                        </span>
                      }
                    >
                      {da !== null && a !== null && (
                        <Barra da={da} a={a} tipologia={or.tipologia} avanzamento={avanzamentoOr(p, or.id)} />
                      )}
                    </Riga>
                    {taskDiOr(p, or.id).map((t) => (
                      <Riga
                        key={t.id}
                        mesi={mesi}
                        oggi={oggi}
                        etichetta={
                          <span className="truncate pl-3" title={t.titolo}>
                            {codiceTask(p, t)} {t.titolo}
                          </span>
                        }
                      >
                        <Barra da={t.meseInizio} a={t.meseFine} tipologia={or.tipologia} avanzamento={t.avanzamentoPct} sottile />
                      </Riga>
                    ))}
                  </div>
                );
              })}

              <Riga mesi={mesi} oggi={oggi} className="border-t-2" etichetta={<span className="font-semibold">Milestone</span>}>
                {p.milestone.map((m) => {
                  const fine = periodoMese(p, m.mese)?.al;
                  const ritardo = !m.raggiunta && fine && fine < new Date();
                  return (
                    <div
                      key={m.id}
                      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      style={{ left: (m.mese - 0.5) * COL }}
                      title={`${m.codice} ${m.titolo} · M${m.mese}${m.raggiunta ? ' · raggiunta' : ritardo ? ' · in ritardo' : ''}`}
                    >
                      <div
                        className={cn(
                          'h-3 w-3 rotate-45 border',
                          m.raggiunta
                            ? 'border-emerald-700 bg-emerald-500'
                            : ritardo
                              ? 'border-red-700 bg-red-500'
                              : 'border-foreground bg-background',
                        )}
                      />
                    </div>
                  );
                })}
              </Riga>

              <Riga mesi={mesi} oggi={oggi} etichetta={<span className="font-semibold">SAL</span>}>
                {sal.map((s) => (
                  <div
                    key={s.numero}
                    className="absolute top-1.5 flex h-5 items-center justify-center rounded border border-amber-600/50 bg-amber-500/20 text-[10px] font-semibold"
                    style={{ left: (s.meseDa - 1) * COL + 2, width: (s.meseA - s.meseDa + 1) * COL - 4 }}
                  >
                    SAL {s.numero}
                  </div>
                ))}
              </Riga>

              <Riga mesi={mesi} oggi={oggi} etichetta={<span className="text-muted-foreground">Rendicontazione</span>}>
                {sal.map((s) => {
                  const fineFinestra = s.scadenza ?? s.target;
                  const da = posizione(s.al) + 0.02;
                  const a = Math.min(posizione(fineFinestra), mesi);
                  if (a <= da) return null;
                  return (
                    <div
                      key={s.numero}
                      className="absolute top-2 h-4 rounded-sm border border-dashed border-amber-600/70 bg-[repeating-linear-gradient(45deg,hsl(38_92%_50%/.25)_0_4px,transparent_4px_8px)]"
                      style={{ left: da * COL, width: (a - da) * COL }}
                      title={`SAL ${s.numero}: da presentare entro il ${format(fineFinestra, 'd MMM yyyy', { locale: it })}${s.scadenza ? '' : ' (target interno: manca la scadenza del bando)'}`}
                    />
                  );
                })}
              </Riga>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
