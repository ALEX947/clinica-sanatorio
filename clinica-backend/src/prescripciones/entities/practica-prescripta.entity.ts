import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescripcion } from './prescripcion.entity';
import { NomencladorInos } from '../../maestros/entities/nomenclador-inos.entity';
import { RealizacionPractica } from '../../enfermeria/entities/realizacion-practica.entity';

@Entity('practicas_prescriptas')
export class PracticaPrescripta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prescripcion, { onDelete: 'CASCADE' })
  prescripcion: Prescripcion;

  @ManyToOne(() => NomencladorInos, { eager: true })
  practica: NomencladorInos;

  @Column({ type: 'text', nullable: true })
  indicaciones: string;

  @OneToMany(() => RealizacionPractica, (r) => r.practicaPrescripta)
  realizaciones: RealizacionPractica[];
}
