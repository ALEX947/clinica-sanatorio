/**
 * Tests de integración — AuthService
 *
 * Verifican login, creación de usuarios, listado y actualización
 * contra clinica_test_db (PostgreSQL real).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { AuthService } from '../../src/auth/auth.service';
import { RolUsuario } from '../../src/auth/entities/usuario.entity';

import { ALL_ENTITIES, testTypeOrmModule } from './helpers';

describe('AuthService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: AuthService;
  let ds: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        testTypeOrmModule,
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get(AuthService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(`TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE`);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(`TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE`);

    // Insertar usuario de prueba con password hasheada
    const hash = await bcrypt.hash('password123', 10);
    await ds.query(
      `INSERT INTO usuarios (username, "passwordHash", "nombreCompleto", rol, activo)
       VALUES ('testuser', $1, 'Usuario Test', 'admin', true)`,
      [hash],
    );
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('credenciales correctas → retorna accessToken y datos del usuario', async () => {
      const result = await service.login('testuser', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.usuario).toMatchObject({
        username: 'testuser',
        nombreCompleto: 'Usuario Test',
        rol: RolUsuario.ADMIN,
      });
      expect(result.usuario.id).toBeGreaterThan(0);
    });

    it('password incorrecta → lanza UnauthorizedException', async () => {
      await expect(service.login('testuser', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('usuario inactivo → lanza UnauthorizedException', async () => {
      // Desactivar el usuario de prueba
      await ds.query(
        `UPDATE usuarios SET activo = false WHERE username = 'testuser'`,
      );

      await expect(service.login('testuser', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── crearUsuario ───────────────────────────────────────────────────────────

  describe('crearUsuario', () => {
    it('persiste el usuario y hashea la password correctamente', async () => {
      const dto = {
        username: 'nuevousuario',
        password: 'miPassword!1',
        nombreCompleto: 'Nuevo Usuario',
        rol: RolUsuario.MEDICO,
      };

      const creado = await service.crearUsuario(dto);

      expect(creado.id).toBeGreaterThan(0);
      expect(creado.username).toBe('nuevousuario');
      expect(creado.rol).toBe(RolUsuario.MEDICO);

      // Verificar que el hash almacenado corresponde a la password original
      const [row] = await ds.query(
        `SELECT "passwordHash" FROM usuarios WHERE id = $1`,
        [creado.id],
      );
      const coincide = await bcrypt.compare('miPassword!1', row.passwordHash);
      expect(coincide).toBe(true);
    });

    it('username duplicado → lanza ConflictException', async () => {
      // 'testuser' ya fue insertado en beforeEach
      await expect(
        service.crearUsuario({
          username: 'testuser',
          password: 'otraPassword',
          nombreCompleto: 'Duplicado',
          rol: RolUsuario.ENFERMERIA,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── findAllUsuarios ────────────────────────────────────────────────────────

  describe('findAllUsuarios', () => {
    it('retorna la lista de usuarios sin exponer passwordHash', async () => {
      // Crear un segundo usuario para confirmar que retorna múltiples
      await service.crearUsuario({
        username: 'otrouser',
        password: 'pass456',
        nombreCompleto: 'Otro Usuario',
        rol: RolUsuario.FACTURACION,
      });

      const lista = await service.findAllUsuarios();

      expect(lista.length).toBeGreaterThanOrEqual(2);

      for (const usuario of lista) {
        expect(usuario.passwordHash).toBeUndefined();
        expect(usuario).toHaveProperty('id');
        expect(usuario).toHaveProperty('username');
        expect(usuario).toHaveProperty('rol');
        expect(usuario).toHaveProperty('activo');
      }
    });
  });

  // ── actualizarUsuario ──────────────────────────────────────────────────────

  describe('actualizarUsuario', () => {
    it('cambia rol y activo, retorna el usuario actualizado', async () => {
      const [row] = await ds.query(
        `SELECT id FROM usuarios WHERE username = 'testuser'`,
      );
      const id = row.id;

      const actualizado = await service.actualizarUsuario(id, {
        rol: RolUsuario.ENFERMERIA,
        activo: false,
      });

      expect(actualizado).toBeDefined();
      expect(actualizado!.rol).toBe(RolUsuario.ENFERMERIA);
      expect(actualizado!.activo).toBe(false);
      expect(actualizado!.id).toBe(id);
      // No debe exponer passwordHash (select excluye la columna → undefined)
      expect(actualizado!.passwordHash).toBeUndefined();
    });
  });
});
