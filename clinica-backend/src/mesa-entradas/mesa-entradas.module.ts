import { Module } from '@nestjs/common';
import { MesaEntradasController } from './controllers/mesa-entradas.controller';
import { InternacionesModule } from '../internaciones/internaciones.module';
import { PrescripcionesModule } from '../prescripciones/prescripciones.module';

@Module({
  imports: [InternacionesModule, PrescripcionesModule],
  controllers: [MesaEntradasController],
})
export class MesaEntradasModule {}
