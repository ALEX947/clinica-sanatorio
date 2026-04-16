/**
 * Tests de integración — NomencladorService
 *
 * Verifican la gestión del nomenclador INOS (prácticas) y los aranceles
 * por obra social sobre PostgreSQL real (clinica_test_db).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { NomencladorService } from '../../src/maestros/services/nomenclador.service';

import { ALL_ENTITIES, testTypeOrmModule, TRUNCATE_ALL } from './helpers';

describe('NomencladorService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: NomencladorService;
  let ds: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [NomencladorService],
    }).compile();

    service = module.get(NomencladorService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(TRUNCATE_ALL);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(TRUNCATE_ALL);
  });

  // ── nomenclador_inos ───────────────────────────────────────────────────────

  describe('create', () => {
    it('persiste práctica con código, descripción y activo: true', async () => {
      const practica = await service.create({
        codigo: 'LAB-001',
        descripcion: 'Hemograma completo',
        activo: true,
      });

      expect(practica.id).toBeGreaterThan(0);
      expect(practica.codigo).toBe('LAB-001');
      expect(practica.descripcion).toBe('Hemograma completo');
      expect(practica.activo).toBe(true);

      // Verificar persistencia real en BD
      const [row] = await ds.query(
        `SELECT codigo, descripcion, activo FROM nomenclador_inos WHERE id = $1`,
        [practica.id],
      );
      expect(row.codigo).toBe('LAB-001');
      expect(row.activo).toBe(true);
    });
  });

  describe('findAll', () => {
    it('retorna solo las prácticas activas', async () => {
      await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo) VALUES
          ('LAB-001', 'Hemograma completo', true),
          ('LAB-002', 'Glucemia', true),
          ('LAB-999', 'Práctica inactiva', false)
      `);

      const activas = await service.findAll();

      expect(activas).toHaveLength(2);
      activas.forEach((p) => expect(p.activo).toBe(true));
    });

    it('filtra por descripción usando ILIKE', async () => {
      await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo) VALUES
          ('LAB-001', 'Hemograma completo', true),
          ('LAB-002', 'Glucemia basal', true),
          ('IMG-001', 'Radiografía de tórax', true)
      `);

      const resultado = await service.findAll('hemograma');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].descripcion).toBe('Hemograma completo');
    });

    it('filtra por código usando ILIKE', async () => {
      await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo) VALUES
          ('LAB-001', 'Hemograma completo', true),
          ('LAB-002', 'Glucemia basal', true),
          ('IMG-001', 'Radiografía de tórax', true)
      `);

      const resultado = await service.findAll('IMG');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].codigo).toBe('IMG-001');
    });
  });

  describe('findOne', () => {
    it('retorna la práctica existente', async () => {
      const [{ id }] = await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo)
        VALUES ('ECG-001', 'Electrocardiograma', true) RETURNING id
      `);

      const practica = await service.findOne(id);

      expect(practica.id).toBe(id);
      expect(practica.codigo).toBe('ECG-001');
      expect(practica.descripcion).toBe('Electrocardiograma');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── aranceles_obra_social ──────────────────────────────────────────────────

  describe('setArancel', () => {
    it('persiste arancel para una práctica y obra social', async () => {
      const [os] = await ds.query(`
        INSERT INTO obras_sociales (nombre, activa)
        VALUES ('OSDE Test', true) RETURNING id
      `);
      const [practica] = await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo)
        VALUES ('LAB-010', 'Uricemia', true) RETURNING id
      `);

      const arancel = await service.setArancel({
        practica: { id: practica.id } as any,
        obraSocial: { id: os.id } as any,
        valorArancel: 1500,
        vigenciaDesde: new Date('2026-01-01'),
      });

      expect(arancel.id).toBeGreaterThan(0);
      expect(Number(arancel.valorArancel)).toBe(1500);

      // Verificar en BD
      const [row] = await ds.query(
        `SELECT "valorArancel", "practicaId", "obraSocialId"
         FROM aranceles_obra_social WHERE id = $1`,
        [arancel.id],
      );
      expect(Number(row.valorArancel)).toBe(1500);
      expect(row.practicaId).toBe(practica.id);
      expect(row.obraSocialId).toBe(os.id);
    });
  });

  describe('getArancelParaOS', () => {
    let practicaId: number;
    let obraSocialId: number;

    beforeEach(async () => {
      const [os] = await ds.query(`
        INSERT INTO obras_sociales (nombre, activa)
        VALUES ('Swiss Medical Test', true) RETURNING id
      `);
      const [practica] = await ds.query(`
        INSERT INTO nomenclador_inos (codigo, descripcion, activo)
        VALUES ('CON-001', 'Consulta médica', true) RETURNING id
      `);
      practicaId = practica.id;
      obraSocialId = os.id;
    });

    it('retorna el arancel vigente (vigenciaDesde <= hoy, vigenciaHasta IS NULL)', async () => {
      await ds.query(
        `INSERT INTO aranceles_obra_social
           ("practicaId", "obraSocialId", "valorArancel", "porcentajeCopago", "vigenciaDesde")
         VALUES ($1, $2, 2500, 0, '2026-01-01')`,
        [practicaId, obraSocialId],
      );

      const arancel = await service.getArancelParaOS(practicaId, obraSocialId);

      expect(arancel).not.toBeNull();
      expect(Number(arancel!.valorArancel)).toBe(2500);
    });

    it('retorna null si el arancel tiene vigenciaHasta en el pasado', async () => {
      // vigenciaHasta ya vencida
      await ds.query(
        `INSERT INTO aranceles_obra_social
           ("practicaId", "obraSocialId", "valorArancel", "porcentajeCopago", "vigenciaDesde", "vigenciaHasta")
         VALUES ($1, $2, 1000, 0, '2025-01-01', '2025-12-31')`,
        [practicaId, obraSocialId],
      );

      const arancel = await service.getArancelParaOS(practicaId, obraSocialId);

      expect(arancel).toBeNull();
    });

    it('retorna null si no existe arancel para esa combinación', async () => {
      const arancel = await service.getArancelParaOS(practicaId, obraSocialId);

      expect(arancel).toBeNull();
    });
  });
});
