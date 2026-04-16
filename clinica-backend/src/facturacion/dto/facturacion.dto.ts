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

export class DetalleFacturaDto {
  @IsInt()
  internacionId: number;

  @IsOptional()
  @IsInt()
  prescripcionId?: number;

  @IsOptional()
  @IsInt()
  practicaId?: number;

  @IsInt()
  prestadorId: number;

  @IsNumber()
  valorFacturado: number;

  @IsOptional()
  @IsNumber()
  copagoPrecobrado?: number;
}

export class CrearFacturaDto {
  @IsInt()
  obraSocialId: number;

  @IsDateString()
  periodoDesde: string;

  @IsDateString()
  periodoHasta: string;

  @IsString()
  @IsNotEmpty()
  nroFactura: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleFacturaDto)
  detalles: DetalleFacturaDto[];
}

export class ItemLiquidacionDto {
  @IsInt()
  detalleFacturaId: number;

  @IsIn(['reconocido', 'debitado'])
  tipo: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  motivoDebito?: string;
}

export class RegistrarLiquidacionDto {
  @IsInt()
  facturaId: number;

  @IsDateString()
  fechaLiquidacion: string;

  @IsOptional()
  @IsString()
  nroReferencia?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemLiquidacionDto)
  items: ItemLiquidacionDto[];
}
