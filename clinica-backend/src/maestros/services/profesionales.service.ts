import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profesional } from '../entities/profesional.entity';
import { TipoProfesion } from '../entities/tipo-profesion.entity';

@Injectable()
export class ProfesionalesService {
  constructor(
    @InjectRepository(Profesional) private repo: Repository<Profesional>,
    @InjectRepository(TipoProfesion)
    private tipoRepo: Repository<TipoProfesion>,
  ) {}

  findAll() {
    return this.repo.find({ order: { apellido: 'ASC' } });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Profesional ${id} no encontrado`);
    return p;
  }

  findTiposProfesion() {
    return this.tipoRepo.find({ order: { nombre: 'ASC' } });
  }

  async create(dto: {
    apellido: string;
    nombre: string;
    matricula: string;
    telefono?: string;
    email?: string;
    tipoProfesionId: number;
  }) {
    const tipo = await this.tipoRepo.findOne({
      where: { id: dto.tipoProfesionId },
    });
    if (!tipo) throw new NotFoundException('Tipo de profesión no encontrado');
    const prof = this.repo.create({ ...dto, tipoProfesion: tipo });
    return this.repo.save(prof);
  }

  async update(id: number, dto: Partial<Profesional>) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  createTipoProfesion(dto: { nombre: string; descripcion?: string }) {
    return this.tipoRepo.save(this.tipoRepo.create(dto));
  }

  async updateTipoProfesion(
    id: number,
    dto: { nombre?: string; descripcion?: string },
  ) {
    const tipo = await this.tipoRepo.findOne({ where: { id } });
    if (!tipo)
      throw new NotFoundException(`Tipo de profesión ${id} no encontrado`);
    await this.tipoRepo.update(id, dto);
    return this.tipoRepo.findOne({ where: { id } });
  }

  async acreditarHonorarios(profesionalId: number, monto: number) {
    await this.repo.increment({ id: profesionalId }, 'saldoCuenta', monto);
  }
}
