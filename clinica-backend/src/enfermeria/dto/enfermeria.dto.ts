import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class RegistrarSuministroDto {
  @IsInt()
  personalEnfermeriaId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarControlDto {
  @IsInt()
  personalEnfermeriaId: number;

  @IsString()
  @IsNotEmpty()
  resultado: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
