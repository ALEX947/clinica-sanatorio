import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cama, EstadoCama } from '../entities/cama.entity';
import { Sector } from '../entities/sector.entity';

@Injectable()
export class CamasService {
  constructor(
    @InjectRepository(Cama) private repo: Repository<Cama>,
    @InjectRepository(Sector) private sectorRepo: Repository<Sector>,
  ) {}

  findAll() {
    return this.repo.find({
      relations: ['sector'],
      order: { sector: { nombre: 'ASC' }, numero: 'ASC' },
    });
  }

  findDisponibles(sectorId?: number) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.sector', 's')
      .where('c.estado = :estado', { estado: EstadoCama.DISPONIBLE });
    if (sectorId) qb.andWhere('s.id = :sectorId', { sectorId });
    return qb.getMany();
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id }, relations: ['sector'] });
    if (!c) throw new NotFoundException(`Cama ${id} no encontrada`);
    return c;
  }

  findSectores() {
    return this.sectorRepo.find({ order: { nombre: 'ASC' } });
  }

  async ocupar(id: number) {
    const cama = await this.findOne(id);
    if (cama.estado !== EstadoCama.DISPONIBLE)
      throw new BadRequestException('Cama no disponible');
    await this.repo.update(id, { estado: EstadoCama.OCUPADA });
  }

  async liberar(id: number) {
    await this.repo.update(id, { estado: EstadoCama.DISPONIBLE });
  }

  create(dto: Partial<Cama>) {
    return this.repo.save(this.repo.create(dto));
  }

  async updateEstado(id: number, estado: EstadoCama) {
    await this.findOne(id);
    await this.repo.update(id, { estado });
    return this.findOne(id);
  }

  createSector(dto: { nombre: string; descripcion?: string }) {
    return this.sectorRepo.save(this.sectorRepo.create(dto));
  }

  async updateSector(
    id: number,
    dto: { nombre?: string; descripcion?: string },
  ) {
    const sector = await this.sectorRepo.findOne({ where: { id } });
    if (!sector) throw new NotFoundException(`Sector ${id} no encontrado`);
    await this.sectorRepo.update(id, dto);
    return this.sectorRepo.findOne({ where: { id } });
  }
}
