import { nanoid } from 'nanoid';
import type { Deliverable, Milestone, ObiettivoRealizzativo, Progetto, Task } from '../../types/domain';
import { codiceTask, orOrdinati, taskDiOr } from './calcoli';

/** Pure edits on a Progetto that touch more than one list, so nothing is left dangling. */

export function aggiungiOr(p: Progetto): Progetto {
  const or: ObiettivoRealizzativo = {
    id: nanoid(),
    ordine: Math.max(0, ...p.or.map((o) => o.ordine)) + 1,
    titolo: '',
    obiettivo: '',
    tipologia: null,
    leader: { dipendenteId: null, nomeEsterno: '' },
    partnerIds: [],
    meseInizio: null,
    meseFine: null,
  };
  return { ...p, or: [...p.or, or] };
}

/** Swaps an OR with its neighbour (-1 = up, +1 = down). */
export function spostaOr(p: Progetto, orId: string, verso: -1 | 1): Progetto {
  const ordinati = orOrdinati(p);
  const i = ordinati.findIndex((o) => o.id === orId);
  const j = i + verso;
  if (i < 0 || j < 0 || j >= ordinati.length) return p;
  const a = ordinati[i];
  const b = ordinati[j];
  return {
    ...p,
    or: p.or.map((o) => (o.id === a.id ? { ...o, ordine: b.ordine } : o.id === b.id ? { ...o, ordine: a.ordine } : o)),
  };
}

export function rimuoviTask(p: Progetto, taskIds: string[]): Progetto {
  const via = new Set(taskIds);
  const deliverableVia = new Set(p.deliverable.filter((d) => via.has(d.taskId)).map((d) => d.id));
  return {
    ...p,
    task: p.task
      .filter((t) => !via.has(t.id))
      .map((t) => ({ ...t, predecessoriIds: t.predecessoriIds.filter((id) => !via.has(id)) })),
    deliverable: p.deliverable.filter((d) => !deliverableVia.has(d.id)),
    milestone: p.milestone.map((m) => ({ ...m, deliverableIds: m.deliverableIds.filter((id) => !deliverableVia.has(id)) })),
  };
}

/** Removes the OR with its tasks and deliverables; risks and teams tied to it are detached. */
export function rimuoviOr(p: Progetto, orId: string): Progetto {
  const senzaTask = rimuoviTask(
    p,
    p.task.filter((t) => t.orId === orId).map((t) => t.id),
  );
  return {
    ...senzaTask,
    or: senzaTask.or.filter((o) => o.id !== orId),
    rischi: senzaTask.rischi.map((r) => (r.orId === orId ? { ...r, orId: null } : r)),
    organizzazione: senzaTask.organizzazione.filter((m) => m.orId !== orId),
    sal: senzaTask.sal.map((s) => {
      const documenti = { ...s.documenti };
      delete documenti[orId];
      return { ...s, documenti };
    }),
  };
}

export function aggiungiTask(p: Progetto, orId: string): Progetto {
  const fratelli = taskDiOr(p, orId);
  const or = p.or.find((o) => o.id === orId);
  const inizio = or?.meseInizio ?? (fratelli.length ? Math.max(...fratelli.map((t) => t.meseFine)) + 1 : 1);
  const durata = p.durataMesi ?? inizio + 2;
  const t: Task = {
    id: nanoid(),
    orId,
    ordine: Math.max(0, ...fratelli.map((x) => x.ordine)) + 1,
    titolo: '',
    meseInizio: Math.min(inizio, durata),
    meseFine: Math.min(inizio + 2, durata),
    partnerIds: [],
    predecessoriIds: [],
    costiStimati: {},
    avanzamentoPct: 0,
  };
  return { ...p, task: [...p.task, t] };
}

/** D + task code (D1.2), with a suffix when the task already has deliverables (D1.2.2). */
export function aggiungiDeliverable(p: Progetto, taskId: string): Progetto {
  const t = p.task.find((x) => x.id === taskId);
  if (!t) return p;
  const esistenti = p.deliverable.filter((d) => d.taskId === taskId).length;
  const base = `D${codiceTask(p, t)}`;
  const d: Deliverable = {
    id: nanoid(),
    taskId,
    codice: esistenti ? `${base}.${esistenti + 1}` : base,
    titolo: '',
    mese: t.meseFine,
    stato: 'da-fare',
  };
  return { ...p, deliverable: [...p.deliverable, d] };
}

export function aggiungiMilestone(p: Progetto): Progetto {
  const m: Milestone = {
    id: nanoid(),
    codice: `M${p.milestone.length + 1}`,
    titolo: '',
    mese: p.durataMesi ?? 1,
    deliverableIds: [],
    raggiunta: false,
  };
  return { ...p, milestone: [...p.milestone, m] };
}
