import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum RolUsuario {
  ADMIN = 'admin',
  MEDICO = 'medico',
  ENFERMERIA = 'enfermeria',
  MESA_ENTRADAS = 'mesa_entradas',
  FACTURACION = 'facturacion',
  BOTIQUIN = 'botiquin',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 150 })
  nombreCompleto: string;

  @Column({ type: 'enum', enum: RolUsuario })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;
}
