import { describe, expect, it } from 'vitest';
import {
  avvisiGantt,
  avvisiOrganizzazione,
  avvisiSal,
  avvisiScheda,
  avvisiWbs,
  classificaPortafoglio,
  codiceOr,
  codiceTask,
  contributoAtteso,
  costiPianificati,
  generaRiunioni,
  intensitaNostra,
  isoGiorno,
  livelloRischio,
  mesiOr,
  periodiSal,
  posizioneOggi,
} from './calcoli';
import { criteriPredefiniti, nuovoProgetto, presetAccordiInnovazione, withProgettiDefaults } from './defaults';
import type { ObiettivoRealizzativo, Progetto, Task } from '../../types/domain';

function or(id: string, ordine: number, patch: Partial<ObiettivoRealizzativo> = {}): ObiettivoRealizzativo {
  return {
    id,
    ordine,
    titolo: `OR ${id}`,
    obiettivo: '',
    tipologia: 'RI',
    leader: { dipendenteId: null, nomeEsterno: 'Leader' },
    partnerIds: [],
    meseInizio: null,
    meseFine: null,
    ...patch,
  };
}

function task(id: string, orId: string, ordine: number, da: number, a: number, patch: Partial<Task> = {}): Task {
  return {
    id,
    orId,
    ordine,
    titolo: id,
    meseInizio: da,
    meseFine: a,
    partnerIds: [],
    predecessoriIds: [],
    costiStimati: {},
    avanzamentoPct: 0,
    ...patch,
  };
}

function progetto(patch: Partial<Progetto> = {}): Progetto {
  return { ...nuovoProgetto('Test'), dataInizio: '2026-01-01', durataMesi: 18, ...patch };
}

describe('struttura', () => {
  it('codes tasks by position and derives OR months from tasks unless overridden', () => {
    const p = progetto({
      or: [or('b', 2), or('a', 1)],
      task: [task('t2', 'a', 2, 4, 9), task('t1', 'a', 1, 1, 3), task('t3', 'b', 1, 6, 12)],
    });
    expect(codiceTask(p, p.task[0])).toBe('1.2');
    expect(codiceTask(p, p.task[2])).toBe('2.1');
    expect(mesiOr(p, p.or[1])).toEqual({ inizio: 1, fine: 9 });
    expect(mesiOr(p, { ...p.or[1], meseFine: 12 })).toEqual({ inizio: 1, fine: 12 });
  });
});

describe('portafoglio', () => {
  it('ranks by weighted average, says when it disagrees with the plain sum', () => {
    const criteri = criteriPredefiniti();
    const a = { ...progetto({ id: 'a' }), voti: { costo: 5, successo: 1 } };
    const b = { ...progetto({ id: 'b' }), voti: { costo: 2, successo: 3 } };
    const conPesiUguali = classificaPortafoglio(criteri, [a, b]);
    expect(conPesiUguali.prioritariIds).toEqual(['a']);
    expect(conPesiUguali.ordiniDiversi).toBe(false);

    const pesati = criteri.map((c) => (c.id === 'successo' ? { ...c, peso: 5 } : c));
    const r = classificaPortafoglio(pesati, [a, b]);
    expect(r.prioritariIds).toEqual(['b']); // (2 + 15) / 6 > (5 + 5) / 6
    expect(r.ordiniDiversi).toBe(true);
  });

  it('marks every project tied at the top, not an arbitrary one', () => {
    const a = { ...progetto({ id: 'a' }), voti: { costo: 4, successo: 2 } };
    const b = { ...progetto({ id: 'b' }), voti: { costo: 2, successo: 4 } };
    expect(classificaPortafoglio(criteriPredefiniti(), [a, b]).prioritariIds).toEqual(['a', 'b']);
  });

  it('only scores projects still in idea/pronto', () => {
    const c = classificaPortafoglio(criteriPredefiniti(), [progetto({ stato: 'in-corso', voti: { costo: 5 } })]);
    expect(c.punteggi).toEqual([]);
  });
});

describe('SAL', () => {
  it('splits the project every salMesi, with bando deadline and internal target', () => {
    const p = progetto({ bando: { ...nuovoProgetto('').bando, giorniPresentazioneSal: 60 } });
    const sal = periodiSal(p);
    expect(sal.map((s) => [s.meseDa, s.meseA])).toEqual([
      [1, 6],
      [7, 12],
      [13, 18],
    ]);
    expect(isoGiorno(sal[0].al)).toBe('2026-06-30');
    expect(isoGiorno(sal[0].scadenza!)).toBe('2026-08-29');
    expect(isoGiorno(sal[0].target)).toBe('2026-08-14');
  });

  it('spreads task costs over their months and splits them RI/SS', () => {
    const p = progetto({
      or: [or('r', 1, { tipologia: 'RI' }), or('s', 2, { tipologia: 'SS' })],
      task: [
        task('t1', 'r', 1, 4, 9, { costiStimati: { Personale: 6000 } }),
        task('t2', 's', 1, 7, 8, { costiStimati: { Materiali: 1000 } }),
      ],
    });
    const c = costiPianificati(p, 1, 6);
    expect(c.RI.Personale).toBe(3000); // 3 of 6 months
    expect(c.SS).toEqual({});
    expect(costiPianificati(p, 7, 12).SS.Materiali).toBe(1000);
  });

  it('expected contribution applies our intensity per RI/SS, maggiorazione capped at 80%', () => {
    const p = { ...progetto(), bando: presetAccordiInnovazione(nuovoProgetto('').bando) };
    expect(intensitaNostra(p, 'media')).toEqual({ tipo: 'media', ri: 35, ss: 35 });
    const conCollab = intensitaNostra({ ...p, collaborazioneEffettiva: true }, 'piccola');
    expect(conCollab.ri).toBe(60);
    expect(contributoAtteso({ RI: { Personale: 1000 }, SS: { Materiali: 1000 } }, { ri: 45, ss: 25 })).toBe(700);
  });
});

describe('rischi', () => {
  it('maps probabilità × impatto to the three levels', () => {
    expect(livelloRischio(2, 3)).toEqual({ punteggio: 6, livello: 'basso' });
    expect(livelloRischio(2, 4).livello).toBe('medio');
    expect(livelloRischio(3, 4).livello).toBe('medio');
    expect(livelloRischio(3, 5).livello).toBe('alto');
  });
});

describe('riunioni', () => {
  it('generates kick-off, SC every 2 months, pre-SAL and closing; keeps meetings already held', () => {
    const p = progetto({ durataMesi: 6 });
    const r = generaRiunioni(p);
    expect(r.map((x) => `${x.tipo} ${x.data}`)).toEqual([
      'kick-off 2026-01-01',
      'steering-committee 2026-03-01',
      'steering-committee 2026-05-01',
      'pre-sal 2026-06-23',
      'chiusura 2026-06-30',
    ]);
    const tenuta = { ...r[1], fatta: true, nota: 'Approvato D1.1' };
    const rigenerate = generaRiunioni({ ...p, riunioni: [tenuta] });
    expect(rigenerate.find((x) => x.id === tenuta.id)).toEqual(tenuta);
    expect(rigenerate).toHaveLength(5);
  });
});

describe('avvisi', () => {
  it('scheda: duration and budget against the bando', () => {
    const bando = { ...presetAccordiInnovazione(nuovoProgetto('').bando), durataMaxMesi: 12 };
    const a = avvisiScheda(progetto({ durataMesi: 18, budgetTotale: 1_000_000, bando }));
    expect(a[0]).toBe('Il progetto dura 18 mesi, il bando ne ammette al massimo 12.');
    expect(a[1]).toMatch(/fuori dal range/);
  });

  it('wbs: count, tipologia, mixed partners, leader, dates, deliverable, SS before RI, TRL', () => {
    const p = progetto({
      or: [
        or('r', 1, { titolo: "Analisi dello stato dell'arte", meseFine: 6 }),
        or('s', 2, { tipologia: 'SS', partnerIds: ['p1', 'p2'], leader: { dipendenteId: null, nomeEsterno: '' } }),
        or('x', 3, { tipologia: null }),
      ],
      task: [task('t1', 'r', 1, 1, 8), task('t2', 's', 1, 5, 10, { predecessoriIds: ['t1'] })],
      deliverable: [{ id: 'd', taskId: 't2', codice: 'D2.1', titolo: '', mese: 10, stato: 'da-fare' }],
    });
    const a = avvisiWbs(p);
    expect(a).toContain('Il progetto ha 3 OR: la buona pratica è tra 5 e 10.');
    expect(a).toContain('OR 3 non è classificato come RI o SS.');
    expect(a.some((x) => x.startsWith('OR 2 è a partecipazione mista'))).toBe(true);
    expect(a).toContain('OR 2 non ha un OR Leader.');
    expect(a).toContain("Il task 1.1 esce dai mesi dell'OR.");
    expect(a).toContain('Il task 1.1 non produce nessun deliverable.');
    expect(a).toContain('Il task 2.1 (SS) parte prima che finisca la ricerca da cui dipende.');
    expect(a).toContain("OR 1: se parli di stato dell'arte, esplicita che parti da TRL 3/4.");
  });

  it('organizzazione: SC size and PM chairing it', () => {
    const m = (id: string, ruolo: 'steering-committee' | 'pm', nome: string) => ({
      id,
      ruolo,
      orId: null,
      dipendenteId: null,
      nomeEsterno: nome,
    });
    const p = progetto({ organizzazione: [m('1', 'steering-committee', 'Anna'), m('2', 'pm', 'Bruno')] });
    expect(avvisiOrganizzazione(p)).toEqual([
      'Lo Steering Committee ha 1 membri: ne servono 3–5.',
      'Il PM deve presiedere lo Steering Committee.',
    ]);
  });

  it('gantt: milestones past and not reached', () => {
    const p = progetto({
      milestone: [
        { id: 'a', codice: 'M1', titolo: '', mese: 3, deliverableIds: [], raggiunta: false },
        { id: 'b', codice: 'M2', titolo: '', mese: 3, deliverableIds: [], raggiunta: true },
        { id: 'c', codice: 'M3', titolo: '', mese: 12, deliverableIds: [], raggiunta: false },
      ],
    });
    expect(avvisiGantt(p, new Date(2026, 5, 1))).toEqual(['M1 è in ritardo: aggiorna il Gantt.']);
  });

  it('sal: target after deadline, close deadline with missing documents, overspending', () => {
    const p = progetto({
      bando: { ...nuovoProgetto('').bando, giorniPresentazioneSal: 30 },
      or: [or('r', 1)],
      task: [task('t1', 'r', 1, 1, 6, { costiStimati: { Personale: 600 } })],
      sal: [
        {
          id: 's1',
          numero: 1,
          stato: 'in-preparazione',
          costiRendicontati: { RI: { Personale: 700 }, SS: {} },
          documenti: {},
        },
      ],
    });
    const a = avvisiSal(p, new Date(2026, 6, 20)); // scadenza SAL 1 = 30 luglio
    expect(a).toContain('SAL 1: il target interno cade dopo la scadenza del bando.');
    expect(a).toContain('SAL 1: mancano 10 giorni e 6 documenti.');
    expect(a).toContain('SAL 1: sforamento su Personale (RI).');
  });
});

describe('gantt', () => {
  it('puts today on the month grid, null outside the project', () => {
    const p = progetto();
    expect(posizioneOggi(p, new Date(2026, 0, 1))).toBe(0);
    expect(posizioneOggi(p, new Date(2026, 2, 16))).toBeCloseTo(2.48, 2);
    expect(posizioneOggi(p, new Date(2025, 11, 31))).toBeNull();
    expect(posizioneOggi(p, new Date(2027, 6, 1))).toBeNull();
  });
});

describe('withProgettiDefaults', () => {
  it('backfills a snapshot without the Progetti area, and old projects missing new fields', () => {
    expect(withProgettiDefaults(undefined).criteri).toHaveLength(5);
    const vecchio = { id: 'x', titolo: 'Vecchio', bando: { nome: 'Bando' } } as unknown as Progetto;
    const [p] = withProgettiDefaults({ progetti: [vecchio] }).progetti;
    expect(p.titolo).toBe('Vecchio');
    expect(p.bando.nome).toBe('Bando');
    expect(p.bando.categorieCosto.length).toBeGreaterThan(0);
    expect(p.salMesi).toBe(6);
    expect(p.nomenclatura).toBe('OR'); // projects saved before the OR/WP choice
    expect(p.task).toEqual([]);
  });
});

describe('nomenclatura OR / WP', () => {
  it('a WP project uses WP in codes, leader and warnings; OR stays the default', () => {
    const base = progetto({ or: [or('a', 1, { leader: { dipendenteId: null, nomeEsterno: '' } })] });
    expect(codiceOr(base, 'a')).toBe('OR 1');
    const wp = { ...base, nomenclatura: 'WP' as const };
    expect(codiceOr(wp, 'a')).toBe('WP 1');
    const a = avvisiWbs(wp);
    expect(a).toContain('Il progetto ha 1 WP: la buona pratica è tra 5 e 10.');
    expect(a).toContain('WP 1 non ha un WP Leader.');
  });
});
