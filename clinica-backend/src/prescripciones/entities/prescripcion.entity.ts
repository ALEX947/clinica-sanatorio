import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';
import { DiagnosticoPrescripcion } from './diagnostico-prescripcion.entity';

export enum TipoPrescripcion {
  PRACTICA = 'practica',
  MEDICAMENTO = 'medicamento',
  CONTROL_ESPECIAL = 'control_especial',
  DIETA = 'dieta',
}

export enum EstadoPrescripcion {
  PRESCRIPTA = 'prescripta',
  AUTORIZADA = 'autorizada',
  REALIZADA = 'realizada',
  SUSPENDIDA = 'suspendida',
}

@Entity('prescripciones')
export class Prescripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoPrescripcion })
  tipo: TipoPrescripcion;

  @Column({
    type: 'enum',
    enum: EstadoPrescripcion,
    default: EstadoPrescripcion.PRESCRIPTA,
  })
  estado: EstadoPrescripcion;

  @Column({ type: 'timestamp' })
  fechaHoraPrescripcion: Date;

  // Autorización de la Obra Social
  @Column({ length: 50, nullable: true })
  nroAutorizacion: string;

  @Column({ type: 'timestamp', nullable: true })
  fechaHoraAutorizacion: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  coseguroCobrado: number;

  @Column({ length: 50, nullable: true })
  nroComprobanteCoseguro: string;

  @ManyToOne(() => Internacion, (i) => i.prescripciones)
  internacion: Internacion;

  @ManyToOne(() => Profesional, { eager: true })
  profesionalPrescriptor: Profesional;

  // Para suspensión de medicamentos
  @ManyToOne(() => Profesional, { nullable: true, eager: true })
  profesionalSuspensor: Profesional;

  @Column({ type: 'timestamp', nullable: true })
  fechaHoraSuspension: Date;

  @Column({ type: 'text', nullable: true })
  motivoSuspension: string;

  @OneToMany(() => DiagnosticoPrescripcion, (d) => d.prescripcion, {
    cascade: true,
  })
  diagnosticos: DiagnosticoPrescripcion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
