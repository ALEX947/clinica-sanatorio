import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PacientesService } from '../../../src/maestros/services/pacientes.service';
import { Paciente } from '../../../src/maestros/entities/paciente.entity';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('PacientesService', () => {
  let service: PacientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PacientesService,
        { provide: getRepositoryToken(Paciente), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PacientesService>(PacientesService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna lista de pacientes ordenada', async () => {
      const lista = [{ id: 1, apellido: 'García', nombre: 'Ana' }];
      mockRepo.find.mockResolvedValue(lista);

      const result = await service.findAll();

      expect(result).toEqual(lista);
      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { apellido: 'ASC', nombre: 'ASC' },
      });
    });

    it('retorna lista vacía si no hay pacientes', async () => {
      mockRepo.find.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna el paciente cuando existe', async () => {
      const pac = { id: 5, apellido: 'López', nombre: 'Juan', dni: '12345678' };
      mockRepo.findOne.mockResolvedValue(pac);

      const result = await service.findOne(5);

      expect(result).toEqual(pac);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('lanza NotFoundException cuando el paciente no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create (POST)', () => {
    it('crea y retorna el nuevo paciente', async () => {
      const dto = {
        apellido: 'Pérez',
        nombre: 'María',
        dni: '30000001',
        sexo: 'F',
      };
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue({ id: 10, ...dto });

      const result = await service.create(dto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 10, apellido: 'Pérez' });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update (PATCH)', () => {
    it('actualiza y retorna el paciente modificado', async () => {
      const existente = {
        id: 3,
        apellido: 'Ruiz',
        nombre: 'Carlos',
        telefono: '387-111',
      };
      const actualizado = { ...existente, telefono: '387-999' };

      mockRepo.findOne
        .mockResolvedValueOnce(existente) // findOne dentro de findOne() para verificar existencia
        .mockResolvedValueOnce(actualizado); // findOne para retornar el resultado
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(3, { telefono: '387-999' });

      expect(mockRepo.update).toHaveBeenCalledWith(3, { telefono: '387-999' });
      expect(result.telefono).toBe('387-999');
    });

    it('lanza NotFoundException si el paciente a actualizar no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, { telefono: '000' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
