import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasService } from './licencias.service.js';

describe('LicenciasService', () => {
  let service: LicenciasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenciasService],
    }).compile();

    service = module.get<LicenciasService>(LicenciasService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una licencia con juegoId valido', () => {
    const licencia = service.crear(
      'juego-123',
      'usuario-123',
    );

    expect(licencia.id).toBeDefined();
    expect(licencia.juegoId).toBe('juego-123');
    expect(licencia.usuarioSub).toBe('usuario-123');
    expect(licencia.fechaCreacion).toBeDefined();
  });

  it('debe rechazar juegoId vacio', () => {
    expect(() =>
      service.crear('', 'usuario-123'),
    ).toThrow(BadRequestException);
  });

  it('debe rechazar juegoId con solo espacios', () => {
    expect(() =>
      service.crear('   ', 'usuario-123'),
    ).toThrow(BadRequestException);
  });

  it('debe rechazar juegoId ausente', () => {
    expect(() =>
      service.crear(
        undefined as unknown as string,
        'usuario-123',
      ),
    ).toThrow(BadRequestException);
  });

  it('debe normalizar espacios del juegoId', () => {
    const licencia = service.crear(
      '  juego-123  ',
      'usuario-123',
    );

    expect(licencia.juegoId).toBe('juego-123');
  });
});
