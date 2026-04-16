import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Profesional } from './profesional.entity';

@Entity('tipos_profesion')
export class TipoProfesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion: string;

  @OneToMany(() => Profesional, (p) => p.tipoProfesion)
  profesionales: Profesional[];
}
