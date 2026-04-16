import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cama } from './cama.entity';

@Entity('sectores')
export class Sector {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string; // UTI Adultos, UCI Neonatal, Clínica, Quirúrgico, Ginecología, etc.

  @Column({ length: 255, nullable: true })
  descripcion: string;

  @OneToMany(() => Cama, (c) => c.sector)
  camas: Cama[];
}
