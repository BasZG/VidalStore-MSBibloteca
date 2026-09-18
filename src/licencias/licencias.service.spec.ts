import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasService } from './licencias.service.js';

describe('LicenciasService', () => {
  let service: LicenciasService;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [LicenciasService],
      }).compile();

    service =
      module.get<LicenciasService>(LicenciasService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una licencia valida', () => {
    const licencia = service.crear(
      'juego-123',
      'usuario-a',
    );

    expect(typeof licencia.id).toBe('string');
    expect(licencia.juegoId).toBe('juego-123');
    expect(licencia.usuarioSub).toBe('usuario-a');
    expect(licencia.fechaCreacion).toBeDefined();
  });

  it('debe rechazar juegoId vacio sin crear licencia', () => {
    expect(() =>
      service.crear('', 'usuario-a'),
    ).toThrow(BadRequestException);

    expect(service.obtenerTodas()).toHaveLength(0);
  });

  it('debe rechazar juegoId con solo espacios', () => {
    expect(() =>
      service.crear('   ', 'usuario-a'),
    ).toThrow(BadRequestException);
  });

  it('debe rechazar juegoId ausente', () => {
    expect(() =>
      service.crear(
        undefined as unknown as string,
        'usuario-a',
      ),
    ).toThrow(BadRequestException);
  });

  it('debe rechazar juegoId que no sea string', () => {
    expect(() =>
      service.crear(
        123 as unknown as string,
        'usuario-a',
      ),
    ).toThrow(BadRequestException);
  });

  it('debe normalizar espacios del juegoId', () => {
    const licencia = service.crear(
      '  juego-123  ',
      'usuario-a',
    );

    expect(licencia.juegoId).toBe('juego-123');
  });

  it('usuario A solo debe ver sus licencias', () => {
    service.crear('juego-1', 'usuario-a');
    service.crear('juego-2', 'usuario-b');

    const bibliotecaA =
      service.obtenerPorUsuario('usuario-a');

    expect(bibliotecaA).toHaveLength(1);
    expect(bibliotecaA[0].usuarioSub).toBe(
      'usuario-a',
    );
    expect(bibliotecaA[0].juegoId).toBe('juego-1');
  });

  it('dos usuarios pueden tener licencia del mismo juego', () => {
    service.crear('juego-compartido', 'usuario-a');
    service.crear('juego-compartido', 'usuario-b');

    const bibliotecaA =
      service.obtenerPorUsuario('usuario-a');

    const bibliotecaB =
      service.obtenerPorUsuario('usuario-b');

    expect(bibliotecaA).toHaveLength(1);
    expect(bibliotecaB).toHaveLength(1);

    expect(bibliotecaA[0].juegoId).toBe(
      'juego-compartido',
    );

    expect(bibliotecaB[0].juegoId).toBe(
      'juego-compartido',
    );

    expect(bibliotecaA[0].id).not.toBe(
      bibliotecaB[0].id,
    );
  });

  it('administracion debe poder obtener todas las licencias', () => {
    service.crear('juego-1', 'usuario-a');
    service.crear('juego-2', 'usuario-b');

    expect(service.obtenerTodas()).toHaveLength(2);
  });

  it('debe revocar una licencia', () => {
    const licencia = service.crear(
      'juego-1',
      'usuario-a',
    );

    const revocada = service.revocar(licencia.id);

    expect(revocada.id).toBe(licencia.id);
    expect(service.obtenerTodas()).toHaveLength(0);
  });

  it('revocar dos veces debe devolver 404', () => {
    const licencia = service.crear(
      'juego-1',
      'usuario-a',
    );

    service.revocar(licencia.id);

    expect(() =>
      service.revocar(licencia.id),
    ).toThrow(NotFoundException);
  });
});
