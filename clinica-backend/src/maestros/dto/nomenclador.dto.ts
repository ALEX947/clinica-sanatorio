import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
