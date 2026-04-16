import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MedicamentoPrescripto } from '../../prescripciones/entities/medicamento-prescripto.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';

export enum EstadoEventoSuministro {
  PENDIENTE = 'pendiente',
  SUMINISTRADO = 'suministrado',
  OMITIDO = 'omitido',
  CANCELADO = 'cancelado',
}

@Entity('eventos_suministro')
export class EventoSuministro {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MedicamentoPrescripto, (m) => m.eventosSuministro, {
    onDelete: 'CASCADE',
  })
  medicamentoPrescripto: MedicamentoPrescripto;

  @Column({ type: 'timestamp' })
  fechaHoraPlanificada: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaHoraRealizada: Date;

  @Column({
    type: 'enum',
    enum: EstadoEventoSuministro,
    default: EstadoEventoSuministro.PENDIENTE,
  })
  estado: EstadoEventoSuministro;

  // Personal de enfermería que realizó el suministro
  @ManyToOne(() => Profesional, { nullable: true, eager: true })
  personalEnfermeria: Profesional;

  @Column({ type: 'text', nullable: true })
  observaciones: string;
}
