import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EnfermeriaService } from '../../../src/enfermeria/services/enfermeria.service';
import {
  EventoSuministro,
  EstadoEventoSuministro,
} from '../../../src/enfermeria/entities/evento-suministro.entity';
import {
  EventoControl,
  EstadoEventoControl,
} from '../../../src/enfermeria/entities/evento-control.entity';
import { RealizacionPractica } from '../../../src/enfermeria/entities/realizacion-practica.entity';
import { ProfesionalesService } from '../../../src/maestros/services/profesionales.service';

const mockSuministroRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockControlRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockRealizacionRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockProfesionalesService = {
  findOne: jest.fn(),
};

describe('EnfermeriaService', () => {
  let service: EnfermeriaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnfermeriaService,
        {
          provide: getRepositoryToken(EventoSuministro),
          useValue: mockSuministroRepo,
        },
        {
          provide: getRepositoryToken(EventoControl),
          useValue: mockControlRepo,
        },
        {
          provide: getRepositoryToken(RealizacionPractica),
          useValue: mockRealizacionRepo,
        },
        { provide: ProfesionalesService, useValue: mockProfesionalesService },
      ],
    }).compile();

    service = module.get<EnfermeriaService>(EnfermeriaService);
    jest.clearAllMocks();
  });

  // ── agendaSuministrosPorPeriodo ───────────────────────────────────────────────

  describe('agendaSuministrosPorPeriodo', () => {
    it('retorna suministros pendientes en el período indicado', async () => {
      const desde = new Date('2025-01-01T00:00:00');
      const hasta = new Date('2025-01-01T23:59:59');
      const eventos = [{ id: 1, estado: EstadoEventoSuministro.PENDIENTE }];
      mockSuministroRepo.find.mockResolvedValue(eventos);

      const result = await service.agendaSuministrosPorPeriodo(desde, hasta);

      expect(result).toEqual(eventos);
      expect(mockSuministroRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: EstadoEventoSuministro.PENDIENTE,
          }),
        }),
      );
    });
  });

  // ── historialSuministros ──────────────────────────────────────────────────────

  describe('historialSuministros', () => {
    it('sin fechas llama a find sin cláusula where', async () => {
      const todos = [
        { id: 1, estado: EstadoEventoSuministro.SUMINISTRADO },
        { id: 2, estado: EstadoEventoSuministro.PENDIENTE },
        { id: 3, estado: EstadoEventoSuministro.OMITIDO },
      ];
      mockSuministroRepo.find.mockResolvedValue(todos);

      const result = await service.historialSuministros();

      expect(result).toEqual(todos);
      const options = mockSuministroRepo.find.mock.calls[0][0];
      expect(options.where).toBeUndefined();
    });

    it('con fechas aplica Between en fechaHoraPlanificada', async () => {
      const desde = new Date('2025-01-01');
      const hasta = new Date('2025-01-31');
      mockSuministroRepo.find.mockResolvedValue([]);

      await service.historialSuministros(desde, hasta);

      const options = mockSuministroRepo.find.mock.calls[0][0];
      expect(options.where.fechaHoraPlanificada).toBeDefined();
      expect(options.where.fechaHoraPlanificada.value).toEqual([desde, hasta]);
    });

    it('ordena por fechaHoraPlanificada DESC', async () => {
      mockSuministroRepo.find.mockResolvedValue([]);

      await service.historialSuministros();

      const options = mockSuministroRepo.find.mock.calls[0][0];
      expect(options.order).toEqual({ fechaHoraPlanificada: 'DESC' });
    });

    it('incluye la relación personalEnfermeria', async () => {
      mockSuministroRepo.find.mockResolvedValue([]);

      await service.historialSuministros();

      const options = mockSuministroRepo.find.mock.calls[0][0];
      expect(options.relations).toContain('personalEnfermeria');
    });
  });

  // ── cronogramaControlesPorPeriodo ─────────────────────────────────────────────

  describe('cronogramaControlesPorPeriodo', () => {
    it('retorna controles pendientes en el período indicado', async () => {
      const desde = new Date('2025-01-01T00:00:00');
      const hasta = new Date('2025-01-01T23:59:59');
      const controles = [{ id: 1, estado: EstadoEventoControl.PENDIENTE }];
      mockControlRepo.find.mockResolvedValue(controles);

      const result = await service.cronogramaControlesPorPeriodo(desde, hasta);

      expect(result).toEqual(controles);
    });
  });

  // ── historialControles ────────────────────────────────────────────────────────

  describe('historialControles', () => {
    it('sin fechas llama a find sin cláusula where', async () => {
      const todos = [
        { id: 1, estado: EstadoEventoControl.REALIZADO },
        { id: 2, estado: EstadoEventoControl.PENDIENTE },
      ];
      mockControlRepo.find.mockResolvedValue(todos);

      const result = await service.historialControles();

      expect(result).toEqual(todos);
      const options = mockControlRepo.find.mock.calls[0][0];
      expect(options.where).toBeUndefined();
    });

    it('con fechas aplica Between en fechaHoraPlanificada', async () => {
      const desde = new Date('2025-03-01');
      const hasta = new Date('2025-03-31');
      mockControlRepo.find.mockResolvedValue([]);

      await service.historialControles(desde, hasta);

      const options = mockControlRepo.find.mock.calls[0][0];
      expect(options.where.fechaHoraPlanificada).toBeDefined();
      expect(options.where.fechaHoraPlanificada.value).toEqual([desde, hasta]);
    });

    it('ordena por fechaHoraPlanificada DESC', async () => {
      mockControlRepo.find.mockResolvedValue([]);

      await service.historialControles();

      const options = mockControlRepo.find.mock.calls[0][0];
      expect(options.order).toEqual({ fechaHoraPlanificada: 'DESC' });
    });

    it('incluye la relación personalEnfermeria', async () => {
      mockControlRepo.find.mockResolvedValue([]);

      await service.historialControles();

      const options = mockControlRepo.find.mock.calls[0][0];
      expect(options.relations).toContain('personalEnfermeria');
    });
  });

  // ── registrarSuministro ───────────────────────────────────────────────────────

  describe('registrarSuministro', () => {
    it('registra el suministro y actualiza el estado', async () => {
      const evento = { id: 5, estado: EstadoEventoSuministro.PENDIENTE };
      const personal = { id: 10, apellido: 'Enfermera', nombre: 'Ana' };
      const resultado = {
        id: 5,
        estado: EstadoEventoSuministro.SUMINISTRADO,
        personalEnfermeria: personal,
      };

      mockSuministroRepo.findOne
        .mockResolvedValueOnce(evento)
        .mockResolvedValueOnce(resultado);
      mockProfesionalesService.findOne.mockResolvedValue(personal);
      mockSuministroRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.registrarSuministro(5, {
        personalEnfermeriaId: 10,
      });

      expect(mockSuministroRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          estado: EstadoEventoSuministro.SUMINISTRADO,
          personalEnfermeria: personal,
        }),
      );
      expect(result!.estado).toBe(EstadoEventoSuministro.SUMINISTRADO);
    });

    it('lanza NotFoundException si el evento de suministro no existe', async () => {
      mockSuministroRepo.findOne.mockResolvedValue(null);
      await expect(
        service.registrarSuministro(99, { personalEnfermeriaId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── registrarControl ──────────────────────────────────────────────────────────

  describe('registrarControl', () => {
    it('registra el resultado del control y actualiza el estado', async () => {
      const evento = { id: 3, estado: EstadoEventoControl.PENDIENTE };
      const personal = { id: 11, apellido: 'Enfermero', nombre: 'Juan' };
      const resultado = { id: 3, estado: EstadoEventoControl.REALIZADO };

      mockControlRepo.findOne
        .mockResolvedValueOnce(evento)
        .mockResolvedValueOnce(resultado);
      mockProfesionalesService.findOne.mockResolvedValue(personal);
      mockControlRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.registrarControl(3, {
        personalEnfermeriaId: 11,
        resultado: '120/80 mmHg',
      });

      expect(mockControlRepo.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          estado: EstadoEventoControl.REALIZADO,
          resultado: '120/80 mmHg',
        }),
      );
      expect(result!.estado).toBe(EstadoEventoControl.REALIZADO);
    });

    it('lanza NotFoundException si el evento de control no existe', async () => {
      mockControlRepo.findOne.mockResolvedValue(null);
      await expect(
        service.registrarControl(99, {
          personalEnfermeriaId: 1,
          resultado: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
