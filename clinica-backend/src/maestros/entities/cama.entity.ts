import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sector } from './sector.entity';
import { Internacion } from '../../internaciones/entities/internacion.entity';

export enum EstadoCama {
  DISPONIBLE = 'disponible',
  OCUPADA = 'ocupada',
  MANTENIMIENTO = 'mantenimiento',
}

@Entity('camas')
export class Cama {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  numero: string;

  @Column({ default: false })
  individual: boolean; // habitación individual (con cargo extra)

  @Column({ type: 'enum', enum: EstadoCama, default: EstadoCama.DISPONIBLE })
  estado: EstadoCama;

  @ManyToOne(() => Sector, (s) => s.camas, { eager: true })
  sector: Sector;

  @OneToMany(() => Internacion, (i) => i.cama)
  internaciones: Internacion[];
}
