import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { ItemSolicitud } from './item-solicitud.entity';

export enum EstadoSolicitud {
  PENDIENTE = 'pendiente',
  ENTREGADA = 'entregada',
  PARCIAL = 'parcial',
}

@Entity('solicitudes_abastecimiento')
export class SolicitudAbastecimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Internacion, { eager: true })
  internacion: Internacion;

  @Column({
    type: 'enum',
    enum: EstadoSolicitud,
    default: EstadoSolicitud.PENDIENTE,
  })
  estado: EstadoSolicitud;

  @OneToMany(() => ItemSolicitud, (i) => i.solicitud, { cascade: true })
  items: ItemSolicitud[];

  @CreateDateColumn()
  creadoEn: Date;
}
