/**
 * Tests de integración — ObrasSocialesService
 *
 * Verifican creación, búsqueda, actualización y filtrado por estado activo
 * contra clinica_test_db (PostgreSQL real).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ObrasSocialesService } from '../../src/maestros/services/obras-sociales.service';

import { ALL_ENTITIES, testTypeOrmModule } from './helpers';

describe('ObrasSocialesService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: ObrasSocialesService;
  let ds: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [ObrasSocialesService],
    }).compile();

    service = module.get(ObrasSocialesService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(`TRUNCATE TABLE obras_sociales RESTART IDENTITY CASCADE`);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(`TRUNCATE TABLE obras_sociales RESTART IDENTITY CASCADE`);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persiste la obra social con activa: true por defecto', async () => {
      const dto = {
        nombre: 'OSDE',
        cuit: '30-12345678-9',
        domicilio: 'Av. Corrientes 1234, Buenos Aires',
        telefono: '0810-333-6733',
        email: 'contacto@osde.com.ar',
        modalidadFacturacion: 'mensual',
        diaFacturacion: 10,
      };

      const creada = await service.create(dto);

      expect(creada.id).toBeGreaterThan(0);
      expect(creada.nombre).toBe('OSDE');
      expect(creada.cuit).toBe('30-12345678-9');
      expect(creada.domicilio).toBe('Av. Corrientes 1234, Buenos Aires');
      expect(creada.telefono).toBe('0810-333-6733');
      expect(creada.email).toBe('contacto@osde.com.ar');
      expect(creada.modalidadFacturacion).toBe('mensual');
      expect(creada.diaFacturacion).toBe(10);
      expect(creada.activa).toBe(true);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna solo las obras sociales activas', async () => {
      await service.create({ nombre: 'Swiss Medical', activa: true });
      await service.create({ nombre: 'Galeno', activa: true });
      // Insertar una inactiva directamente para no depender de update
      await ds.query(
        `INSERT INTO obras_sociales (nombre, activa) VALUES ('OS Inactiva', false)`,
      );

      const lista = await service.findAll();

      expect(lista.length).toBe(2);
      const nombres = lista.map((os) => os.nombre);
      expect(nombres).toContain('Swiss Medical');
      expect(nombres).toContain('Galeno');
      expect(nombres).not.toContain('OS Inactiva');
    });

    it('retorna la lista ordenada por nombre (ASC)', async () => {
      await service.create({ nombre: 'Unión Personal', activa: true });
      await service.create({ nombre: 'IOMA', activa: true });
      await service.create({ nombre: 'Acordar', activa: true });

      const lista = await service.findAll();

      expect(lista.length).toBe(3);
      expect(lista[0].nombre).toBe('Acordar');
      expect(lista[1].nombre).toBe('IOMA');
      expect(lista[2].nombre).toBe('Unión Personal');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna la obra social existente con sus datos', async () => {
      const creada = await service.create({
        nombre: 'Medifé',
        cuit: '30-98765432-1',
        activa: true,
      });

      const encontrada = await service.findOne(creada.id);

      expect(encontrada.id).toBe(creada.id);
      expect(encontrada.nombre).toBe('Medifé');
      expect(encontrada.cuit).toBe('30-98765432-1');
      expect(encontrada.activa).toBe(true);
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('actualiza nombre y cuit, retorna la obra social actualizada', async () => {
      const creada = await service.create({
        nombre: 'Nombre Original',
        cuit: '30-00000000-0',
        activa: true,
      });

      const actualizada = await service.update(creada.id, {
        nombre: 'Nombre Actualizado',
        cuit: '30-11111111-1',
      });

      expect(actualizada.id).toBe(creada.id);
      expect(actualizada.nombre).toBe('Nombre Actualizado');
      expect(actualizada.cuit).toBe('30-11111111-1');
      // El estado activo se conserva
      expect(actualizada.activa).toBe(true);
    });

    it('la obra social desactivada ya no aparece en findAll', async () => {
      const creada = await service.create({
        nombre: 'OS A Desactivar',
        activa: true,
      });

      // Confirmar que está en la lista antes de desactivar
      let lista = await service.findAll();
      expect(lista.some((os) => os.id === creada.id)).toBe(true);

      // Desactivar
      await service.update(creada.id, { activa: false });

      // Ya no debe aparecer en findAll (que filtra activa: true)
      lista = await service.findAll();
      expect(lista.some((os) => os.id === creada.id)).toBe(false);
    });
  });
});
