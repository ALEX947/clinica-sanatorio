import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NomencladorService } from '../../../src/maestros/services/nomenclador.service';
import { NomencladorInos } from '../../../src/maestros/entities/nomenclador-inos.entity';
import { ArancelObraSocial } from '../../../src/maestros/entities/arancel-obra-social.entity';

const mockQb = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
};

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQb),
};

const mockArancelRepo = {
  createQueryBuilder: jest.fn(() => mockQb),
  create: jest.fn(),
  save: jest.fn(),
};

describe('NomencladorService', () => {
  let service: NomencladorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NomencladorService,
        { provide: getRepositoryToken(NomencladorInos), useValue: mockRepo },
        {
          provide: getRepositoryToken(ArancelObraSocial),
          useValue: mockArancelRepo,
        },
      ],
    }).compile();

    service = module.get<NomencladorService>(NomencladorService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockArancelRepo.createQueryBuilder.mockReturnValue(mockQb);
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll (GET)', () => {
    it('retorna todas las prácticas activas', async () => {
      const lista = [
        { id: 1, codigo: '010101', descripcion: 'Consulta', activo: true },
      ];
      mockQb.getMany.mockResolvedValue(lista);

      const result = await service.findAll();

      expect(mockQb.where).toHaveBeenCalledWith('n.activo = true');
      expect(result).toEqual(lista);
    });

    it('aplica filtro de búsqueda por descripción o código', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll('consulta');

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'n.descripcion ILIKE :s OR n.codigo ILIKE :s',
        { s: '%consulta%' },
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────────

  describe('findOne (GET)', () => {
    it('retorna la práctica cuando existe', async () => {
      const practica = { id: 1, codigo: '010101', descripcion: 'Consulta' };
      mockRepo.findOne.mockResolvedValue(practica);

      expect(await service.findOne(1)).toEqual(practica);
    });

    it('lanza NotFoundException si la práctica no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create (POST)', () => {
    it('crea y retorna la nueva práctica en el nomenclador', async () => {
      const dto = {
        codigo: '020202',
        descripcion: 'Electrocardiograma',
        especialidad: 'Cardiología',
      };
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue({ id: 7, ...dto, activo: true });

      const result = await service.create(dto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(result.codigo).toBe('020202');
      expect(result.id).toBe(7);
    });
  });
});
