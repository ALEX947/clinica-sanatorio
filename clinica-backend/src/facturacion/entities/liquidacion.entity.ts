import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { ItemLiquidacion } from './item-liquidacion.entity';

@Entity('liquidaciones')
export class Liquidacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (f) => f.liquidaciones, { eager: true })
  factura: Factura;

  @Column({ type: 'date' })
  fechaLiquidacion: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoLiquidado: number;

  @Column({ length: 100, nullable: true })
  nroReferencia: string;

  @OneToMany(() => ItemLiquidacion, (i) => i.liquidacion, { cascade: true })
  items: ItemLiquidacion[];

  @CreateDateColumn()
  creadoEn: Date;
}
