import type { Dipendente, MembroOrgano, ModelloGovernance, OrganoId } from '../../types/domain';
import { fullName } from '../hr/hr';

export interface OrganoDef {
  id: OrganoId;
  nome: string;
  funzione: 'indirizzo' | 'gestione' | 'controllo' | 'revisione';
  descrizione: string;
  cariche: string[];
  /** Pre-selected when adding someone: the plain-member carica, not the presidency. */
  caricaDefault: string;
}

export const ORGANI: Record<OrganoId, OrganoDef> = {
  assemblea: {
    id: 'assemblea',
    nome: 'Assemblea dei soci',
    funzione: 'indirizzo',
    descrizione: 'Riunisce i soci: nomina gli organi sociali e decide sulle materie riservate dalla legge e dallo statuto.',
    cariche: ['Socio'],
    caricaDefault: 'Socio',
  },
  cda: {
    id: 'cda',
    nome: 'Consiglio di amministrazione',
    funzione: 'gestione',
    descrizione: "Gestisce l'impresa. Può essere sostituito da un amministratore unico.",
    cariche: ['Presidente', 'Amministratore delegato', 'Consigliere', 'Consigliere indipendente', 'Amministratore unico'],
    caricaDefault: 'Consigliere',
  },
  'collegio-sindacale': {
    id: 'collegio-sindacale',
    nome: 'Collegio sindacale',
    funzione: 'controllo',
    descrizione:
      "Vigila sul rispetto della legge e dello statuto e sull'adeguatezza dell'assetto organizzativo. 3 o 5 sindaci effettivi più 2 supplenti (art. 2397 c.c.); gli amministratori non possono farne parte (art. 2399 c.c.).",
    cariche: ['Presidente', 'Sindaco effettivo', 'Sindaco supplente'],
    caricaDefault: 'Sindaco effettivo',
  },
  'consiglio-sorveglianza': {
    id: 'consiglio-sorveglianza',
    nome: 'Consiglio di sorveglianza',
    funzione: 'controllo',
    descrizione:
      'Nominato dall’assemblea, nomina e revoca il consiglio di gestione, approva il bilancio e vigila sulla gestione. Almeno 3 componenti, che non possono essere anche consiglieri di gestione (art. 2409-duodecies c.c.).',
    cariche: ['Presidente', 'Consigliere di sorveglianza'],
    caricaDefault: 'Consigliere di sorveglianza',
  },
  'consiglio-gestione': {
    id: 'consiglio-gestione',
    nome: 'Consiglio di gestione',
    funzione: 'gestione',
    descrizione: "Nominato dal consiglio di sorveglianza, gestisce l'impresa. Almeno 2 componenti (art. 2409-novies c.c.).",
    cariche: ['Presidente', 'Consigliere delegato', 'Consigliere di gestione'],
    caricaDefault: 'Consigliere di gestione',
  },
  'comitato-controllo': {
    id: 'comitato-controllo',
    nome: 'Comitato per il controllo sulla gestione',
    funzione: 'controllo',
    descrizione:
      'Costituito all’interno del consiglio di amministrazione (art. 2409-octiesdecies c.c.): i suoi componenti sono amministratori indipendenti e senza deleghe esecutive.',
    cariche: ['Presidente', 'Componente'],
    caricaDefault: 'Componente',
  },
  revisore: {
    id: 'revisore',
    nome: 'Revisione legale dei conti',
    funzione: 'revisione',
    descrizione: 'Revisore legale o società di revisione esterna, nominati dall’assemblea: controllano la contabilità e il bilancio.',
    cariche: ['Revisore legale', 'Società di revisione'],
    caricaDefault: 'Revisore legale',
  },
};

/** How organi hang off each other in the diagram ("A nomina B" = B is a child of A). */
export interface NodoStruttura {
  organo: OrganoId;
  figli: NodoStruttura[];
  /** Organi costituiti *dentro* questo (il comitato nel CdA del monistico). */
  interni?: OrganoId[];
}

export interface ModelloDef {
  id: ModelloGovernance;
  nome: string;
  alias: string;
  sintesi: string;
  struttura: NodoStruttura;
}

export const MODELLI: ModelloDef[] = [
  {
    id: 'dualistico-orizzontale',
    nome: 'Dualistico orizzontale',
    alias: 'sistema tradizionale',
    sintesi:
      "L'assemblea nomina, uno accanto all'altro, chi gestisce (CdA) e chi controlla (collegio sindacale). È il modello di default delle S.p.A. italiane.",
    struttura: {
      organo: 'assemblea',
      figli: [
        { organo: 'cda', figli: [] },
        { organo: 'collegio-sindacale', figli: [] },
        { organo: 'revisore', figli: [] },
      ],
    },
  },
  {
    id: 'dualistico-verticale',
    nome: 'Dualistico verticale',
    alias: 'sistema dualistico, di origine tedesca',
    sintesi:
      "L'assemblea nomina il consiglio di sorveglianza, che a sua volta nomina il consiglio di gestione: il controllo sta sopra la gestione.",
    struttura: {
      organo: 'assemblea',
      figli: [
        { organo: 'consiglio-sorveglianza', figli: [{ organo: 'consiglio-gestione', figli: [] }] },
        { organo: 'revisore', figli: [] },
      ],
    },
  },
  {
    id: 'monistico',
    nome: 'Monistico',
    alias: 'sistema di origine anglosassone',
    sintesi:
      "Un solo organo, il CdA, nominato dall'assemblea: il controllo lo fa un comitato formato da alcuni dei suoi stessi amministratori indipendenti.",
    struttura: {
      organo: 'assemblea',
      figli: [
        { organo: 'cda', interni: ['comitato-controllo'], figli: [] },
        { organo: 'revisore', figli: [] },
      ],
    },
  },
];

export function modelloDef(id: ModelloGovernance): ModelloDef {
  return MODELLI.find((m) => m.id === id)!;
}

/** Every organo the modello uses, diagram order, nested organi included. */
export function organiDelModello(id: ModelloGovernance): OrganoId[] {
  const out: OrganoId[] = [];
  const visit = (n: NodoStruttura) => {
    out.push(n.organo, ...(n.interni ?? []));
    n.figli.forEach(visit);
  };
  visit(modelloDef(id).struttura);
  return out;
}

/**
 * Identifies the same person across organi: the dipendente id, or the external name
 * case/space-insensitively (so "Mario Rossi" typed twice counts as one person).
 */
export function chiavePersona(m: Pick<MembroOrgano, 'dipendenteId' | 'nomeEsterno'>): string {
  return m.dipendenteId ? `d:${m.dipendenteId}` : `e:${m.nomeEsterno.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

export function nomeMembro(m: MembroOrgano, dipendenti: Dipendente[]): string {
  if (m.dipendenteId) {
    const d = dipendenti.find((x) => x.id === m.dipendenteId);
    return d ? fullName(d) || 'Senza nome' : 'Dipendente rimosso';
  }
  return m.nomeEsterno.trim() || 'Senza nome';
}

export interface Avviso {
  organo: OrganoId;
  testo: string;
}

/**
 * Coherence checks for the selected modello: empty organi and the main incompatibilities /
 * minimum sizes of the codice civile. They're warnings, not hard rules — the app never blocks
 * an assignment (statuti and special cases exist; the commercialista has the last word).
 */
export function verificaGovernance(modello: ModelloGovernance, membri: MembroOrgano[]): Avviso[] {
  const organi = organiDelModello(modello);
  const di = (o: OrganoId) => membri.filter((m) => m.organo === o);
  const chiavi = (o: OrganoId) => new Set(di(o).map(chiavePersona));
  const avvisi: Avviso[] = [];

  for (const o of organi) {
    if (di(o).length === 0) avvisi.push({ organo: o, testo: 'Nessuno ne fa parte.' });
  }

  const inEntrambi = (a: OrganoId, b: OrganoId) => {
    const ka = chiavi(a);
    return di(b).filter((m) => ka.has(chiavePersona(m)));
  };

  if (modello === 'dualistico-orizzontale') {
    const sindaci = di('collegio-sindacale');
    const supplenti = sindaci.filter((m) => m.carica === 'Sindaco supplente').length;
    const effettivi = sindaci.length - supplenti;
    if (sindaci.length > 0 && effettivi !== 3 && effettivi !== 5) {
      avvisi.push({ organo: 'collegio-sindacale', testo: `I sindaci effettivi devono essere 3 o 5 (ora ${effettivi}).` });
    }
    if (sindaci.length > 0 && supplenti !== 2) {
      avvisi.push({ organo: 'collegio-sindacale', testo: `I sindaci supplenti devono essere 2 (ora ${supplenti}).` });
    }
    if (inEntrambi('cda', 'collegio-sindacale').length > 0) {
      avvisi.push({ organo: 'collegio-sindacale', testo: 'Un amministratore non può essere anche sindaco.' });
    }
  }

  if (modello === 'dualistico-verticale') {
    const sorveglianza = di('consiglio-sorveglianza').length;
    const gestione = di('consiglio-gestione').length;
    if (sorveglianza > 0 && sorveglianza < 3) {
      avvisi.push({ organo: 'consiglio-sorveglianza', testo: `Servono almeno 3 componenti (ora ${sorveglianza}).` });
    }
    if (gestione > 0 && gestione < 2) {
      avvisi.push({ organo: 'consiglio-gestione', testo: `Servono almeno 2 componenti (ora ${gestione}).` });
    }
    if (inEntrambi('consiglio-sorveglianza', 'consiglio-gestione').length > 0) {
      avvisi.push({
        organo: 'consiglio-gestione',
        testo: 'Chi siede nel consiglio di sorveglianza non può essere anche consigliere di gestione.',
      });
    }
  }

  if (modello === 'monistico') {
    const cda = chiavi('cda');
    if (di('comitato-controllo').some((m) => !cda.has(chiavePersona(m)))) {
      avvisi.push({
        organo: 'comitato-controllo',
        testo: 'I componenti del comitato devono essere anche membri del consiglio di amministrazione.',
      });
    }
  }

  return avvisi;
}

export interface RiepilogoPersona {
  chiave: string;
  nome: string;
  dipendente: boolean;
  incarichi: Array<{ organo: OrganoId; carica: string }>;
}

/** "Who sits where", grouped by person — only organi of the selected modello. */
export function riepilogoPerPersona(
  modello: ModelloGovernance,
  membri: MembroOrgano[],
  dipendenti: Dipendente[],
): RiepilogoPersona[] {
  const organi = organiDelModello(modello);
  const byKey = new Map<string, RiepilogoPersona>();
  for (const m of membri) {
    if (!organi.includes(m.organo)) continue;
    const chiave = chiavePersona(m);
    const voce = byKey.get(chiave) ?? {
      chiave,
      nome: nomeMembro(m, dipendenti),
      dipendente: m.dipendenteId !== null,
      incarichi: [],
    };
    voce.incarichi.push({ organo: m.organo, carica: m.carica });
    byKey.set(chiave, voce);
  }
  for (const voce of byKey.values()) {
    voce.incarichi.sort((a, b) => organi.indexOf(a.organo) - organi.indexOf(b.organo));
  }
  return [...byKey.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}
