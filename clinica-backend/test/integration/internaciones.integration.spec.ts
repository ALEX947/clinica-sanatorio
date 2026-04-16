/**
 * Tests de integración — InternacionesService
 *
 * Verifican que iniciar(), darAlta() y reintegrarGarantia() operen
 * correctamente sobre PostgreSQL real (clinica_test_db). El seed mínimo
 * provee paciente, profesional, obra social y cama listos para usar.
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InternacionesService } from '../../src/internaciones/services/internaciones.service';
import { PacientesService } from '../../src/maestros/services/pacientes.service';
import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';
import { ObrasSocialesService } from '../../src/maestros/services/obras-sociales.service';
import { CamasService } from '../../src/maestros/services/camas.service';

import {
  TipoInternacion,
  EstadoInternacion,
  MotivoAlta,
} from '../../src/internaciones/entities/internacion.entity';
import {
  TipoGarantia,
  EstadoGarantia,
} from '../../src/internaciones/entities/garantia.entity';

import {
  ALL_ENTITIES,
  testTypeOrmModule,
  TRUNCATE_ALL,
  seedMinimo,
} from './helpers';

describe('InternacionesService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: InternacionesService;
  let ds: DataSource;

  let ids: Awaited<ReturnType<typeof seedMinimo>>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [
        InternacionesService,
        PacientesService,
        ProfesionalesService,
        ObrasSocialesService,
        CamasService,
      ],
    }).compile();

    service = module.get(InternacionesService);
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

  // ── iniciar ────────────────────────────────────────────────────────────────

  describe('iniciar', () => {
    it('crea internación activa con diagnósticos y retorna con relaciones cargadas', async () => {
      const internacion = await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        nroAfiliado: 'AF-00001',
        diagnosticos: [
          { descripcion: 'Neumonía bilateral', prioridad: 1 },
          { descripcion: 'Insuficiencia respiratoria', prioridad: 2 },
        ],
      });

      expect(internacion.id).toBeGreaterThan(0);
      expect(internacion.estado).toBe(EstadoInternacion.ACTIVA);
      expect(internacion.tipo).toBe(TipoInternacion.URGENTE);
      expect(internacion.nroAfiliado).toBe('AF-00001');

      // Relaciones cargadas
      expect(internacion.paciente).toBeDefined();
      expect(internacion.paciente.id).toBe(ids.pacienteId);
      expect(internacion.cama).toBeDefined();
      expect(internacion.cama.id).toBe(ids.camaId);
      expect(internacion.obraSocial).toBeDefined();
      expect(internacion.obraSocial.id).toBe(ids.obraSocialId);
      expect(internacion.diagnosticos).toHaveLength(2);
    });

    it('marca la cama como ocupada al iniciar la internación', async () => {
      await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Fiebre alta', prioridad: 1 }],
      });

      const [row] = await ds.query(`SELECT estado FROM camas WHERE id = $1`, [
        ids.camaId,
      ]);
      expect(row.estado).toBe('ocupada');
    });

    it('persiste garantía cuando se provee', async () => {
      const internacion = await service.iniciar({
        tipo: TipoInternacion.PROGRAMADA,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Cirugía programada', prioridad: 1 }],
        garantia: {
          tipo: TipoGarantia.DEPOSITO,
          monto: 50000,
          nroComprobante: 'REC-2026-001',
        },
      });

      const garantias = await ds.query(
        `SELECT tipo, monto, estado, "nroComprobante"
         FROM garantias WHERE "internacionId" = $1`,
        [internacion.id],
      );
      expect(garantias).toHaveLength(1);
      expect(garantias[0].tipo).toBe('deposito');
      expect(Number(garantias[0].monto)).toBe(50000);
      expect(garantias[0].estado).toBe('vigente');
      expect(garantias[0].nroComprobante).toBe('REC-2026-001');
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todas las internaciones', async () => {
      // Ya existe una internacion del seedMinimo; agregar una segunda
      await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Dolor abdominal agudo', prioridad: 1 }],
      });

      const todas = await service.findAll();

      // seedMinimo inserta 1, iniciar agrega 1 más
      expect(todas.length).toBeGreaterThanOrEqual(2);
    });

    it('retorna solo las internaciones activas cuando activas=true', async () => {
      // La internación del seedMinimo está activa; darle el alta
      await ds.query(
        `UPDATE internaciones SET estado = 'alta', "fechaHoraAlta" = NOW()
         WHERE id = $1`,
        [ids.internacionId],
      );

      // Crear una nueva cama y una nueva internación activa
      const [sector] = await ds.query(
        `INSERT INTO sectores (nombre) VALUES ('Guardia') RETURNING id`,
      );
      const [cama2] = await ds.query(
        `INSERT INTO camas (numero, individual, estado, "sectorId")
         VALUES ('G-01', false, 'disponible', $1) RETURNING id`,
        [sector.id],
      );
      await service.iniciar({
        tipo: TipoInternacion.EMERGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: cama2.id,
        diagnosticos: [{ descripcion: 'Trauma múltiple', prioridad: 1 }],
      });

      const activas = await service.findAll(true);

      expect(activas).toHaveLength(1);
      expect(activas[0].estado).toBe(EstadoInternacion.ACTIVA);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna internacion con relaciones: paciente, cama, obraSocial, diagnosticos', async () => {
      const internacion = await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Hipertensión severa', prioridad: 1 }],
      });

      const encontrada = await service.findOne(internacion.id);

      expect(encontrada.id).toBe(internacion.id);
      expect(encontrada.paciente).toBeDefined();
      expect(encontrada.cama).toBeDefined();
      expect(encontrada.cama.sector).toBeDefined();
      expect(encontrada.obraSocial).toBeDefined();
      expect(encontrada.diagnosticos).toHaveLength(1);
      expect(encontrada.diagnosticos[0].descripcion).toBe(
        'Hipertensión severa',
      );
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── darAlta ────────────────────────────────────────────────────────────────

  describe('darAlta', () => {
    it('cambia estado a alta, registra fechaHoraAlta y libera la cama', async () => {
      const internacion = await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Arritmia cardíaca', prioridad: 1 }],
      });

      const conAlta = await service.darAlta(
        internacion.id,
        MotivoAlta.MEJORIA,
        'Paciente evolucionó favorablemente',
      );

      // Estado actualizado
      expect(conAlta.estado).toBe(EstadoInternacion.ALTA);
      expect(conAlta.motivoAlta).toBe(MotivoAlta.MEJORIA);
      expect(conAlta.fechaHoraAlta).toBeDefined();
      expect(conAlta.fechaHoraAlta).not.toBeNull();

      // Cama liberada
      const [row] = await ds.query(`SELECT estado FROM camas WHERE id = $1`, [
        ids.camaId,
      ]);
      expect(row.estado).toBe('disponible');
    });

    it('lanza BadRequestException si la internación ya tiene alta', async () => {
      const internacion = await service.iniciar({
        tipo: TipoInternacion.URGENTE,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Cuadro febril', prioridad: 1 }],
      });

      // Dar de alta la primera vez
      await service.darAlta(internacion.id, MotivoAlta.CURACION);

      // Intentar dar alta nuevamente
      await expect(
        service.darAlta(internacion.id, MotivoAlta.CURACION),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── reintegrarGarantia ─────────────────────────────────────────────────────

  describe('reintegrarGarantia', () => {
    it('cambia el estado de la garantía a REINTEGRADO y registra fechaReintegro', async () => {
      // Crear internación con garantía
      const internacion = await service.iniciar({
        tipo: TipoInternacion.PROGRAMADA,
        pacienteId: ids.pacienteId,
        profesionalIntervinienteId: ids.profesionalId,
        obraSocialId: ids.obraSocialId,
        camaId: ids.camaId,
        diagnosticos: [{ descripcion: 'Intervención electiva', prioridad: 1 }],
        garantia: {
          tipo: TipoGarantia.PAGARE,
          monto: 30000,
        },
      });

      // Obtener el ID de la garantía via SQL
      const [garantia] = await ds.query(
        `SELECT id FROM garantias WHERE "internacionId" = $1`,
        [internacion.id],
      );
      expect(garantia).toBeDefined();

      await service.reintegrarGarantia(garantia.id);

      // Verificar en BD
      const [row] = await ds.query(
        `SELECT estado, "fechaReintegro" FROM garantias WHERE id = $1`,
        [garantia.id],
      );
      expect(row.estado).toBe(EstadoGarantia.REINTEGRADO);
      expect(row.fechaReintegro).not.toBeNull();
    });
  });
});
