import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudAbastecimiento } from './entities/solicitud-abastecimiento.entity';
import { ItemSolicitud } from './entities/item-solicitud.entity';
import { BotiquinService } from './services/botiquin.service';
import { BotiquinController } from './controllers/botiquin.controller';
import { InternacionesModule } from '../internaciones/internaciones.module';
import { PrescripcionesModule } from '../prescripciones/prescripciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudAbastecimiento, ItemSolicitud]),
    InternacionesModule,
    PrescripcionesModule,
  ],
  providers: [BotiquinService],
  controllers: [BotiquinController],
  exports: [BotiquinService],
})
export class BotiquinModule {}
