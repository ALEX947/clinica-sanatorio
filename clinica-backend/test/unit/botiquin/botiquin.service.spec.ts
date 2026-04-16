import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BotiquinService } from '../../../src/botiquin/services/botiquin.service';
import {
  SolicitudAbastecimiento,
  EstadoSolicitud,
} from '../../../src/botiquin/entities/solicitud-abastecimiento.entity';
import { ItemSolicitud } from '../../../src/botiquin/entities/item-solicitud.entity';
import { InternacionesService } from '../../../src/internaciones/services/internaciones.service';

const mockSolicitudRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockItemRepo = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
};

const mockInternacionesService = {
  findOne: jest.fn(),
};

describe('BotiquinService', () => {
  let service: BotiquinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotiquinService,
        {
          provide: getRepositoryToken(SolicitudAbastecimiento),
          useValue: mockSolicitudRepo,
        },
        { provide: getRepositoryToken(ItemSolicitud), useValue: mockItemRepo },
        { provide: InternacionesService, useValue: mockInternacionesService },
      ],
    }).compile();

    service = module.get<BotiquinService>(BotiquinService);
    jest.clearAllMocks();
  });

  // ── findSolicitudesPendientes (GET /solicitudes/pendientes) ───────────────────

  describe('findSolicitudesPendientes', () => {
    it('retorna solicitudes en estado PENDIENTE y PARCIAL', async () => {
      const activas = [
        { id: 1, estado: EstadoSolicitud.PENDIENTE },
        { id: 2, estado: EstadoSolicitud.PARCIAL },
      ];
      mockSolicitudRepo.find.mockResolvedValue(activas);

      const result = await service.findSolicitudesPendientes();

      expect(result).toEqual(activas);
      expect(mockSolicitudRepo.find).toHaveBeenCalledTimes(1);

      // Verifica que se usa In() con ambos estados
      const whereEstado = mockSolicitudRepo.find.mock.calls[0][0].where.estado;
      expect(whereEstado.value).toEqual(
        expect.arrayContaining([
          EstadoSolicitud.PENDIENTE,
          EstadoSolicitud.PARCIAL,
        ]),
      );
    });

    it('no retorna solicitudes ENTREGADA', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudesPendientes();

      const whereEstado = mockSolicitudRepo.find.mock.calls[0][0].where.estado;
      expect(whereEstado.value).not.toContain(EstadoSolicitud.ENTREGADA);
    });
  });

  // ── findSolicitudes (GET /solicitudes) ────────────────────────────────────────

  describe('findSolicitudes', () => {
    it('sin ningún filtro llama a find sin cláusula where', async () => {
      const todas = [
        { id: 1, estado: EstadoSolicitud.PENDIENTE },
        { id: 2, estado: EstadoSolicitud.ENTREGADA },
      ];
      mockSolicitudRepo.find.mockResolvedValue(todas);

      const result = await service.findSolicitudes();

      expect(result).toEqual(todas);
      const options = mockSolicitudRepo.find.mock.calls[0][0];
      expect(options.where).toBeUndefined();
    });

    it('con filtro PENDIENTE aplica where de estado', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(EstadoSolicitud.PENDIENTE);

      expect(mockSolicitudRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: EstadoSolicitud.PENDIENTE }),
        }),
      );
    });

    it('con filtro ENTREGADA aplica where de estado', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(EstadoSolicitud.ENTREGADA);

      expect(mockSolicitudRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: EstadoSolicitud.ENTREGADA }),
        }),
      );
    });

    it('con filtro PARCIAL aplica where de estado', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(EstadoSolicitud.PARCIAL);

      expect(mockSolicitudRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: EstadoSolicitud.PARCIAL }),
        }),
      );
    });

    it('con rango de fechas aplica Between en creadoEn', async () => {
      const desde = new Date('2025-01-01');
      const hasta = new Date('2025-01-31');
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(undefined, desde, hasta);

      const options = mockSolicitudRepo.find.mock.calls[0][0];
      expect(options.where.creadoEn).toBeDefined();
      expect(options.where.creadoEn.value).toEqual([desde, hasta]);
    });

    it('con estado y rango de fechas combina ambos filtros', async () => {
      const desde = new Date('2025-03-01');
      const hasta = new Date('2025-03-31');
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(EstadoSolicitud.ENTREGADA, desde, hasta);

      const options = mockSolicitudRepo.find.mock.calls[0][0];
      expect(options.where.estado).toBe(EstadoSolicitud.ENTREGADA);
      expect(options.where.creadoEn).toBeDefined();
      expect(options.where.creadoEn.value).toEqual([desde, hasta]);
    });

    it('con solo desde (sin hasta) no aplica filtro de fecha', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes(
        undefined,
        new Date('2025-01-01'),
        undefined,
      );

      const options = mockSolicitudRepo.find.mock.calls[0][0];
      expect(options.where).toBeUndefined();
    });

    it('ordena por creadoEn DESC', async () => {
      mockSolicitudRepo.find.mockResolvedValue([]);

      await service.findSolicitudes();

      const options = mockSolicitudRepo.find.mock.calls[0][0];
      expect(options.order).toEqual({ creadoEn: 'DESC' });
    });
  });

  // ── findOne (GET) ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna la solicitud cuando existe', async () => {
      const solicitud = { id: 1, estado: EstadoSolicitud.PENDIENTE, items: [] };
      mockSolicitudRepo.findOne.mockResolvedValue(solicitud);

      expect(await service.findOne(1)).toEqual(solicitud);
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── crearSolicitud (POST) ─────────────────────────────────────────────────────

  describe('crearSolicitud', () => {
    it('crea la solicitud con sus ítems', async () => {
      const internacion = { id: 5, estado: 'activa' };
      const solicitud = { id: 10, internacion };
      const solicitudConItems = {
        id: 10,
        internacion,
        items: [{ id: 1, cantidadSolicitada: 2 }],
      };

      mockInternacionesService.findOne.mockResolvedValue(internacion);
      mockSolicitudRepo.create.mockReturnValue({ internacion });
      mockSolicitudRepo.save.mockResolvedValue(solicitud);
      mockItemRepo.create.mockReturnValue({});
      mockItemRepo.save.mockResolvedValue({ id: 1 });
      mockSolicitudRepo.findOne.mockResolvedValue(solicitudConItems);

      const result = await service.crearSolicitud({
        internacionId: 5,
        items: [{ medicamentoPrescriptoId: 3, cantidadSolicitada: 2 }],
      });

      expect(mockInternacionesService.findOne).toHaveBeenCalledWith(5);
      expect(mockSolicitudRepo.save).toHaveBeenCalled();
      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(result).toEqual(solicitudConItems);
    });
  });

  // ── registrarEntrega (PATCH) ──────────────────────────────────────────────────

  describe('registrarEntrega', () => {
    it('actualiza estado a ENTREGADA si todos los ítems fueron entregados completamente', async () => {
      const solicitudConItems = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        items: [{ id: 1, cantidadSolicitada: 2, cantidadEntregada: 2 }],
      };

      mockItemRepo.update.mockResolvedValue({ affected: 1 });
      mockSolicitudRepo.findOne.mockResolvedValue(solicitudConItems);
      mockSolicitudRepo.update.mockResolvedValue({ affected: 1 });

      await service.registrarEntrega(1, [{ itemId: 1, cantidadEntregada: 2 }]);

      expect(mockSolicitudRepo.update).toHaveBeenCalledWith(1, {
        estado: EstadoSolicitud.ENTREGADA,
      });
    });

    it('actualiza estado a PARCIAL si algún ítem no fue entregado completamente', async () => {
      const solicitudConItems = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        items: [{ id: 1, cantidadSolicitada: 5, cantidadEntregada: 3 }],
      };

      mockItemRepo.update.mockResolvedValue({ affected: 1 });
      mockSolicitudRepo.findOne.mockResolvedValue(solicitudConItems);
      mockSolicitudRepo.update.mockResolvedValue({ affected: 1 });

      await service.registrarEntrega(1, [{ itemId: 1, cantidadEntregada: 3 }]);

      expect(mockSolicitudRepo.update).toHaveBeenCalledWith(1, {
        estado: EstadoSolicitud.PARCIAL,
      });
    });
  });
});
