import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  IsDateString,
  IsInt,
} from 'class-validator';

export class CrearNomencladorDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsString()
  especialidad?: string;
}

export class ActualizarNomencladorDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  especialidad?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ActualizarArancelDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valorArancel?: number;

  @IsOptional()
  @IsNumber()
  porcentajeCopago?: number;

  @IsOptional()
  @IsDateString()
  vigenciaDesde?: string;

  @IsOptional()
  @IsDateString()
  vigenciaHasta?: string;
}

export class CrearArancelDto {
  @IsInt()
  @IsPositive()
  practicaId: number;

  @IsInt()
  @IsPositive()
  obraSocialId: number;

  @IsNumber()
  @IsPositive()
  valorArancel: number;

  @IsOptional()
  @IsNumber()
  porcentajeCopago?: number;

  @IsDateString()
  vigenciaDesde: string;

  @IsOptional()
  @IsDateString()
  vigenciaHasta?: string;
}
