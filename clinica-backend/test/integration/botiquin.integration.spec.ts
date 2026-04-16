/**
 * Tests de integración — BotiquinService
 *
 * Verifican el ciclo de vida completo de solicitudes de abastecimiento:
 * creación, consulta, historial (con y sin filtro), entrega (completa y parcial)
 * y devolución, sobre la base de datos clinica_test_db.
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { BotiquinService } from '../../src/botiquin/services/botiquin.service';
import { InternacionesService } from '../../src/internaciones/services/internaciones.service';
import { PacientesService } from '../../src/maestros/services/pacientes.service';
import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';
import { ObrasSocialesService } from '../../src/maestros/services/obras-sociales.service';
import { CamasService } from '../../src/maestros/services/camas.service';

import { EstadoSolicitud } from '../../src/botiquin/entities/solicitud-abastecimiento.entity';

import {
  ALL_ENTITIES,
  testTypeOrmModule,
  TRUNCATE_ALL,
  seedMinimo,
} from './helpers';

describe('BotiquinService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: BotiquinService;
  let ds: DataSource;

  let ids: Awaited<ReturnType<typeof seedMinimo>>;
  let medicamentoPrescriptoId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [
        BotiquinService,
        InternacionesService,
        PacientesService,
        ProfesionalesService,
        ObrasSocialesService,
        CamasService,
      ],
    }).compile();

    service = module.get(BotiquinService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(TRUNCATE_ALL);
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(TRUNCATE_ALL);
    ids = await seedMinimo(ds);

    const [prescMed] = await ds.query(
      `INSERT INTO prescripciones (tipo, estado, "fechaHoraPrescripcion", "internacionId", "profesionalPrescriptorId", "creadoEn", "actualizadoEn")
       VALUES ('medicamento', 'prescripta', NOW(), $1, $2, NOW(), NOW()) RETURNING id`,
      [ids.internacionId, ids.profesionalId],
    );

    const [medPrescripto] = await ds.query(
      `INSERT INTO medicamentos_prescriptos ("prescripcionId", droga, concentracion, presentacion, "inicioTratamiento", "finTratamiento", "periodicidadHoras", cantidad)
       VALUES ($1, 'Amoxicilina', '500mg', 'comprimido', NOW(), NOW() + interval '7 days', 8, 1) RETURNING id`,
      [prescMed.id],
    );
    medicamentoPrescriptoId = medPrescripto.id;
  });

  // ── crearSolicitud ─────────────────────────────────────────────────────────

  describe('crearSolicitud', () => {
    it('persiste la solicitud con estado PENDIENTE', async () => {
      const resultado = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 10 }],
      });

      expect(resultado.id).toBeGreaterThan(0);
      expect(resultado.estado).toBe(EstadoSolicitud.PENDIENTE);
    });

    it('persiste los ítems con la cantidadSolicitada correcta', async () => {
      const resultado = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 5 }],
      });

      expect(resultado.items).toHaveLength(1);
      expect(Number(resultado.items[0].cantidadSolicitada)).toBe(5);
      expect(resultado.items[0].medicamentoPrescripto).toBeDefined();
      expect(resultado.items[0].medicamentoPrescripto.id).toBe(
        medicamentoPrescriptoId,
      );
    });
  });

  // ── findSolicitudesPendientes ──────────────────────────────────────────────

  describe('findSolicitudesPendientes', () => {
    it('retorna solicitudes en estado PENDIENTE', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 3 }],
      });

      const resultado = await service.findSolicitudesPendientes();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.PENDIENTE);
    });

    it('retorna solicitudes en estado PARCIAL', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 6 }],
      });
      await service.registrarEntrega(solicitud.id, [
        { itemId: solicitud.items[0].id, cantidadEntregada: 3 },
      ]);

      const resultado = await service.findSolicitudesPendientes();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.PARCIAL);
    });

    it('retorna tanto PENDIENTE como PARCIAL al mismo tiempo', async () => {
      // Solicitud 1: queda PENDIENTE
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 2 }],
      });

      // Solicitud 2: queda PARCIAL
      const sol2 = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 8 }],
      });
      await service.registrarEntrega(sol2.id, [
        { itemId: sol2.items[0].id, cantidadEntregada: 4 },
      ]);

      const resultado = await service.findSolicitudesPendientes();

      expect(resultado).toHaveLength(2);
      const estados = resultado.map((s) => s.estado);
      expect(estados).toContain(EstadoSolicitud.PENDIENTE);
      expect(estados).toContain(EstadoSolicitud.PARCIAL);
    });

    it('no retorna las solicitudes ya entregadas', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 2 }],
      });
      await service.registrarEntrega(solicitud.id, [
        { itemId: solicitud.items[0].id, cantidadEntregada: 2 },
      ]);

      const resultado = await service.findSolicitudesPendientes();

      expect(resultado).toHaveLength(0);
    });
  });

  // ── findSolicitudes (historial) ────────────────────────────────────────────

  describe('findSolicitudes', () => {
    async function crearYEntregar(
      cantidadSolicitada: number,
      cantidadEntregada: number,
    ) {
      const sol = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada }],
      });
      await service.registrarEntrega(sol.id, [
        { itemId: sol.items[0].id, cantidadEntregada },
      ]);
      return sol;
    }

    it('sin filtro retorna todas las solicitudes', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      await crearYEntregar(4, 2); // → PARCIAL
      await crearYEntregar(3, 3); // → ENTREGADA

      const resultado = await service.findSolicitudes();

      expect(resultado).toHaveLength(3);
    });

    it('sin filtro ordena por creadoEn DESC (más reciente primero)', async () => {
      const s1 = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      const s2 = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 2 }],
      });

      const resultado = await service.findSolicitudes();

      expect(resultado[0].id).toBe(s2.id);
      expect(resultado[1].id).toBe(s1.id);
    });

    it('filtrado por PENDIENTE retorna sólo las pendientes', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      await crearYEntregar(4, 2); // → PARCIAL
      await crearYEntregar(3, 3); // → ENTREGADA

      const resultado = await service.findSolicitudes(
        EstadoSolicitud.PENDIENTE,
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.PENDIENTE);
    });

    it('filtrado por PARCIAL retorna sólo las parciales', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      await crearYEntregar(4, 2); // → PARCIAL
      await crearYEntregar(3, 3); // → ENTREGADA

      const resultado = await service.findSolicitudes(EstadoSolicitud.PARCIAL);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.PARCIAL);
    });

    it('filtrado por ENTREGADA retorna sólo las entregadas', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      await crearYEntregar(4, 2); // → PARCIAL
      await crearYEntregar(3, 3); // → ENTREGADA

      const resultado = await service.findSolicitudes(
        EstadoSolicitud.ENTREGADA,
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.ENTREGADA);
    });

    it('retorna array vacío cuando no hay solicitudes que coincidan', async () => {
      const resultado = await service.findSolicitudes(
        EstadoSolicitud.ENTREGADA,
      );
      expect(resultado).toHaveLength(0);
    });

    it('filtrado por rango de fechas retorna solo las solicitudes en ese período', async () => {
      const antes = new Date(Date.now() - 1000); // justo antes de crear
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });
      const despues = new Date(Date.now() + 1000); // justo después

      const resultado = await service.findSolicitudes(
        undefined,
        antes,
        despues,
      );

      expect(resultado).toHaveLength(1);
    });

    it('filtrado por rango que no incluye las solicitudes retorna vacío', async () => {
      await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 1 }],
      });

      const ayer = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const hace1h = new Date(Date.now() - 60 * 60 * 1000);

      const resultado = await service.findSolicitudes(undefined, ayer, hace1h);

      expect(resultado).toHaveLength(0);
    });

    it('filtrado por estado y rango de fechas combina ambos filtros', async () => {
      const antes = new Date(Date.now() - 1000);
      const sol1 = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 2 }],
      });
      await crearYEntregar(3, 3); // → ENTREGADA
      const despues = new Date(Date.now() + 1000);

      // Solo ENTREGADA dentro del rango
      const resultado = await service.findSolicitudes(
        EstadoSolicitud.ENTREGADA,
        antes,
        despues,
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].estado).toBe(EstadoSolicitud.ENTREGADA);
      expect(resultado[0].id).not.toBe(sol1.id);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna la solicitud con sus ítems y el medicamento prescripto cargado', async () => {
      const creada = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 7 }],
      });

      const resultado = await service.findOne(creada.id);

      expect(resultado.id).toBe(creada.id);
      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0].medicamentoPrescripto).toBeDefined();
      expect(resultado.internacion).toBeDefined();
      expect(resultado.internacion.id).toBe(ids.internacionId);
    });

    it('lanza NotFoundException para un ID inexistente', async () => {
      await expect(service.findOne(999999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── registrarEntrega ───────────────────────────────────────────────────────

  describe('registrarEntrega', () => {
    it('cambia el estado a ENTREGADA cuando cantidadEntregada >= cantidadSolicitada', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 4 }],
      });

      const resultado = await service.registrarEntrega(solicitud.id, [
        { itemId: solicitud.items[0].id, cantidadEntregada: 4 },
      ]);

      expect(resultado.estado).toBe(EstadoSolicitud.ENTREGADA);
      expect(Number(resultado.items[0].cantidadEntregada)).toBe(4);
    });

    it('cambia el estado a PARCIAL cuando cantidadEntregada < cantidadSolicitada', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 8 }],
      });

      const resultado = await service.registrarEntrega(solicitud.id, [
        { itemId: solicitud.items[0].id, cantidadEntregada: 3 },
      ]);

      expect(resultado.estado).toBe(EstadoSolicitud.PARCIAL);
      expect(Number(resultado.items[0].cantidadEntregada)).toBe(3);
    });

    it('una solicitud PARCIAL puede completarse en una segunda entrega', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 6 }],
      });
      const itemId = solicitud.items[0].id;

      // Primera entrega parcial
      await service.registrarEntrega(solicitud.id, [
        { itemId, cantidadEntregada: 3 },
      ]);

      // Segunda entrega completa la solicitud
      const resultado = await service.registrarEntrega(solicitud.id, [
        { itemId, cantidadEntregada: 6 },
      ]);

      expect(resultado.estado).toBe(EstadoSolicitud.ENTREGADA);
    });
  });

  // ── registrarDevolucion ────────────────────────────────────────────────────

  describe('registrarDevolucion', () => {
    it('incrementa cantidadDevuelta en el ítem y se puede verificar con findOne', async () => {
      const solicitud = await service.crearSolicitud({
        internacionId: ids.internacionId,
        items: [{ medicamentoPrescriptoId, cantidadSolicitada: 10 }],
      });
      const itemId = solicitud.items[0].id;

      await service.registrarEntrega(solicitud.id, [
        { itemId, cantidadEntregada: 10 },
      ]);
      await service.registrarDevolucion(itemId, 3);

      const actualizada = await service.findOne(solicitud.id);
      expect(Number(actualizada.items[0].cantidadDevuelta)).toBe(3);
    });
  });
});
