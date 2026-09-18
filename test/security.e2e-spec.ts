import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  generateKeyPairSync,
  type KeyObject,
  sign as cryptoSign,
} from 'node:crypto';
import {
  createServer,
  type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from './../src/app.module.js';

const CLIENT_ID = 'cliente-prueba';
const KID = 'clave-prueba';

type ServidorLocal = {
  server: Server;
  url: string;
};

const { privateKey, publicKey } =
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

const { privateKey: privateKeyIncorrecta } =
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

let issuer = '';

function codificarJson(
  valor: unknown,
): string {
  return Buffer.from(
    JSON.stringify(valor),
  ).toString('base64url');
}

function firmarToken(
  overrides: Record<string, unknown> = {},
  clave: KeyObject = privateKey,
): string {
  const ahora =
    Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: KID,
  };

  const payload = {
    sub: 'usuario-prueba',
    iss: issuer,
    client_id: CLIENT_ID,
    token_use: 'access',
    scope:
      'vidalstore/biblioteca.leer',
    'cognito:groups': ['jugadores'],
    iat: ahora,
    exp: ahora + 300,
    ...overrides,
  };

  const contenido =
    `${codificarJson(header)}.` +
    `${codificarJson(payload)}`;

  const firma = cryptoSign(
    'RSA-SHA256',
    Buffer.from(contenido),
    clave,
  ).toString('base64url');

  return `${contenido}.${firma}`;
}

function alterarToken(
  token: string,
): string {
  const [header, payload, firma] =
    token.split('.');

  const payloadOriginal = JSON.parse(
    Buffer.from(
      payload,
      'base64url',
    ).toString('utf8'),
  );

  payloadOriginal.sub =
    'usuario-alterado';

  return [
    header,
    codificarJson(payloadOriginal),
    firma,
  ].join('.');
}

async function iniciarJwks(): Promise<ServidorLocal> {
  const publicJwk = publicKey.export({
    format: 'jwk',
  });

  const server = createServer(
    (req, res) => {
      if (
        req.url ===
        '/.well-known/jwks.json'
      ) {
        res.statusCode = 200;

        res.setHeader(
          'Content-Type',
          'application/json',
        );

        res.end(
          JSON.stringify({
            keys: [
              {
                ...publicJwk,
                kid: KID,
                use: 'sig',
                alg: 'RS256',
              },
            ],
          }),
        );

        return;
      }

      res.statusCode = 404;
      res.end();
    },
  );

  await new Promise<void>(
    (resolve) => {
      server.listen(
        0,
        '127.0.0.1',
        resolve,
      );
    },
  );

  const address =
    server.address() as AddressInfo;

  return {
    server,
    url:
      `http://127.0.0.1:` +
      `${address.port}`,
  };
}

async function cerrarServidor(
  server: Server,
): Promise<void> {
  await new Promise<void>(
    (resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    },
  );
}

function restaurarEnv(
  nombre: string,
  valor: string | undefined,
): void {
  if (valor === undefined) {
    delete process.env[nombre];
    return;
  }

  process.env[nombre] = valor;
}

describe(
  'MSBibloteca seguridad JWT real (e2e)',
  () => {
    let app: INestApplication;
    let jwks: ServidorLocal;

    const envAnterior = {
      issuer:
        process.env.COGNITO_ISSUER,
      jwks:
        process.env.COGNITO_JWKS_URI,
      clientId:
        process.env.COGNITO_CLIENT_ID,
    };

    beforeAll(async () => {
      jwks = await iniciarJwks();
      issuer = jwks.url;

      process.env.COGNITO_ISSUER =
        issuer;

      process.env.COGNITO_JWKS_URI =
        `${issuer}/.well-known/jwks.json`;

      process.env.COGNITO_CLIENT_ID =
        CLIENT_ID;

      const moduleFixture: TestingModule =
        await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

      app =
        moduleFixture.createNestApplication();

      await app.init();
    });

    afterAll(async () => {
      await app.close();

      await cerrarServidor(
        jwks.server,
      );

      restaurarEnv(
        'COGNITO_ISSUER',
        envAnterior.issuer,
      );

      restaurarEnv(
        'COGNITO_JWKS_URI',
        envAnterior.jwks,
      );

      restaurarEnv(
        'COGNITO_CLIENT_ID',
        envAnterior.clientId,
      );
    });

    it(
      'rechaza solicitud sin token',
      async () => {
        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .expect(401);
      },
    );

    it(
      'acepta Access Token RS256 valido con scope correcto',
      async () => {
        const token =
          firmarToken();

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(200);
      },
    );

    it(
      'rechaza token con firma incorrecta',
      async () => {
        const token = firmarToken(
          {},
          privateKeyIncorrecta,
        );

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza token alterado despues de firmarlo',
      async () => {
        const token =
          alterarToken(
            firmarToken(),
          );

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza token vencido',
      async () => {
        const ahora =
          Math.floor(
            Date.now() / 1000,
          );

        const token =
          firmarToken({
            exp: ahora - 60,
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza issuer incorrecto',
      async () => {
        const token =
          firmarToken({
            iss:
              'https://issuer-invalido',
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza ID Token',
      async () => {
        const token =
          firmarToken({
            token_use: 'id',
            client_id: undefined,
            aud: CLIENT_ID,
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza token de otro App Client',
      async () => {
        const token =
          firmarToken({
            client_id:
              'otro-cliente',
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(401);
      },
    );

    it(
      'rechaza scope insuficiente con 403',
      async () => {
        const token =
          firmarToken({
            scope:
              'vidalstore/catalogo.leer',
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/biblioteca')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(403);
      },
    );

    it(
      'usa exclusivamente el sub del JWT como propietario',
      async () => {
        const token =
          firmarToken({
            sub: 'usuario-jwt',
          });

        const response =
          await request(
            app.getHttpServer(),
          )
            .post(
              '/v1/compras?usuarioSub=intruso-query',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              juegoId:
                'juego-propietario',
              usuarioSub:
                'intruso-body',
            })
            .expect(201);

        expect(
          response.body.usuarioSub,
        ).toBe('usuario-jwt');

        expect(
          response.body.juegoId,
        ).toBe(
          'juego-propietario',
        );
      },
    );

    it(
      'usuario propietario ve su licencia',
      async () => {
        const token =
          firmarToken({
            sub: 'usuario-propietario',
          });

        const compra =
          await request(
            app.getHttpServer(),
          )
            .post('/v1/compras')
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              juegoId:
                'juego-visible',
            })
            .expect(201);

        const biblioteca =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/biblioteca')
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .expect(200);

        expect(
          biblioteca.body.some(
            (
              licencia: {
                id: string;
              },
            ) =>
              licencia.id ===
              compra.body.id,
          ),
        ).toBe(true);
      },
    );

    it(
      'usuario B no ve licencia de usuario A',
      async () => {
        const tokenA =
          firmarToken({
            sub: 'usuario-a-real',
          });

        const tokenB =
          firmarToken({
            sub: 'usuario-b-real',
          });

        const compraA =
          await request(
            app.getHttpServer(),
          )
            .post('/v1/compras')
            .set(
              'Authorization',
              `Bearer ${tokenA}`,
            )
            .send({
              juegoId:
                'juego-aislado-real',
            })
            .expect(201);

        const bibliotecaB =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/biblioteca')
            .set(
              'Authorization',
              `Bearer ${tokenB}`,
            )
            .expect(200);

        expect(
          bibliotecaB.body.some(
            (
              licencia: {
                id: string;
              },
            ) =>
              licencia.id ===
              compraA.body.id,
          ),
        ).toBe(false);
      },
    );

    it(
      'scope insuficiente no crea licencia',
      async () => {
        const adminToken =
          firmarToken({
            sub: 'admin',
            'cognito:groups': [
              'administradores',
            ],
          });

        const antes =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${adminToken}`,
            )
            .expect(200);

        const tokenSinScope =
          firmarToken({
            sub:
              'usuario-sin-scope',
            scope:
              'vidalstore/catalogo.leer',
          });

        await request(
          app.getHttpServer(),
        )
          .post('/v1/compras')
          .set(
            'Authorization',
            `Bearer ${tokenSinScope}`,
          )
          .send({
            juegoId:
              'no-debe-crearse',
          })
          .expect(403);

        const despues =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${adminToken}`,
            )
            .expect(200);

        expect(
          despues.body.length,
        ).toBe(
          antes.body.length,
        );
      },
    );

    it(
      'rechaza jugador en listado administrativo',
      async () => {
        const token =
          firmarToken({
            'cognito:groups': [
              'jugadores',
            ],
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/licencias')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(403);
      },
    );

    it(
      'rechaza editor en listado administrativo',
      async () => {
        const token =
          firmarToken({
            'cognito:groups': [
              'editores',
            ],
          });

        await request(
          app.getHttpServer(),
        )
          .get('/v1/licencias')
          .set(
            'Authorization',
            `Bearer ${token}`,
          )
          .expect(403);
      },
    );

    it(
      'permite administrador en listado de licencias',
      async () => {
        const token =
          firmarToken({
            'cognito:groups': [
              'administradores',
            ],
          });

        const response =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .expect(200);

        expect(
          Array.isArray(
            response.body,
          ),
        ).toBe(true);
      },
    );

    it(
      'jugador no puede revocar y la licencia permanece',
      async () => {
        const comprador =
          firmarToken({
            sub:
              'usuario-revocacion-jugador',
          });

        const compra =
          await request(
            app.getHttpServer(),
          )
            .post('/v1/compras')
            .set(
              'Authorization',
              `Bearer ${comprador}`,
            )
            .send({
              juegoId:
                'juego-no-revocable',
            })
            .expect(201);

        const jugador =
          firmarToken({
            'cognito:groups': [
              'jugadores',
            ],
          });

        await request(
          app.getHttpServer(),
        )
          .delete(
            `/v1/licencias/${compra.body.id}`,
          )
          .set(
            'Authorization',
            `Bearer ${jugador}`,
          )
          .expect(403);

        const admin =
          firmarToken({
            'cognito:groups': [
              'administradores',
            ],
          });

        const licencias =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${admin}`,
            )
            .expect(200);

        expect(
          licencias.body.some(
            (
              licencia: {
                id: string;
              },
            ) =>
              licencia.id ===
              compra.body.id,
          ),
        ).toBe(true);
      },
    );

    it(
      'editor no puede revocar y la licencia permanece',
      async () => {
        const comprador =
          firmarToken({
            sub:
              'usuario-revocacion-editor',
          });

        const compra =
          await request(
            app.getHttpServer(),
          )
            .post('/v1/compras')
            .set(
              'Authorization',
              `Bearer ${comprador}`,
            )
            .send({
              juegoId:
                'juego-editor-no-revoca',
            })
            .expect(201);

        const editor =
          firmarToken({
            'cognito:groups': [
              'editores',
            ],
          });

        await request(
          app.getHttpServer(),
        )
          .delete(
            `/v1/licencias/${compra.body.id}`,
          )
          .set(
            'Authorization',
            `Bearer ${editor}`,
          )
          .expect(403);

        const admin =
          firmarToken({
            'cognito:groups': [
              'administradores',
            ],
          });

        const licencias =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${admin}`,
            )
            .expect(200);

        expect(
          licencias.body.some(
            (
              licencia: {
                id: string;
              },
            ) =>
              licencia.id ===
              compra.body.id,
          ),
        ).toBe(true);
      },
    );

    it(
      'administrador puede revocar una licencia',
      async () => {
        const comprador =
          firmarToken({
            sub:
              'usuario-revocacion-admin',
          });

        const compra =
          await request(
            app.getHttpServer(),
          )
            .post('/v1/compras')
            .set(
              'Authorization',
              `Bearer ${comprador}`,
            )
            .send({
              juegoId:
                'juego-revocable-admin',
            })
            .expect(201);

        const admin =
          firmarToken({
            'cognito:groups': [
              'administradores',
            ],
          });

        await request(
          app.getHttpServer(),
        )
          .delete(
            `/v1/licencias/${compra.body.id}`,
          )
          .set(
            'Authorization',
            `Bearer ${admin}`,
          )
          .expect(200);

        const licencias =
          await request(
            app.getHttpServer(),
          )
            .get('/v1/licencias')
            .set(
              'Authorization',
              `Bearer ${admin}`,
            )
            .expect(200);

        expect(
          licencias.body.some(
            (
              licencia: {
                id: string;
              },
            ) =>
              licencia.id ===
              compra.body.id,
          ),
        ).toBe(false);
      },
    );
  },
);
