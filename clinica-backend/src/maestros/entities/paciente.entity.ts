import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ unique: true, length: 20 })
  dni: string;

  @Column({ type: 'date' })
  fechaNacimiento: Date;

  @Column({ length: 10 })
  sexo: string; // M / F

  @Column({ length: 255, nullable: true })
  domicilio: string;

  @Column({ length: 100, nullable: true })
  localidad: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @OneToMany(() => Internacion, (i) => i.paciente)
  internaciones: Internacion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
