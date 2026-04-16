import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InternacionesService } from '../../../src/internaciones/services/internaciones.service';
import {
  Internacion,
  EstadoInternacion,
  MotivoAlta,
  TipoInternacion,
} from '../../../src/internaciones/entities/internacion.entity';
import { DiagnosticoInternacion } from '../../../src/internaciones/entities/diagnostico-internacion.entity';
import { Garantia } from '../../../src/internaciones/entities/garantia.entity';
import { PacientesService } from '../../../src/maestros/services/pacientes.service';
import { ProfesionalesService } from '../../../src/maestros/services/profesionales.service';
import { ObrasSocialesService } from '../../../src/maestros/services/obras-sociales.service';
import { CamasService } from '../../../src/maestros/services/camas.service';
import { EstadoCama } from '../../../src/maestros/entities/cama.entity';

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQb),
};

const mockDiagRepo = { save: jest.fn() };
const mockGarantiaRepo = { save: jest.fn(), update: jest.fn() };

const mockPacientesService = { findOne: jest.fn() };
const mockProfesionalesService = { findOne: jest.fn() };
const mockObrasSocialesService = { findOne: jest.fn() };
const mockCamasService = {
  findOne: jest.fn(),
  ocupar: jest.fn(),
  liberar: jest.fn(),
};

// Manager que simula el EntityManager dentro de una transacción
const mockManager = {
  create: jest.fn((Entity: any, dto: any) => dto),
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((callback: any) => callback(mockManager)),
};

describe('InternacionesService', () => {
  let service: InternacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternacionesService,
        { provide: getRepositoryToken(Internacion), useValue: mockRepo },
        {
          provide: getRepositoryToken(DiagnosticoInternacion),
          useValue: mockDiagRepo,
        },
        { provide: getRepositoryToken(Garantia), useValue: mockGarantiaRepo },
        { provide: PacientesService, useValue: mockPacientesService },
        { provide: ProfesionalesService, useValue: mockProfesionalesService },
        { provide: ObrasSocialesService, useValue: mockObrasSocialesService },
        { provide: CamasService, useValue: mockCamasService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InternacionesService>(InternacionesService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna todas las internaciones', async () => {
      const lista = [{ id: 1, estado: EstadoInternacion.ACTIVA }];
      mockQb.getMany.mockResolvedValue(lista);

      const result = await service.findAll();

      expect(result).toEqual(lista);
    });

    it('filtra por estado activa cuando activas=true', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockQb.where).toHaveBeenCalledWith('i.estado = :estado', {
        estado: EstadoInternacion.ACTIVA,
      });
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la internación cuando existe', async () => {
      const internacion = {
        id: 1,
        estado: EstadoInternacion.ACTIVA,
        paciente: { nombre: 'Ana' },
      };
      mockRepo.findOne.mockResolvedValue(internacion);

      expect(await service.findOne(1)).toEqual(internacion);
    });

    it('lanza NotFoundException si la internación no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── iniciar (POST) ────────────────────────────────────────────────────────────

  describe('iniciar (POST)', () => {
    const dto = {
      tipo: TipoInternacion.URGENTE,
      pacienteId: 1,
      profesionalIntervinienteId: 2,
      obraSocialId: 3,
      camaId: 4,
      nroAfiliado: 'A-001',
      diagnosticos: [{ descripcion: 'Neumonía', prioridad: 1 }],
    };

    it('crea la internación con los datos correctos y retorna el resultado', async () => {
      const paciente = { id: 1, apellido: 'García' };
      const profesional = { id: 2, apellido: 'Díaz' };
      const obraSocial = { id: 3, nombre: 'OSDE' };
      const cama = { id: 4, numero: '101', estado: EstadoCama.DISPONIBLE };
      const savedInternacion = { id: 10, ...dto };
      const internacionCompleta = {
        id: 10,
        estado: EstadoInternacion.ACTIVA,
        paciente,
      };

      mockPacientesService.findOne.mockResolvedValue(paciente);
      mockProfesionalesService.findOne.mockResolvedValue(profesional);
      mockObrasSocialesService.findOne.mockResolvedValue(obraSocial);
      mockCamasService.findOne.mockResolvedValue(cama);
      mockManager.save.mockResolvedValue(savedInternacion);
      mockRepo.findOne.mockResolvedValue(internacionCompleta);

      const result = await service.iniciar(dto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith('camas', 4, {
        estado: 'ocupada',
      });
      expect(result).toEqual(internacionCompleta);
    });
  });

  // ── darAlta (PATCH) ───────────────────────────────────────────────────────────

  describe('darAlta (PATCH)', () => {
    it('da el alta a una internación activa y libera la cama', async () => {
      const internacion = {
        id: 1,
        estado: EstadoInternacion.ACTIVA,
        cama: { id: 4 },
        diagnosticos: [],
        garantias: [],
      };
      const conAlta = { ...internacion, estado: EstadoInternacion.ALTA };

      mockRepo.findOne
        .mockResolvedValueOnce(internacion)
        .mockResolvedValueOnce(conAlta);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.darAlta(1, MotivoAlta.CURACION);

      expect(mockRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: EstadoInternacion.ALTA,
          motivoAlta: MotivoAlta.CURACION,
        }),
      );
      expect(mockCamasService.liberar).toHaveBeenCalledWith(4);
      expect(result.estado).toBe(EstadoInternacion.ALTA);
    });

    it('lanza BadRequestException si la internación ya tiene alta', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        estado: EstadoInternacion.ALTA,
        cama: {},
        diagnosticos: [],
        garantias: [],
      });

      await expect(service.darAlta(1, MotivoAlta.VOLUNTARIA)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
