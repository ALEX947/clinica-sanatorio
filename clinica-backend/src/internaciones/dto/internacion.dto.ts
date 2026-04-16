import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiagnosticoDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsInt()
  prioridad: number;
}

export class GarantiaDto {
  @IsIn(['deposito', 'pagare'])
  tipo: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  nroComprobante?: string;
}

export class IniciarInternacionDto {
  @IsIn(['programada', 'urgente', 'emergente'])
  tipo: string;

  @IsInt()
  pacienteId: number;

  @IsInt()
  profesionalIntervinienteId: number;

  @IsOptional()
  @IsInt()
  profesionalPrescriptorId?: number;

  @IsInt()
  obraSocialId: number;

  @IsInt()
  camaId: number;

  @IsOptional()
  @IsString()
  nroAfiliado?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticoDto)
  diagnosticos: DiagnosticoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GarantiaDto)
  garantia?: GarantiaDto;
}

export class DarAltaDto {
  @IsIn([
    'curacion',
    'mejoria',
    'traslado',
    'fallecimiento',
    'voluntaria',
    'otro',
  ])
  motivo: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
