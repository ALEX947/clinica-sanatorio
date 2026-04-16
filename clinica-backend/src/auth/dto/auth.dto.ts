import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  MinLength,
} from 'class-validator';

const ROLES = [
  'admin',
  'medico',
  'enfermeria',
  'mesa_entradas',
  'facturacion',
  'botiquin',
] as const;

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CrearUsuarioDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsIn(ROLES)
  rol: string;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsIn(ROLES)
  rol?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
