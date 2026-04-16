import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NomencladorInos } from '../entities/nomenclador-inos.entity';
import { ArancelObraSocial } from '../entities/arancel-obra-social.entity';

@Injectable()
export class NomencladorService {
  constructor(
    @InjectRepository(NomencladorInos)
    private repo: Repository<NomencladorInos>,
    @InjectRepository(ArancelObraSocial)
    private arancelRepo: Repository<ArancelObraSocial>,
  ) {}

  findAll(search?: string) {
    const qb = this.repo.createQueryBuilder('n').where('n.activo = true');
    if (search)
      qb.andWhere('n.descripcion ILIKE :s OR n.codigo ILIKE :s', {
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

  async setArancel(dto: Partial<ArancelObraSocial>) {
    return this.arancelRepo.save(this.arancelRepo.create(dto));
  }
}
