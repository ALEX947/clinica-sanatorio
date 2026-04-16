import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescripcion } from './prescripcion.entity';
import { EventoControl } from '../../enfermeria/entities/evento-control.entity';

@Entity('controles_especiales_prescriptos')
export class ControlEspecialPrescripto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prescripcion, { onDelete: 'CASCADE' })
  prescripcion: Prescripcion;

  // Tipo: temperatura, presión arterial, glucemia, pulso, etc.
  @Column({ length: 100 })
  tipoControl: string;

  @Column({ type: 'timestamp' })
  inicioControl: Date;

  @Column({ type: 'timestamp' })
  finControl: Date;

  // Periodicidad en horas
  @Column()
  periodicidadHoras: number;

  @OneToMany(() => EventoControl, (e) => e.controlEspecialPrescripto)
  eventosControl: EventoControl[];
}
