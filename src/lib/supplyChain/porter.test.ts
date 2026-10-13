import { describe, expect, it } from 'vitest';
import { ATTIVITA_PRIMARIE, ATTIVITA_SUPPORTO, nomeAttore, riepilogoAttori } from './porter';
import type { AttoreFiliera, Dipendente } from '../../types/domain';

let n = 0;
function attore(patch: Partial<AttoreFiliera>): AttoreFiliera {
  return {
    id: String(n++),
    prodottoId: 'p1',
    attivita: 'operations',
    tipo: 'fornitore',
    dipendenteId: null,
    nome: '',
    note: '',
    ...patch,
  };
}

const anna: Dipendente = {
  id: 'd1',
  nome: 'Anna',
  cognome: 'Rossi',
  dataNascita: '',
  ruoloId: null,
  email: '',
  telefono: '',
  dataAssunzione: '',
  note: '',
};

describe('catena di Porter', () => {
  it('has 5 primary and 4 support activities', () => {
    expect(ATTIVITA_PRIMARIE).toHaveLength(5);
    expect(ATTIVITA_SUPPORTO).toHaveLength(4);
  });
});

describe('nomeAttore', () => {
  it('uses the dipendente’s current name, falling back to the stored one if they’re gone', () => {
    expect(nomeAttore(attore({ tipo: 'interno', dipendenteId: 'd1', nome: 'vecchio' }), [anna])).toBe('Anna Rossi');
    expect(nomeAttore(attore({ tipo: 'interno', dipendenteId: 'd1', nome: 'Anna Rossi' }), [])).toBe('Anna Rossi');
  });
});

describe('riepilogoAttori', () => {
  it('merges the same actor across activities, in diagram order', () => {
    const r = riepilogoAttori(
      [
        attore({ nome: 'Tipografia Rossi', attivita: 'servizi' }),
        attore({ nome: 'tipografia  rossi', attivita: 'approvvigionamento' }),
        attore({ nome: 'Tipografia Rossi', tipo: 'partner', attivita: 'operations' }), // other tipo: separate
      ],
      [],
    );
    expect(r).toHaveLength(2);
    const fornitore = r.find((x) => x.tipo === 'fornitore')!;
    expect(fornitore.attivita).toEqual(['approvvigionamento', 'servizi']);
  });
});
