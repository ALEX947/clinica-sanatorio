import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Internacion,
  EstadoInternacion,
  MotivoAlta,
  TipoInternacion,
} from '../entities/internacion.entity';
import { DiagnosticoInternacion } from '../entities/diagnostico-internacion.entity';
import {
  Garantia,
  TipoGarantia,
  EstadoGarantia,
} from '../entities/garantia.entity';
import { PacientesService } from '../../maestros/services/pacientes.service';
import { ProfesionalesService } from '../../maestros/services/profesionales.service';
import { ObrasSocialesService } from '../../maestros/services/obras-sociales.service';
import { CamasService } from '../../maestros/services/camas.service';

export interface IniciarInternacionDto {
  tipo: TipoInternacion;
  pacienteId: number;
  profesionalIntervinienteId: number;
  profesionalPrescriptorId?: number;
  obraSocialId: number;
  camaId: number;
  nroAfiliado?: string;
  diagnosticos: Array<{ descripcion: string; prioridad: number }>;
  garantia?: { tipo: TipoGarantia; monto: number; nroComprobante?: string };
  observaciones?: string;
}

@Injectable()
export class InternacionesService {
  constructor(
    @InjectRepository(Internacion) private repo: Repository<Internacion>,
    @InjectRepository(DiagnosticoInternacion)
    private diagRepo: Repository<DiagnosticoInternacion>,
    @InjectRepository(Garantia) private garantiaRepo: Repository<Garantia>,
    private pacientesService: PacientesService,
    private profesionalesService: ProfesionalesService,
    private obrasSocialesService: ObrasSocialesService,
    private camasService: CamasService,
    private dataSource: DataSource,
  ) {}

  findAll(activas?: boolean) {
    const qb = this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.paciente', 'p')
      .leftJoinAndSelect('i.cama', 'c')
      .leftJoinAndSelect('c.sector', 's')
      .leftJoinAndSelect('i.obraSocial', 'os')
      .leftJoinAndSelect('i.profesionalInterviniente', 'prof')
      .leftJoinAndSelect('prof.tipoProfesion', 'tp')
      .orderBy('i.fechaHoraIngreso', 'DESC');
    if (activas !== undefined) {
      qb.where('i.estado = :estado', {
        estado: activas ? EstadoInternacion.ACTIVA : EstadoInternacion.ALTA,
      });
    }
    return qb.getMany();
  }

  async findOne(id: number) {
    const i = await this.repo.findOne({
      where: { id },
      relations: [
        'paciente',
        'cama',
        'cama.sector',
        'obraSocial',
        'profesionalInterviniente',
        'profesionalPrescriptor',
        'diagnosticos',
        'garantias',
      ],
    });
    if (!i) throw new NotFoundException(`Internación ${id} no encontrada`);
    return i;
  }

  async iniciar(dto: IniciarInternacionDto) {
    const savedId = await this.dataSource.transaction(async (manager) => {
      const [paciente, profesionalInterviniente, obraSocial, cama] =
        await Promise.all([
          this.pacientesService.findOne(dto.pacienteId),
          this.profesionalesService.findOne(dto.profesionalIntervinienteId),
          this.obrasSocialesService.findOne(dto.obraSocialId),
          this.camasService.findOne(dto.camaId),
        ]);

      const profesionalPrescriptor = dto.profesionalPrescriptorId
        ? await this.profesionalesService.findOne(dto.profesionalPrescriptorId)
        : undefined;

      const internacion = manager.create(Internacion, {
        tipo: dto.tipo,
        fechaHoraIngreso: new Date(),
        paciente,
        profesionalInterviniente,
        profesionalPrescriptor,
        obraSocial,
        cama,
        nroAfiliado: dto.nroAfiliado,
        observaciones: dto.observaciones,
      });
      const saved = await manager.save(internacion);

      for (const d of dto.diagnosticos) {
        await manager.save(DiagnosticoInternacion, {
          ...d,
          internacion: saved,
        });
      }

      if (dto.garantia) {
        await manager.save(Garantia, { ...dto.garantia, internacion: saved });
      }

      await manager.update('camas', dto.camaId, { estado: 'ocupada' });

      return saved.id;
    });
    // findOne se llama DESPUÉS del commit para poder ver el registro
    return this.findOne(savedId);
  }

  async darAlta(id: number, motivo: MotivoAlta, observaciones?: string) {
    const internacion = await this.findOne(id);
    if (internacion.estado !== EstadoInternacion.ACTIVA) {
      throw new BadRequestException('La internación ya tiene alta');
    }
    await this.repo.update(id, {
      estado: EstadoInternacion.ALTA,
      fechaHoraAlta: new Date(),
      motivoAlta: motivo,
      observaciones,
    });
    // Liberar cama
    await this.camasService.liberar(internacion.cama.id);
    return this.findOne(id);
  }

  async reintegrarGarantia(garantiaId: number) {
    await this.garantiaRepo.update(garantiaId, {
      estado: EstadoGarantia.REINTEGRADO,
      fechaReintegro: new Date(),
    });
  }
}
