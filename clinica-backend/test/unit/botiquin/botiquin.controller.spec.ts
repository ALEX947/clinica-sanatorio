import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { BotiquinController } from '../../../src/botiquin/controllers/botiquin.controller';
import { BotiquinService } from '../../../src/botiquin/services/botiquin.service';
import { EstadoSolicitud } from '../../../src/botiquin/entities/solicitud-abastecimiento.entity';
import { RolesGuard } from '../../../src/auth/roles.guard';

const mockService = {
  findSolicitudes: jest.fn(),
  findSolicitudesPendientes: jest.fn(),
  findOne: jest.fn(),
  crearSolicitud: jest.fn(),
  registrarEntrega: jest.fn(),
  registrarDevolucion: jest.fn(),
};

describe('BotiquinController', () => {
  let controller: BotiquinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotiquinController],
      providers: [{ provide: BotiquinService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BotiquinController>(BotiquinController);
    jest.clearAllMocks();
  });

  // ── GET /botiquin/solicitudes ─────────────────────────────────────────────────

  describe('listar (GET /solicitudes)', () => {
    it('sin query params delega a findSolicitudes con todo undefined', async () => {
      const todas = [{ id: 1 }, { id: 2 }];
      mockService.findSolicitudes.mockResolvedValue(todas);

      const result = await controller.listar(undefined, undefined, undefined);

      expect(result).toEqual(todas);
      expect(mockService.findSolicitudes).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
    });

    it('con estado convierte y delega correctamente', async () => {
      mockService.findSolicitudes.mockResolvedValue([]);

      await controller.listar(EstadoSolicitud.PENDIENTE, undefined, undefined);

      expect(mockService.findSolicitudes).toHaveBeenCalledWith(
        EstadoSolicitud.PENDIENTE,
        undefined,
        undefined,
      );
    });

    it('con fechas convierte strings a Date', async () => {
      mockService.findSolicitudes.mockResolvedValue([]);
      const desde = '2025-01-01T00:00:00.000Z';
      const hasta = '2025-01-31T23:59:59.000Z';

      await controller.listar(undefined, desde, hasta);

      expect(mockService.findSolicitudes).toHaveBeenCalledWith(
        undefined,
        new Date(desde),
        new Date(hasta),
      );
    });

    it('con estado y fechas combina ambos filtros', async () => {
      mockService.findSolicitudes.mockResolvedValue([]);
      const desde = '2025-03-01T00:00:00.000Z';
      const hasta = '2025-03-31T23:59:59.000Z';

      await controller.listar(EstadoSolicitud.ENTREGADA, desde, hasta);

      expect(mockService.findSolicitudes).toHaveBeenCalledWith(
        EstadoSolicitud.ENTREGADA,
        new Date(desde),
        new Date(hasta),
      );
    });
  });

  // ── GET /botiquin/solicitudes/pendientes ──────────────────────────────────────

  describe('pendientes (GET /solicitudes/pendientes)', () => {
    it('delega a findSolicitudesPendientes', async () => {
      const activas = [{ id: 1, estado: EstadoSolicitud.PENDIENTE }];
      mockService.findSolicitudesPendientes.mockResolvedValue(activas);

      const result = await controller.pendientes();

      expect(result).toEqual(activas);
      expect(mockService.findSolicitudesPendientes).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /botiquin/solicitudes/:id ─────────────────────────────────────────────

  describe('findOne (GET /solicitudes/:id)', () => {
    it('convierte el id a número y delega a findOne', async () => {
      const solicitud = { id: 7, estado: EstadoSolicitud.PENDIENTE };
      mockService.findOne.mockResolvedValue(solicitud);

      const result = await controller.findOne('7');

      expect(result).toEqual(solicitud);
      expect(mockService.findOne).toHaveBeenCalledWith(7);
    });
  });

  // ── POST /botiquin/solicitudes ────────────────────────────────────────────────

  describe('crear (POST /solicitudes)', () => {
    it('delega a crearSolicitud con el DTO recibido', async () => {
      const dto = {
        internacionId: 3,
        items: [{ medicamentoPrescriptoId: 1, cantidadSolicitada: 5 }],
      };
      const solicitud = { id: 10, estado: EstadoSolicitud.PENDIENTE };
      mockService.crearSolicitud.mockResolvedValue(solicitud);

      const result = await controller.crear(dto as any);

      expect(result).toEqual(solicitud);
      expect(mockService.crearSolicitud).toHaveBeenCalledWith(dto);
    });
  });

  // ── PATCH /botiquin/solicitudes/:id/entrega ───────────────────────────────────

  describe('registrarEntrega (PATCH /solicitudes/:id/entrega)', () => {
    it('convierte el id a número y delega a registrarEntrega con los ítems', async () => {
      const items = [{ itemId: 1, cantidadEntregada: 3 }];
      const updated = { id: 4, estado: EstadoSolicitud.PARCIAL };
      mockService.registrarEntrega.mockResolvedValue(updated);

      const result = await controller.registrarEntrega('4', { items } as any);

      expect(result).toEqual(updated);
      expect(mockService.registrarEntrega).toHaveBeenCalledWith(4, items);
    });
  });

  // ── PATCH /botiquin/items/:id/devolucion ──────────────────────────────────────

  describe('devolucion (PATCH /items/:id/devolucion)', () => {
    it('convierte el id a número y delega a registrarDevolucion', async () => {
      mockService.registrarDevolucion.mockResolvedValue(undefined);

      await controller.devolucion('5', { cantidadDevuelta: 2 });

      expect(mockService.registrarDevolucion).toHaveBeenCalledWith(5, 2);
    });
  });
});
