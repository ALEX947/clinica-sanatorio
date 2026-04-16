import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SolicitudAbastecimiento } from './solicitud-abastecimiento.entity';
import { MedicamentoPrescripto } from '../../prescripciones/entities/medicamento-prescripto.entity';

@Entity('items_solicitud')
export class ItemSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SolicitudAbastecimiento, (s) => s.items, {
    onDelete: 'CASCADE',
  })
  solicitud: SolicitudAbastecimiento;

  @ManyToOne(() => MedicamentoPrescripto, { eager: true })
  medicamentoPrescripto: MedicamentoPrescripto;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  cantidadSolicitada: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  cantidadEntregada: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  cantidadDevuelta: number;
}
