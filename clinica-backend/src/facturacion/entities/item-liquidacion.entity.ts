import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Liquidacion } from './liquidacion.entity';
import { DetalleFactura } from './detalle-factura.entity';

export enum TipoItemLiquidacion {
  RECONOCIDO = 'reconocido',
  DEBITADO = 'debitado',
}

@Entity('items_liquidacion')
export class ItemLiquidacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Liquidacion, (l) => l.items, { onDelete: 'CASCADE' })
  liquidacion: Liquidacion;

  @ManyToOne(() => DetalleFactura, { eager: true })
  detalleFactura: DetalleFactura;

  @Column({ type: 'enum', enum: TipoItemLiquidacion })
  tipo: TipoItemLiquidacion;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'text', nullable: true })
  motivoDebito: string;
}
