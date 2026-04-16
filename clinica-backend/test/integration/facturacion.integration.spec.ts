/**
 * Tests de integración — FacturacionService
 *
 * Verifican que crearFactura() retorne el ID creado (no 404) y que
 * registrarLiquidacion() retorne el estado actualizado (no estado stale
 * previo al commit de la transacción).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { FacturacionService } from '../../src/facturacion/services/facturacion.service';
import { ObrasSocialesService } from '../../src/maestros/services/obras-sociales.service';
import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';
import { NomencladorService } from '../../src/maestros/services/nomenclador.service';

import { EstadoFactura } from '../../src/facturacion/entities/factura.entity';
import { TipoItemLiquidacion } from '../../src/facturacion/entities/item-liquidacion.entity';

import {
  ALL_ENTITIES,
  testTypeOrmModule,
  TRUNCATE_ALL,
  seedMinimo,
} from './helpers';

describe('FacturacionService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: FacturacionService;
  let ds: DataSource;

  let ids: Awaited<ReturnType<typeof seedMinimo>>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [
        FacturacionService,
        ObrasSocialesService,
        ProfesionalesService,
        NomencladorService,
      ],
    }).compile();

    service = module.get(FacturacionService);
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

  // ── crearFactura ───────────────────────────────────────────────────────────

  describe('crearFactura', () => {
    it('retorna la factura creada con ID válido (no lanza 404 por aislamiento de transacción)', async () => {
      // Antes del fix: this.findOne(factura.id) se llamaba dentro de la transacción
      // abierta → la factura recién guardada era invisible para la conexión del pool
      // → findOne retornaba null → NotFoundException.
      const result = await service.crearFactura({
        obraSocialId: ids.obraSocialId,
        periodoDesde: new Date('2026-03-01'),
        periodoHasta: new Date('2026-03-31'),
        nroFactura: 'F-TEST-001',
        detalles: [
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 5000,
            copagoPrecobrado: 0,
          },
        ],
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.nroFactura).toBe('F-TEST-001');
      expect(result.estado).toBe(EstadoFactura.EMITIDA);
    });

    it('calcula correctamente el montoTotal sumando los detalles', async () => {
      const result = await service.crearFactura({
        obraSocialId: ids.obraSocialId,
        periodoDesde: new Date('2026-03-01'),
        periodoHasta: new Date('2026-03-31'),
        nroFactura: 'F-TEST-002',
        detalles: [
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 3000,
          },
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 2000,
          },
        ],
      });

      expect(Number(result.montoTotal)).toBe(5000);
      expect(result.detalles).toHaveLength(2);
    });

    it('incluye los detalles con relaciones cargadas', async () => {
      const result = await service.crearFactura({
        obraSocialId: ids.obraSocialId,
        periodoDesde: new Date('2026-03-01'),
        periodoHasta: new Date('2026-03-31'),
        nroFactura: 'F-TEST-003',
        detalles: [
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            practicaId: ids.practicaId,
            valorFacturado: 1200,
          },
        ],
      });

      const detalle = result.detalles[0];
      expect(detalle.prestador).toBeDefined();
      expect(detalle.practica).toBeDefined();
      expect(detalle.practica.codigo).toBe('TST-001');
    });
  });

  // ── registrarLiquidacion ───────────────────────────────────────────────────

  describe('registrarLiquidacion', () => {
    let facturaId: number;
    let detalleId: number;

    beforeEach(async () => {
      // Crear factura con un detalle para poder liquidarla
      const factura = await service.crearFactura({
        obraSocialId: ids.obraSocialId,
        periodoDesde: new Date('2026-03-01'),
        periodoHasta: new Date('2026-03-31'),
        nroFactura: 'F-LIQ-001',
        detalles: [
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 10000,
          },
        ],
      });
      facturaId = factura.id;
      detalleId = factura.detalles[0].id;
    });

    it('retorna la factura con estado LIQUIDADA después del commit (no retorna estado stale)', async () => {
      // Antes del fix: this.findOne() se llamaba dentro de la transacción que
      // actualizaba el estado → retornaba el estado previo ('emitida') en lugar
      // del nuevo ('liquidada'), porque la otra conexión no veía los cambios.
      const result = await service.registrarLiquidacion({
        facturaId,
        fechaLiquidacion: new Date(),
        items: [
          {
            detalleFacturaId: detalleId,
            tipo: TipoItemLiquidacion.RECONOCIDO,
            monto: 10000,
          },
        ],
      });

      expect(result.estado).toBe(EstadoFactura.LIQUIDADA);
    });

    it('retorna PARCIALMENTE_LIQUIDADA cuando quedan detalles sin liquidar', async () => {
      // Crear factura con 2 detalles pero liquidar solo 1
      const factura2 = await service.crearFactura({
        obraSocialId: ids.obraSocialId,
        periodoDesde: new Date('2026-03-01'),
        periodoHasta: new Date('2026-03-31'),
        nroFactura: 'F-LIQ-002',
        detalles: [
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 6000,
          },
          {
            internacionId: ids.internacionId,
            prestadorId: ids.profesionalId,
            valorFacturado: 4000,
          },
        ],
      });

      const result = await service.registrarLiquidacion({
        facturaId: factura2.id,
        fechaLiquidacion: new Date(),
        items: [
          {
            detalleFacturaId: factura2.detalles[0].id,
            tipo: TipoItemLiquidacion.RECONOCIDO,
            monto: 6000,
          },
        ],
      });

      expect(result.estado).toBe(EstadoFactura.PARCIALMENTE_LIQUIDADA);
    });

    it('acredita el monto en el saldo del prestador', async () => {
      await service.registrarLiquidacion({
        facturaId,
        fechaLiquidacion: new Date(),
        items: [
          {
            detalleFacturaId: detalleId,
            tipo: TipoItemLiquidacion.RECONOCIDO,
            monto: 10000,
          },
        ],
      });

      const [{ saldoCuenta }] = await ds.query(
        `SELECT "saldoCuenta" FROM profesionales WHERE id = $1`,
        [ids.profesionalId],
      );
      expect(Number(saldoCuenta)).toBe(10000);
    });
  });
});
