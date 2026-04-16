import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoProfesion } from './tipo-profesion.entity';

@Entity('profesionales')
export class Profesional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ unique: true, length: 20 })
  matricula: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => TipoProfesion, (t) => t.profesionales, { eager: true })
  tipoProfesion: TipoProfesion;

  // Cuenta de acreditación de honorarios
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldoCuenta: number;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
