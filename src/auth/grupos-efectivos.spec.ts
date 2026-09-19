import { describe, expect, it } from 'vitest';
import { obtenerGruposEfectivos } from './grupos-efectivos.js';

describe('obtenerGruposEfectivos', () => {
  it.each([
    {
      caso: 'claim ausente',
      claim: undefined,
      esperado: ['jugadores'],
    },
    {
      caso: 'arreglo vacio',
      claim: [],
      esperado: ['jugadores'],
    },
    {
      caso: 'grupo jugador',
      claim: ['jugadores'],
      esperado: ['jugadores'],
    },
    {
      caso: 'grupo editor',
      claim: ['editores'],
      esperado: ['editores'],
    },
    {
      caso: 'grupo administrador',
      claim: ['administradores'],
      esperado: ['administradores'],
    },
    {
      caso: 'grupo conocido y desconocido',
      claim: ['administradores', 'grupo-externo'],
      esperado: ['administradores'],
    },
    {
      caso: 'solo grupos desconocidos',
      claim: ['grupo-externo'],
      esperado: [],
    },
    {
      caso: 'string en lugar de arreglo',
      claim: 'administradores',
      esperado: [],
    },
    {
      caso: 'objeto en lugar de arreglo',
      claim: { grupo: 'administradores' },
      esperado: [],
    },
    {
      caso: 'claim nulo',
      claim: null,
      esperado: [],
    },
    {
      caso: 'elemento no string',
      claim: ['administradores', 123],
      esperado: [],
    },
    {
      caso: 'grupos duplicados',
      claim: ['administradores', 'administradores'],
      esperado: ['administradores'],
    },
  ])('$caso', ({ claim, esperado }) => {
    expect(obtenerGruposEfectivos(claim)).toEqual(
      esperado,
    );
  });

  it('no debe modificar el claim original', () => {
    const claim = [
      'administradores',
      'grupo-externo',
    ];

    obtenerGruposEfectivos(claim);

    expect(claim).toEqual([
      'administradores',
      'grupo-externo',
    ]);
  });
});
