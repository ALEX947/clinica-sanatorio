import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Internacion } from './internacion.entity';

export enum TipoGarantia {
  DEPOSITO = 'deposito',
  PAGARE = 'pagare',
}

export enum EstadoGarantia {
  VIGENTE = 'vigente',
  REINTEGRADO = 'reintegrado',
}

@Entity('garantias')
export class Garantia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoGarantia })
  tipo: TipoGarantia;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ length: 50, nullable: true })
  nroComprobante: string;

  @Column({
    type: 'enum',
    enum: EstadoGarantia,
    default: EstadoGarantia.VIGENTE,
  })
  estado: EstadoGarantia;

  @Column({ type: 'timestamp', nullable: true })
  fechaReintegro: Date;

  @ManyToOne(() => Internacion, (i) => i.garantias, { onDelete: 'CASCADE' })
  internacion: Internacion;

  @CreateDateColumn()
  creadoEn: Date;
}
