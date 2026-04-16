import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { EnfermeriaController } from '../../../src/enfermeria/controllers/enfermeria.controller';
import { EnfermeriaService } from '../../../src/enfermeria/services/enfermeria.service';
import { RolesGuard } from '../../../src/auth/roles.guard';

const mockService = {
  agendaSuministrosPorPeriodo: jest.fn(),
  historialSuministros: jest.fn(),
  cronogramaControlesPorPeriodo: jest.fn(),
  historialControles: jest.fn(),
  registrarSuministro: jest.fn(),
  registrarControl: jest.fn(),
  registrarRealizacionPractica: jest.fn(),
};

describe('EnfermeriaController', () => {
  let controller: EnfermeriaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnfermeriaController],
      providers: [{ provide: EnfermeriaService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EnfermeriaController>(EnfermeriaController);
    jest.clearAllMocks();
  });

  // ── GET /enfermeria/agenda-suministros ────────────────────────────────────────

  describe('agendaSuministros', () => {
    it('convierte las fechas y delega a agendaSuministrosPorPeriodo', async () => {
      const eventos = [{ id: 1 }];
      mockService.agendaSuministrosPorPeriodo.mockResolvedValue(eventos);

      const desde = '2025-01-01T00:00:00.000Z';
      const hasta = '2025-01-01T23:59:59.000Z';
      const result = await controller.agendaSuministros(desde, hasta);

      expect(result).toEqual(eventos);
      expect(mockService.agendaSuministrosPorPeriodo).toHaveBeenCalledWith(
        new Date(desde),
        new Date(hasta),
      );
    });
  });

  // ── GET /enfermeria/historial-suministros ─────────────────────────────────────

  describe('historialSuministros', () => {
    it('sin parámetros delega con undefined en ambas fechas', async () => {
      mockService.historialSuministros.mockResolvedValue([]);

      await controller.historialSuministros(undefined, undefined);

      expect(mockService.historialSuministros).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('con parámetros convierte las strings a Date', async () => {
      const todos = [{ id: 1 }, { id: 2 }];
      mockService.historialSuministros.mockResolvedValue(todos);

      const desde = '2025-01-01T00:00:00.000Z';
      const hasta = '2025-01-31T23:59:59.000Z';
      const result = await controller.historialSuministros(desde, hasta);

      expect(result).toEqual(todos);
      expect(mockService.historialSuministros).toHaveBeenCalledWith(
        new Date(desde),
        new Date(hasta),
      );
    });
  });

  // ── GET /enfermeria/cronograma-controles ──────────────────────────────────────

  describe('cronogramaControles', () => {
    it('convierte las fechas y delega a cronogramaControlesPorPeriodo', async () => {
      const controles = [{ id: 2 }];
      mockService.cronogramaControlesPorPeriodo.mockResolvedValue(controles);

      const desde = '2025-01-01T00:00:00.000Z';
      const hasta = '2025-01-01T23:59:59.000Z';
      const result = await controller.cronogramaControles(desde, hasta);

      expect(result).toEqual(controles);
      expect(mockService.cronogramaControlesPorPeriodo).toHaveBeenCalledWith(
        new Date(desde),
        new Date(hasta),
      );
    });
  });

  // ── GET /enfermeria/historial-controles ───────────────────────────────────────

  describe('historialControles', () => {
    it('sin parámetros delega con undefined en ambas fechas', async () => {
      mockService.historialControles.mockResolvedValue([]);

      await controller.historialControles(undefined, undefined);

      expect(mockService.historialControles).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('con parámetros convierte las strings a Date', async () => {
      const todos = [{ id: 3 }];
      mockService.historialControles.mockResolvedValue(todos);

      const desde = '2025-03-01T00:00:00.000Z';
      const hasta = '2025-03-31T23:59:59.000Z';
      const result = await controller.historialControles(desde, hasta);

      expect(result).toEqual(todos);
      expect(mockService.historialControles).toHaveBeenCalledWith(
        new Date(desde),
        new Date(hasta),
      );
    });
  });

  // ── PATCH /enfermeria/suministros/:id/registrar ───────────────────────────────

  describe('registrarSuministro', () => {
    it('convierte el id a número y delega al servicio', async () => {
      const suministrado = { id: 5, estado: 'suministrado' };
      mockService.registrarSuministro.mockResolvedValue(suministrado);

      const dto = { personalEnfermeriaId: 2, observaciones: 'ok' };
      const result = await controller.registrarSuministro('5', dto as any);

      expect(result).toEqual(suministrado);
      expect(mockService.registrarSuministro).toHaveBeenCalledWith(5, dto);
    });
  });

  // ── PATCH /enfermeria/controles/:id/registrar ─────────────────────────────────

  describe('registrarControl', () => {
    it('convierte el id a número y delega al servicio', async () => {
      const realizado = { id: 3, estado: 'realizado' };
      mockService.registrarControl.mockResolvedValue(realizado);

      const dto = { personalEnfermeriaId: 2, resultado: '37.2°C' };
      const result = await controller.registrarControl('3', dto as any);

      expect(result).toEqual(realizado);
      expect(mockService.registrarControl).toHaveBeenCalledWith(3, dto);
    });
  });

  // ── POST /enfermeria/practicas/realizacion ────────────────────────────────────

  describe('registrarRealizacion', () => {
    it('delega al servicio con el body completo', async () => {
      const realizacion = { id: 1 };
      mockService.registrarRealizacionPractica.mockResolvedValue(realizacion);

      const dto = {
        practicaPrescriptaId: 10,
        profesionalesIntervinientesIds: [1, 2],
      };
      const result = await controller.registrarRealizacion(dto);

      expect(result).toEqual(realizacion);
      expect(mockService.registrarRealizacionPractica).toHaveBeenCalledWith(
        dto,
      );
    });
  });
});
