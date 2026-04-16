import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Internacion } from './entities/internacion.entity';
import { DiagnosticoInternacion } from './entities/diagnostico-internacion.entity';
import { Garantia } from './entities/garantia.entity';
import { InternacionesService } from './services/internaciones.service';
import { InternacionesController } from './controllers/internaciones.controller';
import { MaestrosModule } from '../maestros/maestros.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Internacion, DiagnosticoInternacion, Garantia]),
    MaestrosModule,
  ],
  providers: [InternacionesService],
  controllers: [InternacionesController],
  exports: [InternacionesService, TypeOrmModule],
})
export class InternacionesModule {}
