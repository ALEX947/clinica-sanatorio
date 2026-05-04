import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NomencladorInos } from '../entities/nomenclador-inos.entity';
import { ArancelObraSocial } from '../entities/arancel-obra-social.entity';
import { ActualizarArancelDto, ActualizarNomencladorDto } from '../dto/nomenclador.dto';

@Injectable()
export class NomencladorService {
  constructor(
    @InjectRepository(NomencladorInos)
    private repo: Repository<NomencladorInos>,
    @InjectRepository(ArancelObraSocial)
    private arancelRepo: Repository<ArancelObraSocial>,
  ) {}

  findAll(search?: string, incluirInactivos = false) {
    const qb = this.repo.createQueryBuilder('n');
    if (!incluirInactivos) qb.andWhere('n.activo = true');
    if (search)
      qb.andWhere('(n.descripcion ILIKE :s OR n.codigo ILIKE :s)', {
        s: `%${search}%`,
      });
    return qb.orderBy('n.codigo').getMany();
  }

  async findOne(id: number) {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new NotFoundException(`Práctica INOS ${id} no encontrada`);
    return n;
  }

  create(dto: Partial<NomencladorInos>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: ActualizarNomencladorDto) {
    const n = await this.findOne(id);
    return this.repo.save({ ...n, ...dto });
  }

  async listAranceles(practicaId: number) {
    return this.arancelRepo.find({
      where: { practica: { id: practicaId } },
      order: { vigenciaDesde: 'DESC' },
    });
  }

  async findArancel(id: number) {
    const a = await this.arancelRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Arancel ${id} no encontrado`);
    return a;
  }

  async getArancelParaOS(
    practicaId: number,
    obraSocialId: number,
  ): Promise<ArancelObraSocial | null> {
    return this.arancelRepo
      .createQueryBuilder('a')
      .where('a.practica.id = :pid AND a.obraSocial.id = :osid', {
        pid: practicaId,
        osid: obraSocialId,
      })
      .andWhere('a.vigenciaDesde <= CURRENT_DATE')
      .andWhere('(a.vigenciaHasta IS NULL OR a.vigenciaHasta >= CURRENT_DATE)')
      .orderBy('a.vigenciaDesde', 'DESC')
      .getOne();
  }

  async setArancel(dto: any) {
    return this.arancelRepo.save(
      this.arancelRepo.create({
        practica: { id: dto.practicaId },
        obraSocial: { id: dto.obraSocialId },
        valorArancel: dto.valorArancel,
        porcentajeCopago: dto.porcentajeCopago ?? 0,
        vigenciaDesde: dto.vigenciaDesde,
        vigenciaHasta: dto.vigenciaHasta,
      }),
    );
  }

  async updateArancel(id: number, dto: ActualizarArancelDto) {
    const a = await this.findArancel(id);
    return this.arancelRepo.save({ ...a, ...dto });
  }

  async deleteArancel(id: number) {
    await this.findArancel(id);
    return this.arancelRepo.delete(id);
  }
}
