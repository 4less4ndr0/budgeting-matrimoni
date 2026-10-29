import type { AppState, Progetto, TipologiaRS } from '../../types/domain';
import { classeNostraImpresa } from '../dimensione/dimensione';
import {
  allineaSal,
  classificaPortafoglio,
  codiceOr,
  codiceTask,
  contributoAtteso,
  costiPianificati,
  costoTask,
  documentiMancanti,
  intensitaNostra,
  isoGiorno,
  livelloRischio,
  mesiOr,
  nomePersona,
  orOrdinati,
  periodiSal,
  taskDiOr,
  termini,
  totaleCosti,
} from '../progetti/calcoli';

type Riga = Record<string, string | number>;

const RUOLI: Record<string, string> = {
  'steering-committee': 'Steering Committee',
  pm: 'Responsabile tecnico (PM)',
  ra: 'Responsabile Amministrativo (RA)',
  'referente-istruttori': 'Referente rapporti istruttori',
  'gruppo-lavoro': 'Gruppo di lavoro',
};

function titolo(p: Progetto): string {
  return p.titolo.trim() || 'Progetto senza titolo';
}

/** One sheet per Progetti tab, every project in it (first column = progetto). */
export function fogliProgetti(state: AppState): Array<{ nome: string; righe: Riga[] }> {
  const { criteri, progetti } = state.progetti;
  if (progetti.length === 0) return [];
  const dip = state.dipendenti;
  const classe = classeNostraImpresa(state.dimensioneImpresa, dip.length);
  const classifica = classificaPortafoglio(criteri, progetti);

  const portafoglio: Riga[] = progetti.map((p) => {
    const pt = classifica.punteggi.find((x) => x.progettoId === p.id);
    const riga: Riga = {
      progetto: titolo(p),
      stato: p.stato,
      bando: p.bando.nome,
      inizio: p.dataInizio,
      durata_mesi: p.durataMesi ?? '',
      budget: p.budgetTotale ?? '',
      somma_voti: pt?.somma ?? '',
      media_pesata: pt?.mediaPesata ?? '',
      prioritario: classifica.prioritariIds.includes(p.id) ? (classifica.prioritariIds.length > 1 ? 'a pari merito' : 'sì') : '',
    };
    for (const c of criteri) riga[`voto: ${c.nome} (peso ${c.peso})`] = p.voti[c.id] ?? '';
    return riga;
  });

  const wbs: Riga[] = [];
  const gantt: Riga[] = [];
  const maxMesi = Math.max(0, ...progetti.map((p) => p.durataMesi ?? 0));
  const ganttRiga = (p: Progetto, attivita: string, tipologia: TipologiaRS | null, da: number | null, a: number | null, avanzamento: number) => {
    const r: Riga = { progetto: titolo(p), attivita, tipologia: tipologia ?? '', avanzamento: `${Math.round(avanzamento)}%` };
    for (let m = 1; m <= maxMesi; m++) r[`M${m}`] = da !== null && a !== null && m >= da && m <= a ? '■' : '';
    return r;
  };

  for (const p of progetti) {
    for (const or of orOrdinati(p)) {
      const { inizio, fine } = mesiOr(p, or);
      const tasks = taskDiOr(p, or.id);
      const avanzamento = tasks.length ? tasks.reduce((s, t) => s + t.avanzamentoPct, 0) / tasks.length : 0;
      wbs.push({
        progetto: titolo(p),
        codice: codiceOr(p, or.id),
        titolo: or.titolo,
        tipologia: or.tipologia ?? '',
        responsabile: nomePersona(or.leader, dip),
        mesi: inizio !== null ? `M${inizio}–M${fine}` : '',
        costo_stimato: tasks.reduce((s, t) => s + costoTask(t), 0),
        avanzamento: '',
        deliverable: '',
      });
      gantt.push(ganttRiga(p, `${codiceOr(p, or.id)} ${or.titolo}`, or.tipologia, inizio, fine, avanzamento));
      for (const t of tasks) {
        wbs.push({
          progetto: titolo(p),
          codice: codiceTask(p, t),
          titolo: t.titolo,
          tipologia: or.tipologia ?? '',
          responsabile: '',
          mesi: `M${t.meseInizio}–M${t.meseFine}`,
          costo_stimato: costoTask(t),
          avanzamento: `${t.avanzamentoPct}%`,
          deliverable: p.deliverable
            .filter((d) => d.taskId === t.id)
            .map((d) => `${d.codice} ${d.titolo} (M${d.mese}, ${d.stato})`)
            .join('; '),
        });
        gantt.push(ganttRiga(p, `  ${codiceTask(p, t)} ${t.titolo}`, or.tipologia, t.meseInizio, t.meseFine, t.avanzamentoPct));
      }
    }
    for (const m of [...p.milestone].sort((a, b) => a.mese - b.mese)) {
      const r = ganttRiga(p, `◆ ${m.codice} ${m.titolo}`, null, null, null, m.raggiunta ? 100 : 0);
      if (m.mese <= maxMesi) r[`M${m.mese}`] = '◆';
      gantt.push(r);
    }
  }

  const organizzazione: Riga[] = progetti.flatMap((p) => [
    ...p.organizzazione.map((m) => ({
      progetto: titolo(p),
      ruolo: RUOLI[m.ruolo],
      or: m.orId ? codiceOr(p, m.orId) : '',
      persona: nomePersona(m, dip),
    })),
    ...orOrdinati(p).map((or) => ({
      progetto: titolo(p),
      ruolo: termini(p).leader,
      or: codiceOr(p, or.id),
      persona: nomePersona(or.leader, dip),
    })),
  ]);

  const rischi: Riga[] = progetti.flatMap((p) =>
    p.rischi.map((r) => {
      const { punteggio, livello } = livelloRischio(r.probabilita, r.impatto);
      return {
        progetto: titolo(p),
        tipo: r.tipo,
        descrizione: r.descrizione,
        or: r.orId ? codiceOr(p, r.orId) : 'progetto',
        probabilita: r.probabilita,
        impatto: r.impatto,
        livello: `${livello} (${punteggio})`,
        segnale: r.segnale,
        azione_o_prevenzione: r.azione,
        responsabile: nomePersona(r.responsabile, dip),
        stato: r.stato,
      };
    }),
  );

  const sal: Riga[] = progetti.flatMap((p) => {
    const intensita = intensitaNostra(p, classe);
    const salStored = allineaSal(p);
    return periodiSal(p).map((per) => {
      const s = salStored.find((x) => x.numero === per.numero)!;
      const rend = { RI: s.costiRendicontati.RI ?? {}, SS: s.costiRendicontati.SS ?? {} };
      const pian = costiPianificati(p, per.meseDa, per.meseA);
      return {
        progetto: titolo(p),
        sal: per.numero,
        mesi: `M${per.meseDa}–M${per.meseA}`,
        dal: isoGiorno(per.dal),
        al: isoGiorno(per.al),
        scadenza_bando: per.scadenza ? isoGiorno(per.scadenza) : '',
        target_interno: isoGiorno(per.target),
        stato: s.stato,
        pianificati_RI: Math.round(totaleCosti(pian, 'RI') * 100) / 100,
        pianificati_SS: Math.round(totaleCosti(pian, 'SS') * 100) / 100,
        rendicontati_RI: totaleCosti(rend, 'RI'),
        rendicontati_SS: totaleCosti(rend, 'SS'),
        contributo_atteso: Math.round(contributoAtteso(rend, intensita) * 100) / 100,
        documenti_mancanti: documentiMancanti(p, s),
      };
    });
  });

  return [
    { nome: 'Portafoglio', righe: portafoglio },
    { nome: 'WBS', righe: wbs },
    { nome: 'Gantt', righe: gantt },
    { nome: 'Organizzazione', righe: organizzazione },
    { nome: 'Rischi', righe: rischi },
    { nome: 'SAL', righe: sal },
  ];
}
