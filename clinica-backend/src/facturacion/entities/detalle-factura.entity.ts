import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Factura } from './factura.entity';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { Prescripcion } from '../../prescripciones/entities/prescripcion.entity';
import { Profesional } from '../../maestros/entities/profesional.entity';
import { NomencladorInos } from '../../maestros/entities/nomenclador-inos.entity';

export enum EstadoDetalle {
  FACTURADO = 'facturado',
  LIQUIDADO = 'liquidado',
  DEBITADO = 'debitado',
}

@Entity('detalles_factura')
export class DetalleFactura {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (f) => f.detalles, { onDelete: 'CASCADE' })
  factura: Factura;

  @ManyToOne(() => Internacion, { eager: true })
  internacion: Internacion;

  @ManyToOne(() => Prescripcion, { nullable: true, eager: true })
  prescripcion: Prescripcion;

  @ManyToOne(() => NomencladorInos, { nullable: true, eager: true })
  practica: NomencladorInos;

  @ManyToOne(() => Profesional, { eager: true })
  prestador: Profesional;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorFacturado: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  copagoPrecobrado: number;

  @Column({
    type: 'enum',
    enum: EstadoDetalle,
    default: EstadoDetalle.FACTURADO,
  })
  estado: EstadoDetalle;

  @Column({ type: 'text', nullable: true })
  motivoDebito: string;
}
