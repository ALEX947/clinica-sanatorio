import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  EventoSuministro,
  EstadoEventoSuministro,
} from '../entities/evento-suministro.entity';
import {
  EventoControl,
  EstadoEventoControl,
} from '../entities/evento-control.entity';
import { RealizacionPractica } from '../entities/realizacion-practica.entity';
import { ProfesionalesService } from '../../maestros/services/profesionales.service';
import { PracticaPrescripta } from '../../prescripciones/entities/practica-prescripta.entity';

@Injectable()
export class EnfermeriaService {
  constructor(
    @InjectRepository(EventoSuministro)
    private suministroRepo: Repository<EventoSuministro>,
    @InjectRepository(EventoControl)
    private controlRepo: Repository<EventoControl>,
    @InjectRepository(RealizacionPractica)
    private realizacionRepo: Repository<RealizacionPractica>,
    private profesionalesService: ProfesionalesService,
  ) {}

  // Agenda de suministros: próximas N horas para una internación
  agendaSuministrosPorPeriodo(desde: Date, hasta: Date) {
    return this.suministroRepo.find({
      where: {
        fechaHoraPlanificada: Between(desde, hasta),
        estado: EstadoEventoSuministro.PENDIENTE,
      },
      relations: [
        'medicamentoPrescripto',
        'medicamentoPrescripto.prescripcion',
        'medicamentoPrescripto.prescripcion.internacion',
      ],
      order: { fechaHoraPlanificada: 'ASC' },
    });
  }

  // Historial de suministros: todos los estados, rango de fechas opcional
  historialSuministros(desde?: Date, hasta?: Date) {
    return this.suministroRepo.find({
      where:
        desde && hasta
          ? { fechaHoraPlanificada: Between(desde, hasta) }
          : undefined,
      relations: [
        'medicamentoPrescripto',
        'medicamentoPrescripto.prescripcion',
        'medicamentoPrescripto.prescripcion.internacion',
        'personalEnfermeria',
      ],
      order: { fechaHoraPlanificada: 'DESC' },
    });
  }

  cronogramaControlesPorPeriodo(desde: Date, hasta: Date) {
    return this.controlRepo.find({
      where: {
        fechaHoraPlanificada: Between(desde, hasta),
        estado: EstadoEventoControl.PENDIENTE,
      },
      relations: [
        'controlEspecialPrescripto',
        'controlEspecialPrescripto.prescripcion',
        'controlEspecialPrescripto.prescripcion.internacion',
      ],
      order: { fechaHoraPlanificada: 'ASC' },
    });
  }

  // Historial de controles: todos los estados, rango de fechas opcional
  historialControles(desde?: Date, hasta?: Date) {
    return this.controlRepo.find({
      where:
        desde && hasta
          ? { fechaHoraPlanificada: Between(desde, hasta) }
          : undefined,
      relations: [
        'controlEspecialPrescripto',
        'controlEspecialPrescripto.prescripcion',
        'controlEspecialPrescripto.prescripcion.internacion',
        'personalEnfermeria',
      ],
      order: { fechaHoraPlanificada: 'DESC' },
    });
  }

  async registrarSuministro(
    eventoId: number,
    dto: { personalEnfermeriaId: number; observaciones?: string },
  ) {
    const evento = await this.suministroRepo.findOne({
      where: { id: eventoId },
    });
    if (!evento)
      throw new NotFoundException(
        `Evento de suministro ${eventoId} no encontrado`,
      );
    const personal = await this.profesionalesService.findOne(
      dto.personalEnfermeriaId,
    );
    await this.suministroRepo.update(eventoId, {
      estado: EstadoEventoSuministro.SUMINISTRADO,
      fechaHoraRealizada: new Date(),
      personalEnfermeria: personal,
      observaciones: dto.observaciones,
    });
    return this.suministroRepo.findOne({
      where: { id: eventoId },
      relations: ['personalEnfermeria'],
    });
  }

  async registrarControl(
    eventoId: number,
    dto: {
      personalEnfermeriaId: number;
      resultado: string;
      observaciones?: string;
    },
  ) {
    const evento = await this.controlRepo.findOne({ where: { id: eventoId } });
    if (!evento)
      throw new NotFoundException(
        `Evento de control ${eventoId} no encontrado`,
      );
    const personal = await this.profesionalesService.findOne(
      dto.personalEnfermeriaId,
    );
    await this.controlRepo.update(eventoId, {
      estado: EstadoEventoControl.REALIZADO,
      fechaHoraRealizada: new Date(),
      resultado: dto.resultado,
      personalEnfermeria: personal,
      observaciones: dto.observaciones,
    });
    return this.controlRepo.findOne({
      where: { id: eventoId },
      relations: ['personalEnfermeria'],
    });
  }

  async registrarRealizacionPractica(dto: {
    practicaPrescriptaId: number;
    profesionalesIntervinientesIds: number[];
    observaciones?: string;
  }) {
    const profesionales = await Promise.all(
      dto.profesionalesIntervinientesIds.map((id) =>
        this.profesionalesService.findOne(id),
      ),
    );
    const realizacion = this.realizacionRepo.create({
      practicaPrescripta: {
        id: dto.practicaPrescriptaId,
      } as unknown as PracticaPrescripta,
      fechaHoraRealizacion: new Date(),
      profesionalesIntervinientes: profesionales,
      observaciones: dto.observaciones,
    });
    return this.realizacionRepo.save(realizacion);
  }
}
