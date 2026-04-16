import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

/**
 * Tests e2e — requieren la base de datos PostgreSQL corriendo.
 * Asegurate de tener el .env configurado antes de ejecutar.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('devuelve 401 con credenciales inválidas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'noexiste', password: 'mal' })
        .expect(401);
    });

    it('devuelve 400 si faltan campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('devuelve accessToken con credenciales válidas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.usuario.username).toBe('admin');
          expect(res.body.usuario.rol).toBe('admin');
        });
    });
  });

  describe('GET /maestros/pacientes', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      token = res.body.accessToken;
    });

    it('devuelve 401 sin token', () => {
      return request(app.getHttpServer())
        .get('/maestros/pacientes')
        .expect(401);
    });

    it('devuelve lista de pacientes con token válido', () => {
      return request(app.getHttpServer())
        .get('/maestros/pacientes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('RBAC — enfermería no puede crear pacientes', () => {
    let tokenEnfermeria: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'enf_torres', password: 'enf123' });
      tokenEnfermeria = res.body.accessToken;
    });

    it('devuelve 403 al intentar crear un paciente', () => {
      return request(app.getHttpServer())
        .post('/maestros/pacientes')
        .set('Authorization', `Bearer ${tokenEnfermeria}`)
        .send({
          dni: '99999999',
          apellido: 'Test',
          nombre: 'Test',
          fechaNacimiento: '2000-01-01',
          sexo: 'M',
        })
        .expect(403);
    });
  });
});
