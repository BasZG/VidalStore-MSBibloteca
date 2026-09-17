import {
  ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { JwtAuthGuard } from './../src/auth/jwt-auth.guard.js';
import { RolesGuard } from './../src/auth/roles.guard.js';
import { ScopesGuard } from './../src/auth/scopes.guard.js';
import { AppModule } from './../src/app.module.js';

describe('MSBibloteca (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const jwtGuardPrueba = {
      canActivate(context: ExecutionContext) {
        const req =
          context.switchToHttp().getRequest();

        const sub = req.headers['x-test-sub'];

        req.user = {
          sub:
            typeof sub === 'string'
              ? sub
              : 'usuario-prueba',
        };

        return true;
      },
    };

    const guardPermitido = {
      canActivate: () => true,
    };

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(jwtGuardPrueba)
        .overrideGuard(ScopesGuard)
        .useValue(guardPermitido)
        .overrideGuard(RolesGuard)
        .useValue(guardPermitido)
        .compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('compra valida devuelve 201 y usa req.user.sub', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .post('/v1/compras?usuarioSub=intruso-query')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: 'juego-1',
        usuarioSub: 'intruso-body',
      })
      .expect(201);

    expect(response.body.juegoId).toBe('juego-1');
    expect(response.body.usuarioSub).toBe(
      'usuario-a',
    );
  });

  it('entrada invalida devuelve 400 y no crea licencia', async () => {
    const antes = await request(
      app.getHttpServer(),
    )
      .get('/v1/licencias')
      .set('x-test-sub', 'admin')
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: '',
      })
      .expect(400);

    const despues = await request(
      app.getHttpServer(),
    )
      .get('/v1/licencias')
      .set('x-test-sub', 'admin')
      .expect(200);

    expect(despues.body.length).toBe(
      antes.body.length,
    );
  });

  it('juegoId no string devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: 123,
      })
      .expect(400);
  });

  it('usuario A ve su licencia y usuario B no', async () => {
    const compra = await request(
      app.getHttpServer(),
    )
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: 'juego-aislado',
      })
      .expect(201);

    const bibliotecaA = await request(
      app.getHttpServer(),
    )
      .get('/v1/biblioteca')
      .set('x-test-sub', 'usuario-a')
      .expect(200);

    const bibliotecaB = await request(
      app.getHttpServer(),
    )
      .get('/v1/biblioteca')
      .set('x-test-sub', 'usuario-b')
      .expect(200);

    expect(
      bibliotecaA.body.some(
        (licencia: { id: string }) =>
          licencia.id === compra.body.id,
      ),
    ).toBe(true);

    expect(
      bibliotecaB.body.some(
        (licencia: { id: string }) =>
          licencia.id === compra.body.id,
      ),
    ).toBe(false);
  });

  it('A y B pueden tener licencias del mismo juego', async () => {
    const compraA = await request(
      app.getHttpServer(),
    )
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: 'juego-compartido',
      })
      .expect(201);

    const compraB = await request(
      app.getHttpServer(),
    )
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-b')
      .send({
        juegoId: 'juego-compartido',
      })
      .expect(201);

    expect(compraA.body.juegoId).toBe(
      'juego-compartido',
    );

    expect(compraB.body.juegoId).toBe(
      'juego-compartido',
    );

    expect(compraA.body.usuarioSub).toBe(
      'usuario-a',
    );

    expect(compraB.body.usuarioSub).toBe(
      'usuario-b',
    );

    expect(compraA.body.id).not.toBe(
      compraB.body.id,
    );
  });

  it('administracion puede listar todas las licencias', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get('/v1/licencias')
      .set('x-test-sub', 'admin')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (licencia: { usuarioSub: string }) =>
          licencia.usuarioSub === 'usuario-a',
      ),
    ).toBe(true);

    expect(
      response.body.some(
        (licencia: { usuarioSub: string }) =>
          licencia.usuarioSub === 'usuario-b',
      ),
    ).toBe(true);
  });

  it('revocacion devuelve 200 y repetida 404', async () => {
    const compra = await request(
      app.getHttpServer(),
    )
      .post('/v1/compras')
      .set('x-test-sub', 'usuario-a')
      .send({
        juegoId: 'juego-revocable',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/v1/licencias/${compra.body.id}`)
      .set('x-test-sub', 'admin')
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/licencias/${compra.body.id}`)
      .set('x-test-sub', 'admin')
      .expect(404);
  });
});
