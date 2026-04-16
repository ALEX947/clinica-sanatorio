import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Prescripcion,
  TipoPrescripcion,
  EstadoPrescripcion,
} from '../entities/prescripcion.entity';
import { DiagnosticoPrescripcion } from '../entities/diagnostico-prescripcion.entity';
import { PracticaPrescripta } from '../entities/practica-prescripta.entity';
import {
  MedicamentoPrescripto,
  PresentacionMedicamento,
} from '../entities/medicamento-prescripto.entity';
import { ControlEspecialPrescripto } from '../entities/control-especial-prescripto.entity';
import {
  EventoSuministro,
  EstadoEventoSuministro,
} from '../../enfermeria/entities/evento-suministro.entity';
import {
  EventoControl,
  EstadoEventoControl,
} from '../../enfermeria/entities/evento-control.entity';
import { InternacionesService } from '../../internaciones/services/internaciones.service';
import { ProfesionalesService } from '../../maestros/services/profesionales.service';
import { NomencladorService } from '../../maestros/services/nomenclador.service';

@Injectable()
export class PrescripcionesService {
  constructor(
    @InjectRepository(Prescripcion) private repo: Repository<Prescripcion>,
    @InjectRepository(DiagnosticoPrescripcion)
    private diagRepo: Repository<DiagnosticoPrescripcion>,
    @InjectRepository(PracticaPrescripta)
    private practicaRepo: Repository<PracticaPrescripta>,
    @InjectRepository(MedicamentoPrescripto)
    private medRepo: Repository<MedicamentoPrescripto>,
    @InjectRepository(ControlEspecialPrescripto)
    private controlRepo: Repository<ControlEspecialPrescripto>,
    private internacionesService: InternacionesService,
    private profesionalesService: ProfesionalesService,
    private nomencladorService: NomencladorService,
    private dataSource: DataSource,
  ) {}

  findByInternacion(internacionId: number) {
    return this.repo.find({
      where: { internacion: { id: internacionId } },
      relations: ['diagnosticos', 'profesionalPrescriptor'],
      order: { fechaHoraPrescripcion: 'DESC' },
    });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({
      where: { id },
      relations: [
        'diagnosticos',
        'profesionalPrescriptor',
        'profesionalSuspensor',
        'internacion',
      ],
    });
    if (!p) throw new NotFoundException(`Prescripción ${id} no encontrada`);
    return p;
  }

  async prescribirPractica(dto: {
    internacionId: number;
    profesionalPrescriptorId: number;
    practicaId: number;
    indicaciones?: string;
    diagnosticos: Array<{ descripcion: string; prioridad: number }>;
  }) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const [internacion, profesional, practica] = await Promise.all([
        this.internacionesService.findOne(dto.internacionId),
        this.profesionalesService.findOne(dto.profesionalPrescriptorId),
        this.nomencladorService.findOne(dto.practicaId),
      ]);

      const prescripcion = await manager.save(Prescripcion, {
        tipo: TipoPrescripcion.PRACTICA,
        fechaHoraPrescripcion: new Date(),
        internacion,
        profesionalPrescriptor: profesional,
      });

      for (const d of dto.diagnosticos) {
        await manager.save(DiagnosticoPrescripcion, { ...d, prescripcion });
      }

      await manager.save(PracticaPrescripta, {
        prescripcion,
        practica,
        indicaciones: dto.indicaciones,
      });

      return prescripcion;
    });
    return this.findOne(saved.id);
  }

  async prescribirMedicamento(dto: {
    internacionId: number;
    profesionalPrescriptorId: number;
    diagnosticos: Array<{ descripcion: string; prioridad: number }>;
    droga: string;
    concentracion: string;
    presentacion: PresentacionMedicamento;
    inicioTratamiento: Date;
    finTratamiento: Date;
    periodicidadHoras: number;
    cantidad: number;
  }) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const [internacion, profesional] = await Promise.all([
        this.internacionesService.findOne(dto.internacionId),
        this.profesionalesService.findOne(dto.profesionalPrescriptorId),
      ]);

      const prescripcion = await manager.save(Prescripcion, {
        tipo: TipoPrescripcion.MEDICAMENTO,
        fechaHoraPrescripcion: new Date(),
        internacion,
        profesionalPrescriptor: profesional,
      });

      for (const d of dto.diagnosticos) {
        await manager.save(DiagnosticoPrescripcion, { ...d, prescripcion });
      }

      const med = (await manager.save(MedicamentoPrescripto, {
        prescripcion,
        droga: dto.droga,
        concentracion: dto.concentracion,
        presentacion: dto.presentacion,
        inicioTratamiento: dto.inicioTratamiento,
        finTratamiento: dto.finTratamiento,
        periodicidadHoras: dto.periodicidadHoras,
        cantidad: dto.cantidad,
      })) as MedicamentoPrescripto;

      // Generar agenda de suministros automáticamente
      await this.generarAgendaSuministros(manager, med);

      return prescripcion;
    });
    return this.findOne(saved.id);
  }

  private async generarAgendaSuministros(
    manager: EntityManager,
    med: MedicamentoPrescripto,
  ) {
    const inicio = new Date(med.inicioTratamiento);
    const fin = new Date(med.finTratamiento);
    const eventos: Partial<EventoSuministro>[] = [];
    let fecha = new Date(inicio);
    while (fecha <= fin) {
      eventos.push({
        medicamentoPrescripto: med,
        fechaHoraPlanificada: new Date(fecha),
        estado: EstadoEventoSuministro.PENDIENTE,
      });
      fecha = new Date(
        fecha.getTime() + med.periodicidadHoras * 60 * 60 * 1000,
      );
    }
    await manager.save(EventoSuministro, eventos);
  }

  async prescribirControlEspecial(dto: {
    internacionId: number;
    profesionalPrescriptorId: number;
    diagnosticos: Array<{ descripcion: string; prioridad: number }>;
    tipoControl: string;
    inicioControl: Date;
    finControl: Date;
    periodicidadHoras: number;
  }) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const [internacion, profesional] = await Promise.all([
        this.internacionesService.findOne(dto.internacionId),
        this.profesionalesService.findOne(dto.profesionalPrescriptorId),
      ]);

      const prescripcion = await manager.save(Prescripcion, {
        tipo: TipoPrescripcion.CONTROL_ESPECIAL,
        fechaHoraPrescripcion: new Date(),
        internacion,
        profesionalPrescriptor: profesional,
      });

      for (const d of dto.diagnosticos) {
        await manager.save(DiagnosticoPrescripcion, { ...d, prescripcion });
      }

      const ctrl = await manager.save(ControlEspecialPrescripto, {
        prescripcion,
        tipoControl: dto.tipoControl,
        inicioControl: dto.inicioControl,
        finControl: dto.finControl,
        periodicidadHoras: dto.periodicidadHoras,
      });

      // Generar cronograma de controles
      await this.generarCronogramaControles(manager, ctrl);

      return prescripcion;
    });
    return this.findOne(saved.id);
  }

  private async generarCronogramaControles(
    manager: EntityManager,
    ctrl: ControlEspecialPrescripto,
  ) {
    const inicio = new Date(ctrl.inicioControl);
    const fin = new Date(ctrl.finControl);
    const eventos: Partial<EventoControl>[] = [];
    let fecha = new Date(inicio);
    while (fecha <= fin) {
      eventos.push({
        controlEspecialPrescripto: ctrl,
        fechaHoraPlanificada: new Date(fecha),
        estado: EstadoEventoControl.PENDIENTE,
      });
      fecha = new Date(
        fecha.getTime() + ctrl.periodicidadHoras * 60 * 60 * 1000,
      );
    }
    await manager.save(EventoControl, eventos);
  }

  async autorizarPrescripcion(
    id: number,
    nroAutorizacion: string,
    coseguroCobrado?: number,
    nroComprobanteCoseguro?: string,
  ) {
    await this.findOne(id);
    await this.repo.update(id, {
      estado: EstadoPrescripcion.AUTORIZADA,
      nroAutorizacion,
      fechaHoraAutorizacion: new Date(),
      coseguroCobrado,
      nroComprobanteCoseguro,
    });
    return this.findOne(id);
  }

  async suspenderMedicamento(
    id: number,
    dto: {
      profesionalSuspensorId: number;
      motivoSuspension: string;
    },
  ) {
    return this.dataSource.transaction(async (manager) => {
      await this.findOne(id);
      const profesional = await this.profesionalesService.findOne(
        dto.profesionalSuspensorId,
      );

      await manager.update(Prescripcion, id, {
        estado: EstadoPrescripcion.SUSPENDIDA,
        profesionalSuspensor: profesional,
        fechaHoraSuspension: new Date(),
        motivoSuspension: dto.motivoSuspension,
      });

      // Cancelar eventos de suministro pendientes
      const med = await manager.findOne(MedicamentoPrescripto, {
        where: { prescripcion: { id } },
      });
      if (med) {
        await manager.update(
          EventoSuministro,
          {
            medicamentoPrescripto: { id: med.id },
            estado: EstadoEventoSuministro.PENDIENTE,
          },
          { estado: EstadoEventoSuministro.CANCELADO },
        );
      }
    });
  }
}
