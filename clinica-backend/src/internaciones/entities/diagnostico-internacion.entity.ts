import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Internacion } from './internacion.entity';

@Entity('diagnosticos_internacion')
export class DiagnosticoInternacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  descripcion: string;

  @Column({ default: 1 })
  prioridad: number; // 1 = principal

  @ManyToOne(() => Internacion, (i) => i.diagnosticos, { onDelete: 'CASCADE' })
  internacion: Internacion;
}
