import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Prescripcion } from './prescripcion.entity';

@Entity('diagnosticos_prescripcion')
export class DiagnosticoPrescripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  descripcion: string;

  @Column({ default: 1 })
  prioridad: number;

  @ManyToOne(() => Prescripcion, (p) => p.diagnosticos, { onDelete: 'CASCADE' })
  prescripcion: Prescripcion;
}
