import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { Factura } from '../../facturacion/entities/factura.entity';

@Entity('obras_sociales')
export class ObraSocial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150, unique: true })
  nombre: string;

  @Column({ length: 20, nullable: true })
  cuit: string;

  @Column({ length: 255, nullable: true })
  domicilio: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 150, nullable: true })
  email: string;

  // Modalidad de facturación: detalle de documentación requerida, fechas, etc.
  @Column({ type: 'text', nullable: true })
  modalidadFacturacion: string;

  // Día del mes para presentar facturas
  @Column({ nullable: true })
  diaFacturacion: number;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Internacion, (i) => i.obraSocial)
  internaciones: Internacion[];

  @OneToMany(() => Factura, (f) => f.obraSocial)
  facturas: Factura[];
}
