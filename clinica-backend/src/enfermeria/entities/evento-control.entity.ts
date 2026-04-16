import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ControlEspecialPrescripto } from '../../prescripciones/entities/control-especial-prescripto.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';

export enum EstadoEventoControl {
  PENDIENTE = 'pendiente',
  REALIZADO = 'realizado',
  OMITIDO = 'omitido',
  CANCELADO = 'cancelado',
}

@Entity('eventos_control')
export class EventoControl {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ControlEspecialPrescripto, (c) => c.eventosControl, {
    onDelete: 'CASCADE',
  })
  controlEspecialPrescripto: ControlEspecialPrescripto;

  @Column({ type: 'timestamp' })
  fechaHoraPlanificada: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaHoraRealizada: Date;

  @Column({
    type: 'enum',
    enum: EstadoEventoControl,
    default: EstadoEventoControl.PENDIENTE,
  })
  estado: EstadoEventoControl;

  // Resultado del control: ej. "Temperatura: 39°C", "Presión: 13/9"
  @Column({ length: 255, nullable: true })
  resultado: string;

  @ManyToOne(() => Profesional, { nullable: true, eager: true })
  personalEnfermeria: Profesional;

  @Column({ type: 'text', nullable: true })
  observaciones: string;
}
