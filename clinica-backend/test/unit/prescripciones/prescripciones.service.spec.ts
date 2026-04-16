import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrescripcionesService } from '../../../src/prescripciones/services/prescripciones.service';
import {
  Prescripcion,
  TipoPrescripcion,
  EstadoPrescripcion,
} from '../../../src/prescripciones/entities/prescripcion.entity';
import { DiagnosticoPrescripcion } from '../../../src/prescripciones/entities/diagnostico-prescripcion.entity';
import { PracticaPrescripta } from '../../../src/prescripciones/entities/practica-prescripta.entity';
import {
  MedicamentoPrescripto,
  PresentacionMedicamento,
} from '../../../src/prescripciones/entities/medicamento-prescripto.entity';
import { ControlEspecialPrescripto } from '../../../src/prescripciones/entities/control-especial-prescripto.entity';
import { InternacionesService } from '../../../src/internaciones/services/internaciones.service';
import { ProfesionalesService } from '../../../src/maestros/services/profesionales.service';
import { NomencladorService } from '../../../src/maestros/services/nomenclador.service';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockDiagRepo = { save: jest.fn() };
const mockPracticaRepo = { save: jest.fn() };
const mockMedRepo = { save: jest.fn(), findOne: jest.fn() };
const mockControlRepo = { save: jest.fn() };

const mockInternacionesService = { findOne: jest.fn() };
const mockProfesionalesService = { findOne: jest.fn() };
const mockNomencladorService = { findOne: jest.fn() };

const mockManager = {
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((callback: any) => callback(mockManager)),
};

describe('PrescripcionesService', () => {
  let service: PrescripcionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescripcionesService,
        { provide: getRepositoryToken(Prescripcion), useValue: mockRepo },
        {
          provide: getRepositoryToken(DiagnosticoPrescripcion),
          useValue: mockDiagRepo,
        },
        {
          provide: getRepositoryToken(PracticaPrescripta),
          useValue: mockPracticaRepo,
        },
        {
          provide: getRepositoryToken(MedicamentoPrescripto),
          useValue: mockMedRepo,
        },
        {
          provide: getRepositoryToken(ControlEspecialPrescripto),
          useValue: mockControlRepo,
        },
        { provide: InternacionesService, useValue: mockInternacionesService },
        { provide: ProfesionalesService, useValue: mockProfesionalesService },
        { provide: NomencladorService, useValue: mockNomencladorService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PrescripcionesService>(PrescripcionesService);
    jest.clearAllMocks();
  });

  // ── findByInternacion (GET) ───────────────────────────────────────────────────

  describe('findByInternacion (GET)', () => {
    it('retorna prescripciones de una internación ordenadas por fecha', async () => {
      const prescripciones = [
        { id: 1, tipo: TipoPrescripcion.MEDICAMENTO },
        { id: 2, tipo: TipoPrescripcion.PRACTICA },
      ];
      mockRepo.find.mockResolvedValue(prescripciones);

      const result = await service.findByInternacion(5);

      expect(result).toEqual(prescripciones);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { internacion: { id: 5 } },
        }),
      );
    });
  });

  // ── findOne (GET) ─────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la prescripción cuando existe', async () => {
      const presc = { id: 1, tipo: TipoPrescripcion.MEDICAMENTO };
      mockRepo.findOne.mockResolvedValue(presc);

      expect(await service.findOne(1)).toEqual(presc);
    });

    it('lanza NotFoundException si la prescripción no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── autorizarPrescripcion (PATCH) ─────────────────────────────────────────────

  describe('autorizarPrescripcion (PATCH)', () => {
    it('autoriza la prescripción con el nro. de autorización', async () => {
      const presc = {
        id: 1,
        tipo: TipoPrescripcion.PRACTICA,
        estado: EstadoPrescripcion.PRESCRIPTA,
      };
      const autorizada = {
        ...presc,
        estado: EstadoPrescripcion.AUTORIZADA,
        nroAutorizacion: 'OS-9999',
      };

      mockRepo.findOne
        .mockResolvedValueOnce(presc)
        .mockResolvedValueOnce(autorizada);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.autorizarPrescripcion(1, 'OS-9999');

      expect(mockRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: EstadoPrescripcion.AUTORIZADA,
          nroAutorizacion: 'OS-9999',
        }),
      );
      expect(result.estado).toBe(EstadoPrescripcion.AUTORIZADA);
    });

    it('lanza NotFoundException si la prescripción no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.autorizarPrescripcion(99, 'X')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── prescribirPractica (POST) ─────────────────────────────────────────────────

  describe('prescribirPractica (POST)', () => {
    it('crea una prescripción de práctica con sus diagnósticos', async () => {
      const internacion = { id: 5 };
      const profesional = { id: 2 };
      const practica = { id: 7, codigo: '010101' };
      const prescripcion = { id: 20, tipo: TipoPrescripcion.PRACTICA };

      mockInternacionesService.findOne.mockResolvedValue(internacion);
      mockProfesionalesService.findOne.mockResolvedValue(profesional);
      mockNomencladorService.findOne.mockResolvedValue(practica);
      mockManager.save
        .mockResolvedValueOnce(prescripcion) // Prescripcion
        .mockResolvedValueOnce({}) // DiagnosticoPrescripcion
        .mockResolvedValueOnce({}); // PracticaPrescripta
      mockRepo.findOne.mockResolvedValue(prescripcion);

      const result = await service.prescribirPractica({
        internacionId: 5,
        profesionalPrescriptorId: 2,
        practicaId: 7,
        diagnosticos: [{ descripcion: 'Sospecha neumonía', prioridad: 1 }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockInternacionesService.findOne).toHaveBeenCalledWith(5);
      expect(result).toEqual(prescripcion);
    });
  });
});
