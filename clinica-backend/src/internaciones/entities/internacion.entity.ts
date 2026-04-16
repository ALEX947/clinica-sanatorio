import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Paciente } from '../../maestros/entities/paciente.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';
import { ObraSocial } from '../../maestros/entities/obra-social.entity';
import { Cama } from '../../maestros/entities/cama.entity';
import { DiagnosticoInternacion } from './diagnostico-internacion.entity';
import { Prescripcion } from '../../prescripciones/entities/prescripcion.entity';
import { Garantia } from './garantia.entity';

export enum TipoInternacion {
  PROGRAMADA = 'programada',
  URGENTE = 'urgente',
  EMERGENTE = 'emergente',
}

export enum EstadoInternacion {
  ACTIVA = 'activa',
  ALTA = 'alta',
}

export enum MotivoAlta {
  CURACION = 'curacion',
  MEJORIA = 'mejoria',
  TRASLADO = 'traslado',
  FALLECIMIENTO = 'fallecimiento',
  VOLUNTARIA = 'voluntaria',
  OTRO = 'otro',
}

@Entity('internaciones')
export class Internacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoInternacion })
  tipo: TipoInternacion;

  @Column({
    type: 'enum',
    enum: EstadoInternacion,
    default: EstadoInternacion.ACTIVA,
  })
  estado: EstadoInternacion;

  @Column({ type: 'timestamp' })
  fechaHoraIngreso: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaHoraAlta: Date;

  @Column({ type: 'enum', enum: MotivoAlta, nullable: true })
  motivoAlta: MotivoAlta;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  // Número de afiliado en la OS
  @Column({ length: 50, nullable: true })
  nroAfiliado: string;

  @ManyToOne(() => Paciente, (p) => p.internaciones, { eager: true })
  paciente: Paciente;

  // Médico tratante principal
  @ManyToOne(() => Profesional, { eager: true })
  profesionalInterviniente: Profesional;

  // Médico que prescribió la internación (puede ser distinto)
  @ManyToOne(() => Profesional, { nullable: true, eager: true })
  profesionalPrescriptor: Profesional;

  @ManyToOne(() => ObraSocial, (os) => os.internaciones, { eager: true })
  obraSocial: ObraSocial;

  @ManyToOne(() => Cama, (c) => c.internaciones, { eager: true })
  cama: Cama;

  @OneToMany(() => DiagnosticoInternacion, (d) => d.internacion, {
    cascade: true,
  })
  diagnosticos: DiagnosticoInternacion[];

  @OneToMany(() => Prescripcion, (p) => p.internacion)
  prescripciones: Prescripcion[];

  @OneToMany(() => Garantia, (g) => g.internacion, { cascade: true })
  garantias: Garantia[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
