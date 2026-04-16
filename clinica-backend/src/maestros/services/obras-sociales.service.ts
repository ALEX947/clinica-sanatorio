import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObraSocial } from '../entities/obra-social.entity';

@Injectable()
export class ObrasSocialesService {
  constructor(
    @InjectRepository(ObraSocial) private repo: Repository<ObraSocial>,
  ) {}

  findAll() {
    return this.repo.find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const os = await this.repo.findOne({ where: { id } });
    if (!os) throw new NotFoundException(`Obra Social ${id} no encontrada`);
    return os;
  }

  create(dto: Partial<ObraSocial>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<ObraSocial>) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
