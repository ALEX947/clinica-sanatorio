import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CamasService } from '../../../src/maestros/services/camas.service';
import { Cama, EstadoCama } from '../../../src/maestros/entities/cama.entity';
import { Sector } from '../../../src/maestros/entities/sector.entity';

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQb),
};

const mockSectorRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('CamasService', () => {
  let service: CamasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CamasService,
        { provide: getRepositoryToken(Cama), useValue: mockRepo },
        { provide: getRepositoryToken(Sector), useValue: mockSectorRepo },
      ],
    }).compile();

    service = module.get<CamasService>(CamasService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna todas las camas con su sector', async () => {
      const camas = [
        {
          id: 1,
          numero: '101',
          estado: EstadoCama.DISPONIBLE,
          sector: { nombre: 'UTI' },
        },
      ];
      mockRepo.find.mockResolvedValue(camas);

      expect(await service.findAll()).toEqual(camas);
    });
  });

  // ── findDisponibles ───────────────────────────────────────────────────────────

  describe('findDisponibles (GET)', () => {
    it('retorna camas disponibles', async () => {
      const disponibles = [
        { id: 2, numero: '102', estado: EstadoCama.DISPONIBLE },
      ];
      mockQb.getMany.mockResolvedValue(disponibles);

      const result = await service.findDisponibles();

      expect(mockQb.where).toHaveBeenCalledWith('c.estado = :estado', {
        estado: EstadoCama.DISPONIBLE,
      });
      expect(result).toEqual(disponibles);
    });

    it('filtra por sector si se pasa sectorId', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findDisponibles(3);

      expect(mockQb.andWhere).toHaveBeenCalledWith('s.id = :sectorId', {
        sectorId: 3,
      });
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la cama cuando existe', async () => {
      const cama = { id: 1, numero: '101', estado: EstadoCama.DISPONIBLE };
      mockRepo.findOne.mockResolvedValue(cama);

      expect(await service.findOne(1)).toEqual(cama);
    });

    it('lanza NotFoundException si la cama no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findSectores ──────────────────────────────────────────────────────────────

  describe('findSectores (GET)', () => {
    it('retorna la lista de sectores', async () => {
      const sectores = [{ id: 1, nombre: 'UTI Adultos' }];
      mockSectorRepo.find.mockResolvedValue(sectores);

      expect(await service.findSectores()).toEqual(sectores);
    });
  });

  // ── ocupar ────────────────────────────────────────────────────────────────────

  describe('ocupar', () => {
    it('ocupa una cama disponible', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        numero: '101',
        estado: EstadoCama.DISPONIBLE,
      });
      mockRepo.update.mockResolvedValue({ affected: 1 });

      await service.ocupar(1);

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        estado: EstadoCama.OCUPADA,
      });
    });

    it('lanza BadRequestException si la cama no está disponible', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        numero: '101',
        estado: EstadoCama.OCUPADA,
      });

      await expect(service.ocupar(1)).rejects.toThrow(BadRequestException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create (POST)', () => {
    it('crea y retorna la nueva cama', async () => {
      const dto = { numero: '201', individual: true, sector: { id: 2 } };
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue({
        id: 10,
        ...dto,
        estado: EstadoCama.DISPONIBLE,
      });

      const result = await service.create(dto as any);

      expect(result.id).toBe(10);
      expect(result.estado).toBe(EstadoCama.DISPONIBLE);
    });
  });

  // ── updateEstado ──────────────────────────────────────────────────────────────

  describe('updateEstado (PATCH)', () => {
    it('actualiza el estado de la cama', async () => {
      const cama = { id: 1, numero: '101', estado: EstadoCama.DISPONIBLE };
      const actualizada = { ...cama, estado: EstadoCama.MANTENIMIENTO };

      mockRepo.findOne
        .mockResolvedValueOnce(cama)
        .mockResolvedValueOnce(actualizada);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateEstado(1, EstadoCama.MANTENIMIENTO);

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        estado: EstadoCama.MANTENIMIENTO,
      });
      expect(result.estado).toBe(EstadoCama.MANTENIMIENTO);
    });

    it('lanza NotFoundException si la cama no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateEstado(99, EstadoCama.DISPONIBLE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createSector ──────────────────────────────────────────────────────────────

  describe('createSector (POST)', () => {
    it('crea un sector y lo retorna', async () => {
      const dto = {
        nombre: 'Pediatría',
        descripcion: 'Internación pediátrica',
      };
      mockSectorRepo.create.mockReturnValue(dto);
      mockSectorRepo.save.mockResolvedValue({ id: 4, ...dto });

      const result = await service.createSector(dto);

      expect(result.nombre).toBe('Pediatría');
      expect(result.id).toBe(4);
    });
  });

  // ── updateSector ──────────────────────────────────────────────────────────────

  describe('updateSector (PATCH)', () => {
    it('actualiza el sector existente', async () => {
      const sector = { id: 1, nombre: 'Viejo', descripcion: '' };
      const actualizado = { ...sector, nombre: 'UTI Adultos' };

      mockSectorRepo.findOne
        .mockResolvedValueOnce(sector)
        .mockResolvedValueOnce(actualizado);
      mockSectorRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateSector(1, { nombre: 'UTI Adultos' });

      expect(mockSectorRepo.update).toHaveBeenCalledWith(1, {
        nombre: 'UTI Adultos',
      });
      expect(result!.nombre).toBe('UTI Adultos');
    });

    it('lanza NotFoundException si el sector no existe', async () => {
      mockSectorRepo.findOne.mockResolvedValue(null);
      await expect(service.updateSector(99, { nombre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
