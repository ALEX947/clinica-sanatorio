import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paciente } from '../entities/paciente.entity';

@Injectable()
export class PacientesService {
  constructor(@InjectRepository(Paciente) private repo: Repository<Paciente>) {}

  findAll() {
    return this.repo.find({ order: { apellido: 'ASC', nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return p;
  }

  findByDni(dni: string) {
    return this.repo.findOne({ where: { dni } });
  }

  create(dto: Partial<Paciente>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<Paciente>) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
