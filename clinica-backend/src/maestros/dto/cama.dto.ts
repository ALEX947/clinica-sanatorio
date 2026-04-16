import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SectorRefDto {
  @IsInt()
  id: number;
}

export class CrearCamaDto {
  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsOptional()
  @IsBoolean()
  individual?: boolean;

  @ValidateNested()
  @Type(() => SectorRefDto)
  sector: SectorRefDto;
}

export class ActualizarEstadoCamaDto {
  @IsString()
  @IsIn(['disponible', 'ocupada', 'mantenimiento'])
  estado: string;
}

export class CrearSectorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class ActualizarSectorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
