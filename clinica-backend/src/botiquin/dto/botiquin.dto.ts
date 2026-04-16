import { IsInt, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemSolicitudDto {
  @IsInt()
  medicamentoPrescriptoId: number;

  @IsInt()
  cantidadSolicitada: number;
}

export class CrearSolicitudDto {
  @IsInt()
  internacionId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSolicitudDto)
  items: ItemSolicitudDto[];
}

export class ItemEntregaDto {
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @Type(() => Number)
  @IsNumber()
  cantidadEntregada: number;
}

export class RegistrarEntregaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemEntregaDto)
  items: ItemEntregaDto[];
}
