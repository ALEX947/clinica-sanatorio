import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObrasSocialesService } from '../../../src/maestros/services/obras-sociales.service';
import { ObraSocial } from '../../../src/maestros/entities/obra-social.entity';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('ObrasSocialesService', () => {
  let service: ObrasSocialesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObrasSocialesService,
        { provide: getRepositoryToken(ObraSocial), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ObrasSocialesService>(ObrasSocialesService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna sólo obras sociales activas ordenadas por nombre', async () => {
      const lista = [
        { id: 1, nombre: 'OSDE', activa: true },
        { id: 2, nombre: 'Particular', activa: true },
      ];
      mockRepo.find.mockResolvedValue(lista);

      const result = await service.findAll();

      expect(result).toEqual(lista);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { activa: true },
        order: { nombre: 'ASC' },
      });
    });

    it('retorna lista vacía si no hay obras sociales activas', async () => {
      mockRepo.find.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la obra social cuando existe', async () => {
      const os = { id: 1, nombre: 'OSDE', activa: true };
      mockRepo.findOne.mockResolvedValue(os);

      expect(await service.findOne(1)).toEqual(os);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lanza NotFoundException si la obra social no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create (POST)', () => {
    it('crea y retorna la nueva obra social', async () => {
      const dto = { nombre: 'Swiss Medical', cuit: '30-12345678-9' };
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue({ id: 5, ...dto, activa: true });

      const result = await service.create(dto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(result.nombre).toBe('Swiss Medical');
      expect(result.id).toBe(5);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update (PATCH)', () => {
    it('actualiza los datos de la obra social', async () => {
      const existente = {
        id: 1,
        nombre: 'OSDE',
        telefono: '0800-111',
        activa: true,
      };
      const actualizado = { ...existente, telefono: '0800-999' };

      mockRepo.findOne
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce(actualizado);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(1, { telefono: '0800-999' });

      expect(mockRepo.update).toHaveBeenCalledWith(1, { telefono: '0800-999' });
      expect(result.telefono).toBe('0800-999');
    });

    it('lanza NotFoundException si la obra social no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, { nombre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
