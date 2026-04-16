import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { MedicamentoPrescripto } from '../../prescripciones/entities/medicamento-prescripto.entity';
import {
  SolicitudAbastecimiento,
  EstadoSolicitud,
} from '../entities/solicitud-abastecimiento.entity';
import { ItemSolicitud } from '../entities/item-solicitud.entity';
import { InternacionesService } from '../../internaciones/services/internaciones.service';

@Injectable()
export class BotiquinService {
  constructor(
    @InjectRepository(SolicitudAbastecimiento)
    private solicitudRepo: Repository<SolicitudAbastecimiento>,
    @InjectRepository(ItemSolicitud)
    private itemRepo: Repository<ItemSolicitud>,
    private internacionesService: InternacionesService,
  ) {}

  findSolicitudesPendientes() {
    return this.solicitudRepo.find({
      where: {
        estado: In([EstadoSolicitud.PENDIENTE, EstadoSolicitud.PARCIAL]),
      },
      relations: [
        'internacion',
        'internacion.paciente',
        'items',
        'items.medicamentoPrescripto',
      ],
      order: { creadoEn: 'ASC' },
    });
  }

  findSolicitudes(estado?: EstadoSolicitud, desde?: Date, hasta?: Date) {
    const where: Record<string, any> = {};
    if (estado) where.estado = estado;
    if (desde && hasta) where.creadoEn = Between(desde, hasta);
    return this.solicitudRepo.find({
      where: Object.keys(where).length ? where : undefined,
      relations: [
        'internacion',
        'internacion.paciente',
        'items',
        'items.medicamentoPrescripto',
      ],
      order: { creadoEn: 'DESC' },
    });
  }

  async findOne(id: number) {
    const s = await this.solicitudRepo.findOne({
      where: { id },
      relations: ['internacion', 'items', 'items.medicamentoPrescripto'],
    });
    if (!s) throw new NotFoundException(`Solicitud ${id} no encontrada`);
    return s;
  }

  async crearSolicitud(dto: {
    internacionId: number;
    items: Array<{
      medicamentoPrescriptoId: number;
      cantidadSolicitada: number;
    }>;
  }) {
    const internacion = await this.internacionesService.findOne(
      dto.internacionId,
    );
    const solicitud = await this.solicitudRepo.save(
      this.solicitudRepo.create({ internacion }),
    );
    for (const item of dto.items) {
      await this.itemRepo.save(
        this.itemRepo.create({
          solicitud,
          medicamentoPrescripto: {
            id: item.medicamentoPrescriptoId,
          } as unknown as MedicamentoPrescripto,
          cantidadSolicitada: item.cantidadSolicitada,
        }),
      );
    }
    return this.findOne(solicitud.id);
  }

  async registrarEntrega(
    solicitudId: number,
    items: Array<{ itemId: number; cantidadEntregada: number }>,
  ) {
    for (const item of items) {
      await this.itemRepo.update(item.itemId, {
        cantidadEntregada: item.cantidadEntregada,
      });
    }
    const solicitud = await this.findOne(solicitudId);
    const todosEntregados = solicitud.items.every(
      (i) => i.cantidadEntregada >= i.cantidadSolicitada,
    );
    await this.solicitudRepo.update(solicitudId, {
      estado: todosEntregados
        ? EstadoSolicitud.ENTREGADA
        : EstadoSolicitud.PARCIAL,
    });
    return this.findOne(solicitudId);
  }

  async registrarDevolucion(itemId: number, cantidadDevuelta: number) {
    await this.itemRepo.increment(
      { id: itemId },
      'cantidadDevuelta',
      cantidadDevuelta,
    );
  }
}
