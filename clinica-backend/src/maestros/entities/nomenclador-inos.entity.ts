import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ArancelObraSocial } from './arancel-obra-social.entity';

@Entity('nomenclador_inos')
export class NomencladorInos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  codigo: string;

  @Column({ length: 255 })
  descripcion: string;

  @Column({ length: 100, nullable: true })
  especialidad: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ArancelObraSocial, (a) => a.practica)
  aranceles: ArancelObraSocial[];
}
