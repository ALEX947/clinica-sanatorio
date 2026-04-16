import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObraSocial } from '../../maestros/entities/obra-social.entity';
import { DetalleFactura } from './detalle-factura.entity';
import { Liquidacion } from './liquidacion.entity';

export enum EstadoFactura {
  BORRADOR = 'borrador',
  EMITIDA = 'emitida',
  LIQUIDADA = 'liquidada',
  PARCIALMENTE_LIQUIDADA = 'parcialmente_liquidada',
}

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  nroFactura: string;

  @ManyToOne(() => ObraSocial, (os) => os.facturas, { eager: true })
  obraSocial: ObraSocial;

  @Column({ type: 'date' })
  periodoDesde: Date;

  @Column({ type: 'date' })
  periodoHasta: Date;

  @Column({ type: 'date' })
  fechaEmision: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoCopagosDescontados: number;

  @Column({
    type: 'enum',
    enum: EstadoFactura,
    default: EstadoFactura.BORRADOR,
  })
  estado: EstadoFactura;

  @OneToMany(() => DetalleFactura, (d) => d.factura, { cascade: true })
  detalles: DetalleFactura[];

  @OneToMany(() => Liquidacion, (l) => l.factura)
  liquidaciones: Liquidacion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
