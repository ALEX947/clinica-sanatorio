/**
 * Tests de integración — CamasService
 *
 * Verifican el comportamiento de sectores y camas sobre PostgreSQL real
 * (clinica_test_db). Cada test parte de un estado limpio gracias al
 * TRUNCATE_ALL ejecutado en beforeEach.
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CamasService } from '../../src/maestros/services/camas.service';
import { EstadoCama } from '../../src/maestros/entities/cama.entity';

import { ALL_ENTITIES, testTypeOrmModule, TRUNCATE_ALL } from './helpers';

describe('CamasService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: CamasService;
  let ds: DataSource;

  /** IDs creados en beforeEach para los tests de camas */
  let sectorId: number;
  let camaId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [CamasService],
    }).compile();

    service = module.get(CamasService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(TRUNCATE_ALL);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(TRUNCATE_ALL);

    // Sector base para todos los tests de camas
    const [sector] = await ds.query(
      `INSERT INTO sectores (nombre, descripcion)
       VALUES ('Clínica Médica', 'Sala de internación general') RETURNING id`,
    );
    sectorId = sector.id;

    // Cama base en estado disponible
    const [cama] = await ds.query(
      `INSERT INTO camas (numero, individual, estado, "sectorId")
       VALUES ('C-01', false, 'disponible', $1) RETURNING id`,
      [sectorId],
    );
    camaId = cama.id;
  });

  // ── sectores ───────────────────────────────────────────────────────────────

  describe('createSector', () => {
    it('persiste sector con nombre y descripción', async () => {
      const sector = await service.createSector({
        nombre: 'UTI Adultos',
        descripcion: 'Unidad de terapia intensiva para adultos',
      });

      expect(sector.id).toBeGreaterThan(0);
      expect(sector.nombre).toBe('UTI Adultos');
      expect(sector.descripcion).toBe(
        'Unidad de terapia intensiva para adultos',
      );

      // Verificar persistencia real en BD
      const [row] = await ds.query(
        `SELECT nombre, descripcion FROM sectores WHERE id = $1`,
        [sector.id],
      );
      expect(row.nombre).toBe('UTI Adultos');
      expect(row.descripcion).toBe('Unidad de terapia intensiva para adultos');
    });
  });

  describe('findSectores', () => {
    it('retorna lista ordenada por nombre', async () => {
      // Ya existe 'Clínica Médica' del beforeEach; agregar dos más
      await ds.query(
        `INSERT INTO sectores (nombre) VALUES ('UTI Adultos'), ('Pediatría')`,
      );

      const sectores = await service.findSectores();

      expect(sectores.length).toBeGreaterThanOrEqual(3);
      // Verificar orden ascendente por nombre
      const nombres = sectores.map((s) => s.nombre);
      expect(nombres).toEqual([...nombres].sort());
    });
  });

  describe('updateSector', () => {
    it('actualiza descripción del sector', async () => {
      const actualizado = await service.updateSector(sectorId, {
        descripcion: 'Descripción actualizada',
      });

      expect(actualizado!.descripcion).toBe('Descripción actualizada');

      // Verificar en BD
      const [row] = await ds.query(
        `SELECT descripcion FROM sectores WHERE id = $1`,
        [sectorId],
      );
      expect(row.descripcion).toBe('Descripción actualizada');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(
        service.updateSector(99999, { descripcion: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── camas ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persiste cama con estado disponible por defecto', async () => {
      const cama = await service.create({
        numero: 'C-99',
        individual: false,
        sector: { id: sectorId } as any,
      });

      expect(cama.id).toBeGreaterThan(0);
      expect(cama.estado).toBe(EstadoCama.DISPONIBLE);

      const [row] = await ds.query(
        `SELECT numero, estado FROM camas WHERE id = $1`,
        [cama.id],
      );
      expect(row.numero).toBe('C-99');
      expect(row.estado).toBe('disponible');
    });
  });

  describe('findAll', () => {
    it('retorna camas con relación sector cargada', async () => {
      const camas = await service.findAll();

      expect(camas.length).toBeGreaterThanOrEqual(1);
      const primera = camas[0];
      expect(primera.sector).toBeDefined();
      expect(primera.sector.nombre).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('retorna cama con sector', async () => {
      const cama = await service.findOne(camaId);

      expect(cama.id).toBe(camaId);
      expect(cama.numero).toBe('C-01');
      expect(cama.sector).toBeDefined();
      expect(cama.sector.id).toBe(sectorId);
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findDisponibles', () => {
    it('retorna solo las camas disponibles', async () => {
      // Agregar una cama ocupada y una en mantenimiento
      await ds.query(
        `INSERT INTO camas (numero, individual, estado, "sectorId")
         VALUES ('C-02', false, 'ocupada', $1),
                ('C-03', false, 'mantenimiento', $1)`,
        [sectorId],
      );

      const disponibles = await service.findDisponibles();

      // Solo C-01 está disponible
      expect(disponibles).toHaveLength(1);
      expect(disponibles[0].estado).toBe(EstadoCama.DISPONIBLE);
      expect(disponibles[0].numero).toBe('C-01');
    });

    it('filtra disponibles por sectorId', async () => {
      // Segundo sector con su propia cama disponible
      const [sector2] = await ds.query(
        `INSERT INTO sectores (nombre) VALUES ('Pediatría') RETURNING id`,
      );
      await ds.query(
        `INSERT INTO camas (numero, individual, estado, "sectorId")
         VALUES ('P-01', false, 'disponible', $1)`,
        [sector2.id],
      );

      const disponiblesSector1 = await service.findDisponibles(sectorId);
      const disponiblesSector2 = await service.findDisponibles(sector2.id);

      // Cada sector tiene exactamente 1 cama disponible
      expect(disponiblesSector1).toHaveLength(1);
      expect(disponiblesSector1[0].sector.id).toBe(sectorId);

      expect(disponiblesSector2).toHaveLength(1);
      expect(disponiblesSector2[0].sector.id).toBe(sector2.id);
    });
  });

  describe('updateEstado', () => {
    it('cambia estado a mantenimiento y retorna cama actualizada', async () => {
      const actualizada = await service.updateEstado(
        camaId,
        EstadoCama.MANTENIMIENTO,
      );

      expect(actualizada.id).toBe(camaId);
      expect(actualizada.estado).toBe(EstadoCama.MANTENIMIENTO);

      const [row] = await ds.query(`SELECT estado FROM camas WHERE id = $1`, [
        camaId,
      ]);
      expect(row.estado).toBe('mantenimiento');
    });
  });

  describe('ocupar', () => {
    it('cambia estado a ocupada', async () => {
      await service.ocupar(camaId);

      const [row] = await ds.query(`SELECT estado FROM camas WHERE id = $1`, [
        camaId,
      ]);
      expect(row.estado).toBe('ocupada');
    });

    it('lanza BadRequestException si la cama ya está ocupada', async () => {
      // Poner la cama en ocupada primero
      await ds.query(`UPDATE camas SET estado = 'ocupada' WHERE id = $1`, [
        camaId,
      ]);

      await expect(service.ocupar(camaId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('liberar', () => {
    it('vuelve la cama a estado disponible', async () => {
      // Dejarla ocupada primero
      await ds.query(`UPDATE camas SET estado = 'ocupada' WHERE id = $1`, [
        camaId,
      ]);

      await service.liberar(camaId);

      const [row] = await ds.query(`SELECT estado FROM camas WHERE id = $1`, [
        camaId,
      ]);
      expect(row.estado).toBe('disponible');
    });
  });
});
