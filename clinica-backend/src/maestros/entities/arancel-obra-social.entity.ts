import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NomencladorInos } from './nomenclador-inos.entity';
import { ObraSocial } from './obra-social.entity';

@Entity('aranceles_obra_social')
export class ArancelObraSocial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => NomencladorInos, (n) => n.aranceles, { eager: true })
  practica: NomencladorInos;

  @ManyToOne(() => ObraSocial, { eager: true })
  obraSocial: ObraSocial;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorArancel: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeCopago: number;

  @Column({ type: 'date' })
  vigenciaDesde: Date;

  @Column({ type: 'date', nullable: true })
  vigenciaHasta: Date;
}
