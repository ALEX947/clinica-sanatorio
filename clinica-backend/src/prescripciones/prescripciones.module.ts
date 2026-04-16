import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescripcion } from './entities/prescripcion.entity';
import { DiagnosticoPrescripcion } from './entities/diagnostico-prescripcion.entity';
import { PracticaPrescripta } from './entities/practica-prescripta.entity';
import { MedicamentoPrescripto } from './entities/medicamento-prescripto.entity';
import { ControlEspecialPrescripto } from './entities/control-especial-prescripto.entity';
import { PrescripcionesService } from './services/prescripciones.service';
import { PrescripcionesController } from './controllers/prescripciones.controller';
import { MaestrosModule } from '../maestros/maestros.module';
import { InternacionesModule } from '../internaciones/internaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prescripcion,
      DiagnosticoPrescripcion,
      PracticaPrescripta,
      MedicamentoPrescripto,
      ControlEspecialPrescripto,
    ]),
    MaestrosModule,
    InternacionesModule,
  ],
  providers: [PrescripcionesService],
  controllers: [PrescripcionesController],
  exports: [PrescripcionesService, TypeOrmModule],
})
export class PrescripcionesModule {}
