import { describe, expect, it } from 'vitest';
import { codiceOr } from './calcoli';
import { nuovoProgetto } from './defaults';
import { aggiungiDeliverable, aggiungiOr, aggiungiTask, rimuoviOr, spostaOr } from './modifiche';
import type { Progetto } from '../../types/domain';

function conDueOr(): Progetto {
  let p: Progetto = { ...nuovoProgetto('X'), durataMesi: 12 };
  p = aggiungiOr(aggiungiOr(p));
  const [a, b] = p.or;
  p = aggiungiTask(aggiungiTask(p, a.id), b.id);
  const [t1, t2] = p.task;
  p = aggiungiDeliverable(aggiungiDeliverable(p, t1.id), t1.id);
  p = {
    ...p,
    task: p.task.map((t) => (t.id === t2.id ? { ...t, predecessoriIds: [t1.id] } : t)),
    milestone: [{ id: 'm', codice: 'M1', titolo: '', mese: 6, deliverableIds: p.deliverable.map((d) => d.id), raggiunta: false }],
    rischi: [{ ...p.rischi[0], orId: a.id }],
    organizzazione: [{ id: 'g', ruolo: 'gruppo-lavoro', orId: a.id, dipendenteId: null, nomeEsterno: 'Anna' }],
  };
  return p;
}

describe('modifiche WBS', () => {
  it('codes deliverables after their task, with a suffix for the second one', () => {
    expect(conDueOr().deliverable.map((d) => d.codice)).toEqual(['D1.1', 'D1.1.2']);
  });

  it('moving an OR renumbers the codes', () => {
    const p = conDueOr();
    const [a, b] = p.or;
    const spostato = spostaOr(p, b.id, -1);
    expect(codiceOr(spostato, b.id)).toBe('OR 1');
    expect(codiceOr(spostato, a.id)).toBe('OR 2');
    expect(spostaOr(p, a.id, -1)).toBe(p); // already first
  });

  it('removing an OR leaves nothing dangling', () => {
    const p = conDueOr();
    const via = rimuoviOr(p, p.or[0].id);
    expect(via.or).toHaveLength(1);
    expect(via.task).toHaveLength(1);
    expect(via.task[0].predecessoriIds).toEqual([]);
    expect(via.deliverable).toEqual([]);
    expect(via.milestone[0].deliverableIds).toEqual([]);
    expect(via.rischi[0].orId).toBeNull();
    expect(via.organizzazione).toEqual([]);
  });
});
