import { describe, expect, it } from 'vitest';
import { chiavePersona, organiDelModello, riepilogoPerPersona, verificaGovernance } from './modelli';
import type { MembroOrgano, OrganoId } from '../../types/domain';

let n = 0;
function membro(organo: OrganoId, nome: string, carica = 'Componente', dipendenteId: string | null = null): MembroOrgano {
  return { id: String(n++), organo, dipendenteId, nomeEsterno: dipendenteId ? '' : nome, carica };
}

describe('organiDelModello', () => {
  it('lists each modello’s organi, nested ones included', () => {
    expect(organiDelModello('dualistico-orizzontale')).toEqual(['assemblea', 'cda', 'collegio-sindacale', 'revisore']);
    expect(organiDelModello('dualistico-verticale')).toEqual([
      'assemblea',
      'consiglio-sorveglianza',
      'consiglio-gestione',
      'revisore',
    ]);
    expect(organiDelModello('monistico')).toEqual(['assemblea', 'cda', 'comitato-controllo', 'revisore']);
  });
});

describe('chiavePersona', () => {
  it('treats the same external name typed differently as one person', () => {
    expect(chiavePersona({ dipendenteId: null, nomeEsterno: ' Mario  Rossi ' })).toBe(
      chiavePersona({ dipendenteId: null, nomeEsterno: 'mario rossi' }),
    );
  });
});

describe('verificaGovernance', () => {
  const testi = (avvisi: ReturnType<typeof verificaGovernance>) => avvisi.map((a) => `${a.organo}: ${a.testo}`);

  it('flags every empty organo of the modello', () => {
    expect(verificaGovernance('monistico', []).map((a) => a.organo)).toEqual([
      'assemblea',
      'cda',
      'comitato-controllo',
      'revisore',
    ]);
  });

  it('tradizionale: wants 3 or 5 effettivi + 2 supplenti, and no amministratore among the sindaci', () => {
    const membri = [
      membro('cda', 'Anna'),
      membro('collegio-sindacale', 'Anna', 'Presidente'),
      membro('collegio-sindacale', 'Bruno', 'Sindaco effettivo'),
      membro('collegio-sindacale', 'Carla', 'Sindaco supplente'),
    ];
    const t = testi(verificaGovernance('dualistico-orizzontale', membri));
    expect(t).toContain('collegio-sindacale: I sindaci effettivi devono essere 3 o 5 (ora 2).');
    expect(t).toContain('collegio-sindacale: I sindaci supplenti devono essere 2 (ora 1).');
    expect(t).toContain('collegio-sindacale: Un amministratore non può essere anche sindaco.');
  });

  it('dualistico: minimum sizes and no one in both consigli', () => {
    const membri = [membro('consiglio-sorveglianza', 'Anna', 'Presidente', 'd1'), membro('consiglio-gestione', '', 'Presidente', 'd1')];
    const t = testi(verificaGovernance('dualistico-verticale', membri));
    expect(t).toContain('consiglio-sorveglianza: Servono almeno 3 componenti (ora 1).');
    expect(t).toContain('consiglio-gestione: Servono almeno 2 componenti (ora 1).');
    expect(t.some((x) => x.includes('non può essere anche consigliere di gestione'))).toBe(true);
  });

  it('monistico: comitato members must sit in the CdA', () => {
    const ok = [membro('cda', 'Anna'), membro('comitato-controllo', 'anna')];
    const ko = [membro('cda', 'Anna'), membro('comitato-controllo', 'Bruno')];
    expect(testi(verificaGovernance('monistico', ok)).some((x) => x.startsWith('comitato-controllo: I componenti'))).toBe(false);
    expect(testi(verificaGovernance('monistico', ko)).some((x) => x.startsWith('comitato-controllo: I componenti'))).toBe(true);
  });
});

describe('riepilogoPerPersona', () => {
  it('groups incarichi per person and ignores organi outside the modello', () => {
    const membri = [
      membro('assemblea', 'Anna', 'Socio'),
      membro('cda', 'Anna', 'Presidente'),
      membro('collegio-sindacale', 'Bruno', 'Sindaco effettivo'), // not in monistico
    ];
    const r = riepilogoPerPersona('monistico', membri, []);
    expect(r).toHaveLength(1);
    expect(r[0].incarichi).toEqual([
      { organo: 'assemblea', carica: 'Socio' },
      { organo: 'cda', carica: 'Presidente' },
    ]);
  });
});
