import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from './entities/paciente.entity';
import { Profesional } from './entities/profesional.entity';
import { TipoProfesion } from './entities/tipo-profesion.entity';
import { ObraSocial } from './entities/obra-social.entity';
import { NomencladorInos } from './entities/nomenclador-inos.entity';
import { ArancelObraSocial } from './entities/arancel-obra-social.entity';
import { Sector } from './entities/sector.entity';
import { Cama } from './entities/cama.entity';
import { PacientesService } from './services/pacientes.service';
import { ProfesionalesService } from './services/profesionales.service';
import { ObrasSocialesService } from './services/obras-sociales.service';
import { NomencladorService } from './services/nomenclador.service';
import { CamasService } from './services/camas.service';
import { PacientesController } from './controllers/pacientes.controller';
import { ProfesionalesController } from './controllers/profesionales.controller';
import { ObrasSocialesController } from './controllers/obras-sociales.controller';
import { NomencladorController } from './controllers/nomenclador.controller';
import { CamasController } from './controllers/camas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paciente,
      Profesional,
      TipoProfesion,
      ObraSocial,
      NomencladorInos,
      ArancelObraSocial,
      Sector,
      Cama,
    ]),
  ],
  providers: [
    PacientesService,
    ProfesionalesService,
    ObrasSocialesService,
    NomencladorService,
    CamasService,
  ],
  controllers: [
    PacientesController,
    ProfesionalesController,
    ObrasSocialesController,
    NomencladorController,
    CamasController,
  ],
  exports: [
    PacientesService,
    ProfesionalesService,
    ObrasSocialesService,
    NomencladorService,
    CamasService,
    TypeOrmModule,
  ],
})
export class MaestrosModule {}
