/**
 * Tests de integración — PrescripcionesService
 *
 * Verifican que los métodos con dataSource.transaction() retornen
 * correctamente la entidad creada DESPUÉS del commit (no 404 por
 * aislamiento READ COMMITTED de PostgreSQL).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PrescripcionesService } from '../../src/prescripciones/services/prescripciones.service';
import { InternacionesService } from '../../src/internaciones/services/internaciones.service';
import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';
import { NomencladorService } from '../../src/maestros/services/nomenclador.service';
import { ObrasSocialesService } from '../../src/maestros/services/obras-sociales.service';
import { PacientesService } from '../../src/maestros/services/pacientes.service';
import { CamasService } from '../../src/maestros/services/camas.service';

import { TipoPrescripcion } from '../../src/prescripciones/entities/prescripcion.entity';
import { PresentacionMedicamento } from '../../src/prescripciones/entities/medicamento-prescripto.entity';

import {
  ALL_ENTITIES,
  testTypeOrmModule,
  TRUNCATE_ALL,
  seedMinimo,
} from './helpers';

describe('PrescripcionesService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: PrescripcionesService;
  let ds: DataSource;

  let ids: Awaited<ReturnType<typeof seedMinimo>>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [
        PrescripcionesService,
        InternacionesService,
        ProfesionalesService,
        NomencladorService,
        ObrasSocialesService,
        PacientesService,
        CamasService,
      ],
    }).compile();

    service = module.get(PrescripcionesService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(TRUNCATE_ALL);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(TRUNCATE_ALL);
    ids = await seedMinimo(ds);
  });

  // ── prescribirPractica ─────────────────────────────────────────────────────

  describe('prescribirPractica', () => {
    it('retorna la prescripción con ID válido (no lanza 404 por aislamiento de transacción)', async () => {
      // Antes del fix: this.findOne() se llamaba dentro de la transacción abierta.
      // PostgreSQL (READ COMMITTED) no permite ver filas no comprometidas desde otra
      // conexión → findOne retornaba null → NotFoundException.
      const result = await service.prescribirPractica({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        practicaId: ids.practicaId,
        diagnosticos: [{ descripcion: 'Diagnóstico de prueba', prioridad: 1 }],
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.tipo).toBe(TipoPrescripcion.PRACTICA);
      expect(result.diagnosticos).toHaveLength(1);
      expect(result.diagnosticos[0].descripcion).toBe('Diagnóstico de prueba');
    });

    it('persiste la práctica prescripta e indicaciones en la BD', async () => {
      const result = await service.prescribirPractica({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        practicaId: ids.practicaId,
        indicaciones: 'Solicitar en ayunas',
        diagnosticos: [{ descripcion: 'Control laboratorio', prioridad: 1 }],
      });

      const [row] = await ds.query(
        `SELECT pp.indicaciones, pp."practicaId"
         FROM practicas_prescriptas pp WHERE pp."prescripcionId" = $1`,
        [result.id],
      );
      expect(row.indicaciones).toBe('Solicitar en ayunas');
      expect(row.practicaId).toBe(ids.practicaId);
    });
  });

  // ── prescribirMedicamento ──────────────────────────────────────────────────

  describe('prescribirMedicamento', () => {
    it('retorna la prescripción con ID válido (no lanza 404 por aislamiento de transacción)', async () => {
      const result = await service.prescribirMedicamento({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        droga: 'Amoxicilina',
        concentracion: '500 mg',
        presentacion: PresentacionMedicamento.COMPRIMIDO,
        inicioTratamiento: new Date('2026-04-12T08:00:00Z'),
        finTratamiento: new Date('2026-04-13T08:00:00Z'),
        periodicidadHoras: 8,
        cantidad: 1,
        diagnosticos: [{ descripcion: 'Infección bacteriana', prioridad: 1 }],
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.tipo).toBe(TipoPrescripcion.MEDICAMENTO);
    });

    it('genera automáticamente la agenda de suministros', async () => {
      // inicio 08:00, fin 08:00 del día siguiente, cada 8hs → 4 eventos (08, 16, 00, 08)
      const result = await service.prescribirMedicamento({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        droga: 'Ibuprofeno',
        concentracion: '400 mg',
        presentacion: PresentacionMedicamento.COMPRIMIDO,
        inicioTratamiento: new Date('2026-04-12T08:00:00Z'),
        finTratamiento: new Date('2026-04-13T08:00:00Z'),
        periodicidadHoras: 8,
        cantidad: 1,
        diagnosticos: [{ descripcion: 'Dolor', prioridad: 1 }],
      });

      const [{ count }] = await ds.query(
        `SELECT COUNT(*) FROM eventos_suministro es
         JOIN medicamentos_prescriptos mp ON es."medicamentoPrescriptoId" = mp.id
         WHERE mp."prescripcionId" = $1`,
        [result.id],
      );
      expect(Number(count)).toBe(4);
    });

    it('todos los eventos generados empiezan en estado pendiente', async () => {
      const result = await service.prescribirMedicamento({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        droga: 'Metoclopramida',
        concentracion: '10 mg',
        presentacion: PresentacionMedicamento.INYECTABLE,
        inicioTratamiento: new Date('2026-04-12T08:00:00Z'),
        finTratamiento: new Date('2026-04-12T16:00:00Z'),
        periodicidadHoras: 8,
        cantidad: 1,
        diagnosticos: [{ descripcion: 'Náuseas', prioridad: 1 }],
      });

      const [{ count }] = await ds.query(
        `SELECT COUNT(*) FROM eventos_suministro es
         JOIN medicamentos_prescriptos mp ON es."medicamentoPrescriptoId" = mp.id
         WHERE mp."prescripcionId" = $1 AND es.estado = 'pendiente'`,
        [result.id],
      );
      // 08:00 y 16:00 → 2 eventos pendientes
      expect(Number(count)).toBe(2);
    });
  });

  // ── prescribirControlEspecial ──────────────────────────────────────────────

  describe('prescribirControlEspecial', () => {
    it('retorna la prescripción con ID válido (no lanza 404 por aislamiento de transacción)', async () => {
      const result = await service.prescribirControlEspecial({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        tipoControl: 'Temperatura',
        inicioControl: new Date('2026-04-12T08:00:00Z'),
        finControl: new Date('2026-04-12T20:00:00Z'),
        periodicidadHoras: 4,
        diagnosticos: [{ descripcion: 'Control febril', prioridad: 1 }],
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.tipo).toBe(TipoPrescripcion.CONTROL_ESPECIAL);
    });

    it('genera automáticamente el cronograma de controles', async () => {
      // inicio 08:00, fin 20:00, cada 4hs → 4 eventos (08, 12, 16, 20)
      const result = await service.prescribirControlEspecial({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        tipoControl: 'Presión arterial',
        inicioControl: new Date('2026-04-12T08:00:00Z'),
        finControl: new Date('2026-04-12T20:00:00Z'),
        periodicidadHoras: 4,
        diagnosticos: [{ descripcion: 'Monitoreo TA', prioridad: 1 }],
      });

      const [{ count }] = await ds.query(
        `SELECT COUNT(*) FROM eventos_control ec
         JOIN controles_especiales_prescriptos cp ON ec."controlEspecialPrescriptoId" = cp.id
         WHERE cp."prescripcionId" = $1`,
        [result.id],
      );
      expect(Number(count)).toBe(4);
    });

    it('todos los eventos generados empiezan en estado pendiente', async () => {
      const result = await service.prescribirControlEspecial({
        internacionId: ids.internacionId,
        profesionalPrescriptorId: ids.profesionalId,
        tipoControl: 'Glucemia',
        inicioControl: new Date('2026-04-12T08:00:00Z'),
        finControl: new Date('2026-04-12T08:00:00Z'),
        periodicidadHoras: 8,
        diagnosticos: [{ descripcion: 'Diabetes', prioridad: 1 }],
      });

      const [{ count }] = await ds.query(
        `SELECT COUNT(*) FROM eventos_control ec
         JOIN controles_especiales_prescriptos cp ON ec."controlEspecialPrescriptoId" = cp.id
         WHERE cp."prescripcionId" = $1 AND ec.estado = 'pendiente'`,
        [result.id],
      );
      expect(Number(count)).toBe(1);
    });
  });
});
