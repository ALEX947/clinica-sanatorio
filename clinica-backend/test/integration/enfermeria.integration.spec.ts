/**
 * Tests de integración — EnfermeriaService
 *
 * Verifican el comportamiento real de agenda de suministros, cronograma
 * de controles, historial (todos los estados), registro de suministros,
 * controles y realización de prácticas sobre la base de datos clinica_test_db.
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { EnfermeriaService } from '../../src/enfermeria/services/enfermeria.service';
import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';

import { EstadoEventoSuministro } from '../../src/enfermeria/entities/evento-suministro.entity';
import { EstadoEventoControl } from '../../src/enfermeria/entities/evento-control.entity';

import {
  ALL_ENTITIES,
  testTypeOrmModule,
  TRUNCATE_ALL,
  seedMinimo,
} from './helpers';

describe('EnfermeriaService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: EnfermeriaService;
  let ds: DataSource;

  let ids: Awaited<ReturnType<typeof seedMinimo>>;
  let eventoSuministroId: number;
  let eventoControlId: number;
  let practicaPrescriptaId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [EnfermeriaService, ProfesionalesService],
    }).compile();

    service = module.get(EnfermeriaService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(TRUNCATE_ALL);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(TRUNCATE_ALL);
    ids = await seedMinimo(ds);

    // Prescripción de medicamento
    const [prescMed] = await ds.query(
      `INSERT INTO prescripciones (tipo, estado, "fechaHoraPrescripcion", "internacionId", "profesionalPrescriptorId", "creadoEn", "actualizadoEn")
       VALUES ('medicamento', 'prescripta', NOW(), $1, $2, NOW(), NOW()) RETURNING id`,
      [ids.internacionId, ids.profesionalId],
    );

    // Medicamento prescripto
    const [medPrescripto] = await ds.query(
      `INSERT INTO medicamentos_prescriptos ("prescripcionId", droga, concentracion, presentacion, "inicioTratamiento", "finTratamiento", "periodicidadHoras", cantidad)
       VALUES ($1, 'Amoxicilina', '500mg', 'comprimido', NOW(), NOW() + interval '7 days', 8, 1) RETURNING id`,
      [prescMed.id],
    );

    // Evento de suministro (planificado 2 horas en el futuro)
    const [evSuministro] = await ds.query(
      `INSERT INTO eventos_suministro ("medicamentoPrescriptoId", "fechaHoraPlanificada", estado)
       VALUES ($1, NOW() + interval '2 hours', 'pendiente') RETURNING id`,
      [medPrescripto.id],
    );
    eventoSuministroId = evSuministro.id;

    // Prescripción de control especial
    const [prescControl] = await ds.query(
      `INSERT INTO prescripciones (tipo, estado, "fechaHoraPrescripcion", "internacionId", "profesionalPrescriptorId", "creadoEn", "actualizadoEn")
       VALUES ('control_especial', 'prescripta', NOW(), $1, $2, NOW(), NOW()) RETURNING id`,
      [ids.internacionId, ids.profesionalId],
    );

    // Control especial prescripto
    const [controlPrescripto] = await ds.query(
      `INSERT INTO controles_especiales_prescriptos ("prescripcionId", "tipoControl", "inicioControl", "finControl", "periodicidadHoras")
       VALUES ($1, 'Temperatura', NOW(), NOW() + interval '3 days', 4) RETURNING id`,
      [prescControl.id],
    );

    // Evento de control (planificado 1 hora en el futuro)
    const [evControl] = await ds.query(
      `INSERT INTO eventos_control ("controlEspecialPrescriptoId", "fechaHoraPlanificada", estado)
       VALUES ($1, NOW() + interval '1 hour', 'pendiente') RETURNING id`,
      [controlPrescripto.id],
    );
    eventoControlId = evControl.id;

    // Prescripción de práctica
    const [prescPractica] = await ds.query(
      `INSERT INTO prescripciones (tipo, estado, "fechaHoraPrescripcion", "internacionId", "profesionalPrescriptorId", "creadoEn", "actualizadoEn")
       VALUES ('practica', 'prescripta', NOW(), $1, $2, NOW(), NOW()) RETURNING id`,
      [ids.internacionId, ids.profesionalId],
    );

    // Práctica prescripta
    const [practicaPrescripta] = await ds.query(
      `INSERT INTO practicas_prescriptas ("prescripcionId", "practicaId")
       VALUES ($1, $2) RETURNING id`,
      [prescPractica.id, ids.practicaId],
    );
    practicaPrescriptaId = practicaPrescripta.id;
  });

  // ── agendaSuministrosPorPeriodo ────────────────────────────────────────────

  describe('agendaSuministrosPorPeriodo', () => {
    it('retorna los eventos pendientes dentro del rango de fechas', async () => {
      const desde = new Date();
      const hasta = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const resultado = await service.agendaSuministrosPorPeriodo(desde, hasta);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(eventoSuministroId);
      expect(resultado[0].estado).toBe(EstadoEventoSuministro.PENDIENTE);
    });

    it('retorna vacío si el rango no incluye el evento planificado', async () => {
      const desde = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const hasta = new Date(Date.now() - 1 * 60 * 60 * 1000);

      const resultado = await service.agendaSuministrosPorPeriodo(desde, hasta);

      expect(resultado).toHaveLength(0);
    });

    it('no retorna eventos ya suministrados', async () => {
      await service.registrarSuministro(eventoSuministroId, {
        personalEnfermeriaId: ids.profesionalId,
      });

      const desde = new Date();
      const hasta = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const resultado = await service.agendaSuministrosPorPeriodo(desde, hasta);

      expect(resultado).toHaveLength(0);
    });
  });

  // ── historialSuministros ───────────────────────────────────────────────────

  describe('historialSuministros', () => {
    it('sin filtro de fechas retorna todos los eventos', async () => {
      const resultado = await service.historialSuministros();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(eventoSuministroId);
    });

    it('retorna eventos SUMINISTRADO en el historial', async () => {
      await service.registrarSuministro(eventoSuministroId, {
        personalEnfermeriaId: ids.profesionalId,
        observaciones: 'Sin novedad',
      });

      const resultado = await service.historialSuministros();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoEventoSuministro.SUMINISTRADO);
    });

    it('incluye el personal de enfermería que realizó el suministro', async () => {
      await service.registrarSuministro(eventoSuministroId, {
        personalEnfermeriaId: ids.profesionalId,
      });

      const resultado = await service.historialSuministros();

      expect(resultado[0].personalEnfermeria).toBeDefined();
      expect(resultado[0].personalEnfermeria.id).toBe(ids.profesionalId);
    });

    it('con rango de fechas retorna solo los eventos en ese rango', async () => {
      const desde = new Date(Date.now() + 1 * 60 * 60 * 1000); // +1h
      const hasta = new Date(Date.now() + 4 * 60 * 60 * 1000); // +4h (incluye el evento a +2h)

      const resultado = await service.historialSuministros(desde, hasta);

      expect(resultado).toHaveLength(1);
    });

    it('con rango que no incluye el evento retorna vacío', async () => {
      const desde = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const hasta = new Date(Date.now() - 1 * 60 * 60 * 1000);

      const resultado = await service.historialSuministros(desde, hasta);

      expect(resultado).toHaveLength(0);
    });
  });

  // ── cronogramaControlesPorPeriodo ──────────────────────────────────────────

  describe('cronogramaControlesPorPeriodo', () => {
    it('retorna los controles pendientes dentro del rango de fechas', async () => {
      const desde = new Date();
      const hasta = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const resultado = await service.cronogramaControlesPorPeriodo(
        desde,
        hasta,
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(eventoControlId);
      expect(resultado[0].estado).toBe(EstadoEventoControl.PENDIENTE);
    });
  });

  // ── historialControles ─────────────────────────────────────────────────────

  describe('historialControles', () => {
    it('sin filtro de fechas retorna todos los controles', async () => {
      const resultado = await service.historialControles();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(eventoControlId);
    });

    it('retorna controles REALIZADO en el historial', async () => {
      await service.registrarControl(eventoControlId, {
        personalEnfermeriaId: ids.profesionalId,
        resultado: 'Temperatura: 37.0°C',
      });

      const resultado = await service.historialControles();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoEventoControl.REALIZADO);
      expect(resultado[0].resultado).toBe('Temperatura: 37.0°C');
    });

    it('incluye el personal de enfermería que realizó el control', async () => {
      await service.registrarControl(eventoControlId, {
        personalEnfermeriaId: ids.profesionalId,
        resultado: '120/80 mmHg',
      });

      const resultado = await service.historialControles();

      expect(resultado[0].personalEnfermeria).toBeDefined();
      expect(resultado[0].personalEnfermeria.id).toBe(ids.profesionalId);
    });

    it('con rango de fechas retorna solo los controles en ese rango', async () => {
      const desde = new Date(Date.now() + 30 * 60 * 1000); // +30min
      const hasta = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3h (incluye el evento a +1h)

      const resultado = await service.historialControles(desde, hasta);

      expect(resultado).toHaveLength(1);
    });

    it('con rango que no incluye el evento retorna vacío', async () => {
      const desde = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const hasta = new Date(Date.now() - 1 * 60 * 60 * 1000);

      const resultado = await service.historialControles(desde, hasta);

      expect(resultado).toHaveLength(0);
    });
  });

  // ── registrarSuministro ────────────────────────────────────────────────────

  describe('registrarSuministro', () => {
    it('cambia el estado del evento a SUMINISTRADO y registra el personal de enfermería', async () => {
      const resultado = await service.registrarSuministro(eventoSuministroId, {
        personalEnfermeriaId: ids.profesionalId,
        observaciones: 'Administrado sin inconvenientes',
      });

      expect(resultado).toBeDefined();
      expect(resultado!.estado).toBe(EstadoEventoSuministro.SUMINISTRADO);
      expect(resultado!.personalEnfermeria).toBeDefined();
      expect(resultado!.personalEnfermeria.id).toBe(ids.profesionalId);
    });

    it('lanza NotFoundException si el evento de suministro no existe', async () => {
      await expect(
        service.registrarSuministro(999999, {
          personalEnfermeriaId: ids.profesionalId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── registrarControl ───────────────────────────────────────────────────────

  describe('registrarControl', () => {
    it('cambia el estado del evento a REALIZADO y guarda el resultado', async () => {
      const resultado = await service.registrarControl(eventoControlId, {
        personalEnfermeriaId: ids.profesionalId,
        resultado: 'Temperatura: 37.2°C',
        observaciones: 'Control dentro de parámetros normales',
      });

      expect(resultado).toBeDefined();
      expect(resultado!.estado).toBe(EstadoEventoControl.REALIZADO);
      expect(resultado!.resultado).toBe('Temperatura: 37.2°C');
      expect(resultado!.personalEnfermeria).toBeDefined();
      expect(resultado!.personalEnfermeria.id).toBe(ids.profesionalId);
    });

    it('lanza NotFoundException si el evento de control no existe', async () => {
      await expect(
        service.registrarControl(999999, {
          personalEnfermeriaId: ids.profesionalId,
          resultado: 'N/A',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── registrarRealizacionPractica ───────────────────────────────────────────

  describe('registrarRealizacionPractica', () => {
    it('persiste la realización con al menos un profesional interviniente en la base de datos', async () => {
      const resultado = await service.registrarRealizacionPractica({
        practicaPrescriptaId,
        profesionalesIntervinientesIds: [ids.profesionalId],
        observaciones: 'Práctica realizada sin complicaciones',
      });

      expect(resultado.id).toBeGreaterThan(0);
      expect(resultado.profesionalesIntervinientes).toHaveLength(1);
      expect(resultado.profesionalesIntervinientes[0].id).toBe(
        ids.profesionalId,
      );

      const [{ count }] = await ds.query(
        `SELECT COUNT(*) FROM realizaciones_practica rp
         WHERE rp."practicaPrescriptaId" = $1`,
        [practicaPrescriptaId],
      );
      expect(Number(count)).toBeGreaterThan(0);
    });
  });
});
