import type { AttivitaPorter, AttoreFiliera, Dipendente, TipoAttore } from '../../types/domain';
import { fullName } from '../hr/hr';

export interface AttivitaDef {
  id: AttivitaPorter;
  nome: string;
  area: 'primaria' | 'supporto';
  descrizione: string;
}

/** Order matters: it's the left-to-right / top-to-bottom order of Porter's diagram. */
export const ATTIVITA: AttivitaDef[] = [
  {
    id: 'infrastruttura',
    nome: "Infrastruttura dell'impresa",
    area: 'supporto',
    descrizione: 'Direzione, pianificazione, amministrazione, finanza, legale, qualità.',
  },
  {
    id: 'risorse-umane',
    nome: 'Gestione delle risorse umane',
    area: 'supporto',
    descrizione: 'Selezione, formazione, sviluppo e retribuzione del personale.',
  },
  {
    id: 'tecnologia',
    nome: 'Sviluppo della tecnologia',
    area: 'supporto',
    descrizione: 'Ricerca e sviluppo, software, design, miglioramento di prodotto e di processo.',
  },
  {
    id: 'approvvigionamento',
    nome: 'Approvvigionamenti',
    area: 'supporto',
    descrizione: "Acquisto di materie prime, servizi, attrezzature e di tutto ciò che l'impresa usa.",
  },
  {
    id: 'logistica-entrata',
    nome: 'Logistica in entrata',
    area: 'primaria',
    descrizione: 'Ricevimento, stoccaggio e movimentazione degli input.',
  },
  {
    id: 'operations',
    nome: 'Attività operative',
    area: 'primaria',
    descrizione: 'Trasformazione degli input nel prodotto o servizio finale.',
  },
  {
    id: 'logistica-uscita',
    nome: 'Logistica in uscita',
    area: 'primaria',
    descrizione: 'Stoccaggio, spedizione e consegna del prodotto al cliente.',
  },
  {
    id: 'marketing-vendite',
    nome: 'Marketing e vendite',
    area: 'primaria',
    descrizione: 'Pubblicità, promozione, canali di vendita, pricing, forza vendita.',
  },
  {
    id: 'servizi',
    nome: 'Servizi post-vendita',
    area: 'primaria',
    descrizione: 'Assistenza, installazione, manutenzione, gestione dei resi.',
  },
];

export const ATTIVITA_SUPPORTO = ATTIVITA.filter((a) => a.area === 'supporto');
export const ATTIVITA_PRIMARIE = ATTIVITA.filter((a) => a.area === 'primaria');

export function attivitaDef(id: AttivitaPorter): AttivitaDef {
  return ATTIVITA.find((a) => a.id === id)!;
}

export const TIPI_ATTORE: Array<{ id: TipoAttore; label: string }> = [
  { id: 'interno', label: 'Interno' },
  { id: 'fornitore', label: 'Fornitore' },
  { id: 'partner', label: 'Partner' },
  { id: 'distributore', label: 'Distributore' },
  { id: 'consulente', label: 'Consulente' },
  { id: 'altro', label: 'Altro' },
];

export function tipoLabel(tipo: TipoAttore): string {
  return TIPI_ATTORE.find((t) => t.id === tipo)?.label ?? tipo;
}

export function nomeAttore(a: AttoreFiliera, dipendenti: Dipendente[]): string {
  if (a.dipendenteId) {
    const d = dipendenti.find((x) => x.id === a.dipendenteId);
    if (d) return fullName(d) || 'Senza nome';
  }
  return a.nome.trim() || 'Senza nome';
}

export interface RiepilogoAttore {
  chiave: string;
  nome: string;
  tipo: TipoAttore;
  attivita: AttivitaPorter[];
}

/**
 * The product's actors grouped by who they are (same dipendente, or same name + tipo
 * case-insensitively), each with the activities they cover in diagram order — so a supplier
 * present in three activities shows up once.
 */
export function riepilogoAttori(attori: AttoreFiliera[], dipendenti: Dipendente[]): RiepilogoAttore[] {
  const ordine = ATTIVITA.map((a) => a.id);
  const byKey = new Map<string, RiepilogoAttore>();
  for (const a of attori) {
    const nome = nomeAttore(a, dipendenti);
    const chiave = a.dipendenteId ? `d:${a.dipendenteId}` : `${a.tipo}:${nome.toLowerCase().replace(/\s+/g, ' ')}`;
    const voce = byKey.get(chiave) ?? { chiave, nome, tipo: a.tipo, attivita: [] };
    if (!voce.attivita.includes(a.attivita)) voce.attivita.push(a.attivita);
    byKey.set(chiave, voce);
  }
  for (const v of byKey.values()) v.attivita.sort((x, y) => ordine.indexOf(x) - ordine.indexOf(y));
  return [...byKey.values()].sort((x, y) => x.nome.localeCompare(y.nome, 'it'));
}
