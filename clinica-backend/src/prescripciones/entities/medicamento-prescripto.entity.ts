import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescripcion } from './prescripcion.entity';
import { EventoSuministro } from '../../enfermeria/entities/evento-suministro.entity';

export enum PresentacionMedicamento {
  COMPRIMIDO = 'comprimido',
  GRAJEA = 'grajea',
  JARABE = 'jarabe',
  SUSPENSION = 'suspension',
  INYECTABLE = 'inyectable',
  CAPSULA = 'capsula',
  CREMA = 'crema',
  OTRO = 'otro',
}

@Entity('medicamentos_prescriptos')
export class MedicamentoPrescripto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prescripcion, { onDelete: 'CASCADE' })
  prescripcion: Prescripcion;

  // Nombre genérico de la droga
  @Column({ length: 200 })
  droga: string;

  // Concentración: ej. "500 mg", "250 mg/5ml"
  @Column({ length: 50 })
  concentracion: string;

  @Column({ type: 'enum', enum: PresentacionMedicamento })
  presentacion: PresentacionMedicamento;

  @Column({ type: 'timestamp' })
  inicioTratamiento: Date;

  @Column({ type: 'timestamp' })
  finTratamiento: Date;

  // Periodicidad en horas (ej. 8 = cada 8hs)
  @Column()
  periodicidadHoras: number;

  // Cantidad por suministro
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  cantidad: number;

  @OneToMany(() => EventoSuministro, (e) => e.medicamentoPrescripto)
  eventosSuministro: EventoSuministro[];
}
