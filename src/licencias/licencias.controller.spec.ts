import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ScopesGuard } from '../auth/scopes.guard.js';
import { LicenciasController } from './licencias.controller.js';
import { LicenciasService } from './licencias.service.js';

describe('LicenciasController', () => {
  let controller: LicenciasController;

  const serviceMock = {
    crear: vi.fn(),
    obtenerPorUsuario: vi.fn(),
    obtenerTodas: vi.fn(),
    revocar: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const guardPermitido = {
      canActivate: () => true,
    };

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [LicenciasController],
        providers: [
          {
            provide: LicenciasService,
            useValue: serviceMock,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(guardPermitido)
        .overrideGuard(ScopesGuard)
        .useValue(guardPermitido)
        .overrideGuard(RolesGuard)
        .useValue(guardPermitido)
        .compile();

    controller =
      module.get<LicenciasController>(
        LicenciasController,
      );
  });

  it('debe obtener propietario exclusivamente desde req.user.sub', () => {
    serviceMock.crear.mockReturnValue({
      id: 'licencia-1',
    });

    controller.crearCompra(
      {
        juegoId: 'juego-1',
        usuarioSub: 'usuario-malicioso',
      } as any,
      {
        user: {
          sub: 'usuario-real',
        },
      },
    );

    expect(serviceMock.crear).toHaveBeenCalledWith(
      'juego-1',
      'usuario-real',
    );
  });

  it('biblioteca debe filtrarse por req.user.sub', () => {
    serviceMock.obtenerPorUsuario.mockReturnValue([]);

    controller.obtenerBiblioteca({
      user: {
        sub: 'usuario-real',
      },
      query: {
        usuarioSub: 'otro-usuario',
      },
    });

    expect(
      serviceMock.obtenerPorUsuario,
    ).toHaveBeenCalledWith('usuario-real');
  });

  it('debe listar todas las licencias', () => {
    serviceMock.obtenerTodas.mockReturnValue([]);

    controller.obtenerLicencias();

    expect(
      serviceMock.obtenerTodas,
    ).toHaveBeenCalledOnce();
  });

  it('debe revocar por licenciaId', () => {
    controller.revocarLicencia('licencia-123');

    expect(serviceMock.revocar).toHaveBeenCalledWith(
      'licencia-123',
    );
  });
});
