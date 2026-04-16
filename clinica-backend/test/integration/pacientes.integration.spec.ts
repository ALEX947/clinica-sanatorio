/**
 * Tests de integración — PacientesService
 *
 * Verifican creación, búsqueda, actualización de pacientes
 * contra clinica_test_db (PostgreSQL real).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PacientesService } from '../../src/maestros/services/pacientes.service';

import { ALL_ENTITIES, testTypeOrmModule } from './helpers';

describe('PacientesService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: PacientesService;
  let ds: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [PacientesService],
    }).compile();

    service = module.get(PacientesService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(`TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE`);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(`TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE`);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persiste el paciente con todos los campos', async () => {
      const dto = {
        apellido: 'Rodríguez',
        nombre: 'María',
        dni: '12345678',
        fechaNacimiento: new Date('1985-06-15'),
        sexo: 'F',
        domicilio: 'Av. Siempre Viva 123',
        localidad: 'Salta',
        telefono: '3874001122',
      };

      const creado = await service.create(dto);

      expect(creado.id).toBeGreaterThan(0);
      expect(creado.apellido).toBe('Rodríguez');
      expect(creado.nombre).toBe('María');
      expect(creado.dni).toBe('12345678');
      expect(creado.sexo).toBe('F');
      expect(creado.domicilio).toBe('Av. Siempre Viva 123');
      expect(creado.localidad).toBe('Salta');
      expect(creado.telefono).toBe('3874001122');
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna la lista ordenada por apellido', async () => {
      await service.create({
        apellido: 'Zárate',
        nombre: 'Carlos',
        dni: '11111111',
        fechaNacimiento: new Date('1970-01-01'),
        sexo: 'M',
      });
      await service.create({
        apellido: 'Álvarez',
        nombre: 'Laura',
        dni: '22222222',
        fechaNacimiento: new Date('1980-03-20'),
        sexo: 'F',
      });
      await service.create({
        apellido: 'Mamani',
        nombre: 'Pedro',
        dni: '33333333',
        fechaNacimiento: new Date('1995-07-10'),
        sexo: 'M',
      });

      const lista = await service.findAll();

      expect(lista.length).toBe(3);
      // PostgreSQL ordena considerando caracteres especiales; verificamos que
      // Álvarez < Mamani < Zárate (orden ASC por apellido)
      expect(lista[0].apellido).toBe('Álvarez');
      expect(lista[1].apellido).toBe('Mamani');
      expect(lista[2].apellido).toBe('Zárate');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna el paciente existente con sus datos', async () => {
      const creado = await service.create({
        apellido: 'Gómez',
        nombre: 'Ana',
        dni: '55566677',
        fechaNacimiento: new Date('1990-12-01'),
        sexo: 'F',
      });

      const encontrado = await service.findOne(creado.id);

      expect(encontrado.id).toBe(creado.id);
      expect(encontrado.apellido).toBe('Gómez');
      expect(encontrado.nombre).toBe('Ana');
      expect(encontrado.dni).toBe('55566677');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByDni ──────────────────────────────────────────────────────────────

  describe('findByDni', () => {
    it('retorna el paciente por DNI', async () => {
      await service.create({
        apellido: 'Torres',
        nombre: 'Roberto',
        dni: '77788899',
        fechaNacimiento: new Date('1965-04-22'),
        sexo: 'M',
      });

      const encontrado = await service.findByDni('77788899');

      expect(encontrado).not.toBeNull();
      expect(encontrado!.dni).toBe('77788899');
      expect(encontrado!.apellido).toBe('Torres');
    });

    it('retorna null si el DNI no existe', async () => {
      const resultado = await service.findByDni('00000000');
      expect(resultado).toBeNull();
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('actualiza teléfono y domicilio, retorna el paciente actualizado', async () => {
      const creado = await service.create({
        apellido: 'Flores',
        nombre: 'Silvia',
        dni: '44455566',
        fechaNacimiento: new Date('1978-09-18'),
        sexo: 'F',
        telefono: '3870000000',
        domicilio: 'Calle Vieja 1',
      });

      const actualizado = await service.update(creado.id, {
        telefono: '3871234567',
        domicilio: 'Calle Nueva 999',
      });

      expect(actualizado.id).toBe(creado.id);
      expect(actualizado.telefono).toBe('3871234567');
      expect(actualizado.domicilio).toBe('Calle Nueva 999');
      // Datos no modificados se conservan
      expect(actualizado.apellido).toBe('Flores');
      expect(actualizado.dni).toBe('44455566');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(
        service.update(99999, { telefono: '3879999999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
