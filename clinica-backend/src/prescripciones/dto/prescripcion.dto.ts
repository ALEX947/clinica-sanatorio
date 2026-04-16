import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsIn,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiagnosticoPrescripcionDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsInt()
  prioridad: number;
}

export class PrescribirPracticaDto {
  @IsInt()
  internacionId: number;

  @IsInt()
  profesionalPrescriptorId: number;

  @IsInt()
  practicaId: number;

  @IsOptional()
  @IsString()
  indicaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticoPrescripcionDto)
  diagnosticos: DiagnosticoPrescripcionDto[];
}

export class PrescribirMedicamentoDto {
  @IsInt()
  internacionId: number;

  @IsInt()
  profesionalPrescriptorId: number;

  @IsString()
  @IsNotEmpty()
  droga: string;

  @IsString()
  @IsNotEmpty()
  concentracion: string;

  @IsIn([
    'comprimido',
    'grajea',
    'jarabe',
    'suspension',
    'inyectable',
    'capsula',
    'crema',
    'otro',
  ])
  presentacion: string;

  @IsDateString()
  inicioTratamiento: string;

  @IsDateString()
  finTratamiento: string;

  @IsInt()
  periodicidadHoras: number;

  @IsNumber()
  cantidad: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticoPrescripcionDto)
  diagnosticos: DiagnosticoPrescripcionDto[];
}

export class PrescribirControlDto {
  @IsInt()
  internacionId: number;

  @IsInt()
  profesionalPrescriptorId: number;

  @IsString()
  @IsNotEmpty()
  tipoControl: string;

  @IsDateString()
  inicioControl: string;

  @IsDateString()
  finControl: string;

  @IsInt()
  periodicidadHoras: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticoPrescripcionDto)
  diagnosticos: DiagnosticoPrescripcionDto[];
}

export class AutorizarPrescripcionDto {
  @IsString()
  @IsNotEmpty()
  nroAutorizacion: string;

  @IsOptional()
  @IsNumber()
  coseguroCobrado?: number;

  @IsOptional()
  @IsString()
  nroComprobanteCoseguro?: string;
}

export class SuspenderMedicamentoDto {
  @IsInt()
  profesionalSuspensorId: number;

  @IsString()
  @IsNotEmpty()
  motivoSuspension: string;
}
