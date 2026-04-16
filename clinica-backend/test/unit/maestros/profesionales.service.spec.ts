import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfesionalesService } from '../../../src/maestros/services/profesionales.service';
import { Profesional } from '../../../src/maestros/entities/profesional.entity';
import { TipoProfesion } from '../../../src/maestros/entities/tipo-profesion.entity';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
};

const mockTipoRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('ProfesionalesService', () => {
  let service: ProfesionalesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfesionalesService,
        { provide: getRepositoryToken(Profesional), useValue: mockRepo },
        { provide: getRepositoryToken(TipoProfesion), useValue: mockTipoRepo },
      ],
    }).compile();

    service = module.get<ProfesionalesService>(ProfesionalesService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna la lista de profesionales', async () => {
      const lista = [{ id: 1, apellido: 'Gómez', nombre: 'Roberto' }];
      mockRepo.find.mockResolvedValue(lista);

      expect(await service.findAll()).toEqual(lista);
      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { apellido: 'ASC' },
      });
    });
  });

  // ── findTiposProfesion ────────────────────────────────────────────────────────

  describe('findTiposProfesion (GET)', () => {
    it('retorna la lista de tipos de profesión', async () => {
      const tipos = [{ id: 1, nombre: 'Médico Clínico' }];
      mockTipoRepo.find.mockResolvedValue(tipos);

      expect(await service.findTiposProfesion()).toEqual(tipos);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna el profesional cuando existe', async () => {
      const prof = { id: 2, apellido: 'Díaz', matricula: 'MP-001' };
      mockRepo.findOne.mockResolvedValue(prof);

      expect(await service.findOne(2)).toEqual(prof);
    });

    it('lanza NotFoundException si el profesional no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create (POST)', () => {
    it('crea el profesional cuando el tipo de profesión existe', async () => {
      const tipo = { id: 1, nombre: 'Médico Clínico' };
      const dto = {
        apellido: 'Torres',
        nombre: 'Luis',
        matricula: 'MP-100',
        tipoProfesionId: 1,
      };
      const prof = { id: 5, ...dto, tipoProfesion: tipo };

      mockTipoRepo.findOne.mockResolvedValue(tipo);
      mockRepo.create.mockReturnValue(prof);
      mockRepo.save.mockResolvedValue(prof);

      const result = await service.create(dto);

      expect(mockTipoRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.apellido).toBe('Torres');
    });

    it('lanza NotFoundException si el tipo de profesión no existe', async () => {
      mockTipoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          apellido: 'X',
          nombre: 'X',
          matricula: 'MP-X',
          tipoProfesionId: 99,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────────

  describe('update (PATCH)', () => {
    it('actualiza telefono y email del profesional', async () => {
      const existente = {
        id: 2,
        apellido: 'Díaz',
        telefono: '000',
        activo: true,
      };
      const actualizado = { ...existente, telefono: '387-555' };

      mockRepo.findOne
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce(actualizado);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(2, { telefono: '387-555' });

      expect(mockRepo.update).toHaveBeenCalledWith(2, { telefono: '387-555' });
      expect(result.telefono).toBe('387-555');
    });

    it('lanza NotFoundException si el profesional no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, { telefono: '000' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── createTipoProfesion ───────────────────────────────────────────────────────

  describe('createTipoProfesion (POST)', () => {
    it('crea un tipo de profesión y lo retorna', async () => {
      const dto = {
        nombre: 'Kinesiólogo',
        descripcion: 'Especialista en kinesiología',
      };
      mockTipoRepo.create.mockReturnValue(dto);
      mockTipoRepo.save.mockResolvedValue({ id: 3, ...dto });

      const result = await service.createTipoProfesion(dto);

      expect(result.nombre).toBe('Kinesiólogo');
      expect(result.id).toBe(3);
    });
  });

  // ── updateTipoProfesion ───────────────────────────────────────────────────────

  describe('updateTipoProfesion (PATCH)', () => {
    it('actualiza el tipo de profesión existente', async () => {
      const tipo = { id: 1, nombre: 'Medico', descripcion: 'Viejo' };
      const actualizado = { ...tipo, descripcion: 'Médico especialista' };

      mockTipoRepo.findOne
        .mockResolvedValueOnce(tipo)
        .mockResolvedValueOnce(actualizado);
      mockTipoRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateTipoProfesion(1, {
        descripcion: 'Médico especialista',
      });

      expect(mockTipoRepo.update).toHaveBeenCalledWith(1, {
        descripcion: 'Médico especialista',
      });
      expect(result!.descripcion).toBe('Médico especialista');
    });

    it('lanza NotFoundException si el tipo no existe', async () => {
      mockTipoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateTipoProfesion(99, { nombre: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
