import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PracticaPrescripta } from '../../prescripciones/entities/practica-prescripta.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';

@Entity('realizaciones_practica')
export class RealizacionPractica {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PracticaPrescripta, (p) => p.realizaciones, {
    onDelete: 'CASCADE',
  })
  practicaPrescripta: PracticaPrescripta;

  @Column({ type: 'timestamp' })
  fechaHoraRealizacion: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  // Múltiples profesionales pueden intervenir en una práctica
  @JoinTable()
  @ManyToMany(() => Profesional, { eager: true })
  profesionalesIntervinientes: Profesional[];
}
