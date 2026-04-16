import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FacturacionService } from '../../../src/facturacion/services/facturacion.service';
import {
  Factura,
  EstadoFactura,
} from '../../../src/facturacion/entities/factura.entity';
import {
  DetalleFactura,
  EstadoDetalle,
} from '../../../src/facturacion/entities/detalle-factura.entity';
import { Liquidacion } from '../../../src/facturacion/entities/liquidacion.entity';
import {
  ItemLiquidacion,
  TipoItemLiquidacion,
} from '../../../src/facturacion/entities/item-liquidacion.entity';
import { ObrasSocialesService } from '../../../src/maestros/services/obras-sociales.service';
import { ProfesionalesService } from '../../../src/maestros/services/profesionales.service';
import { NomencladorService } from '../../../src/maestros/services/nomenclador.service';

const mockFacturaRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockDetalleRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockLiquidacionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};
const mockItemLiquidRepo = { create: jest.fn(), save: jest.fn() };

const mockObrasSocialesService = { findOne: jest.fn() };
const mockProfesionalesService = { findOne: jest.fn() };
const mockNomencladorService = { findOne: jest.fn() };

const mockManager = {
  save: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  increment: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((callback: any) => callback(mockManager)),
};

describe('FacturacionService', () => {
  let service: FacturacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacturacionService,
        { provide: getRepositoryToken(Factura), useValue: mockFacturaRepo },
        {
          provide: getRepositoryToken(DetalleFactura),
          useValue: mockDetalleRepo,
        },
        {
          provide: getRepositoryToken(Liquidacion),
          useValue: mockLiquidacionRepo,
        },
        {
          provide: getRepositoryToken(ItemLiquidacion),
          useValue: mockItemLiquidRepo,
        },
        { provide: ObrasSocialesService, useValue: mockObrasSocialesService },
        { provide: ProfesionalesService, useValue: mockProfesionalesService },
        { provide: NomencladorService, useValue: mockNomencladorService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<FacturacionService>(FacturacionService);
    jest.clearAllMocks();
  });

  // ── findAll (GET) ─────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna todas las facturas ordenadas por fecha de emisión', async () => {
      const facturas = [
        { id: 1, nroFactura: 'F-001', estado: EstadoFactura.EMITIDA },
        { id: 2, nroFactura: 'F-002', estado: EstadoFactura.LIQUIDADA },
      ];
      mockFacturaRepo.find.mockResolvedValue(facturas);

      const result = await service.findAll();

      expect(result).toEqual(facturas);
      expect(mockFacturaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { fechaEmision: 'DESC' },
        }),
      );
    });

    it('retorna lista vacía si no hay facturas', async () => {
      mockFacturaRepo.find.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  // ── findOne (GET) ─────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la factura con detalles cuando existe', async () => {
      const factura = {
        id: 1,
        nroFactura: 'F-001',
        estado: EstadoFactura.EMITIDA,
        detalles: [],
        liquidaciones: [],
      };
      mockFacturaRepo.findOne.mockResolvedValue(factura);

      expect(await service.findOne(1)).toEqual(factura);
      expect(mockFacturaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('lanza NotFoundException si la factura no existe', async () => {
      mockFacturaRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── crearFactura (POST) ───────────────────────────────────────────────────────

  describe('crearFactura (POST)', () => {
    it('crea la factura con sus detalles y calcula el monto total', async () => {
      const obraSocial = { id: 1, nombre: 'OSDE' };
      const prestador = { id: 2, apellido: 'Médico' };
      const factura = { id: 10, nroFactura: 'F-010', montoTotal: 0 };
      const facturaCompleta = {
        id: 10,
        nroFactura: 'F-010',
        montoTotal: 1500,
        detalles: [],
        liquidaciones: [],
      };

      mockObrasSocialesService.findOne.mockResolvedValue(obraSocial);
      mockProfesionalesService.findOne.mockResolvedValue(prestador);
      mockManager.save
        .mockResolvedValueOnce(factura) // Factura
        .mockResolvedValueOnce({}); // DetalleFactura
      mockManager.update.mockResolvedValue({ affected: 1 });
      mockFacturaRepo.findOne.mockResolvedValue(facturaCompleta);

      const result = await service.crearFactura({
        obraSocialId: 1,
        periodoDesde: new Date('2025-01-01'),
        periodoHasta: new Date('2025-01-31'),
        nroFactura: 'F-010',
        detalles: [{ internacionId: 5, prestadorId: 2, valorFacturado: 1500 }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockObrasSocialesService.findOne).toHaveBeenCalledWith(1);
      expect(result.montoTotal).toBe(1500);
    });
  });

  // ── consultaPrestador (GET) ───────────────────────────────────────────────────

  describe('consultaPrestador (GET)', () => {
    it('retorna pendientes y liquidadas del prestador', async () => {
      const pendientes = [{ id: 1, estado: EstadoDetalle.FACTURADO }];
      const liquidadas = [{ id: 2, estado: EstadoDetalle.LIQUIDADO }];

      mockDetalleRepo.find
        .mockResolvedValueOnce(pendientes)
        .mockResolvedValueOnce(liquidadas);

      const result = await service.consultaPrestador(7);

      expect(result.pendientesLiquidacion).toEqual(pendientes);
      expect(result.liquidadas).toEqual(liquidadas);
    });
  });
});
