import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoSuministro } from './entities/evento-suministro.entity';
import { EventoControl } from './entities/evento-control.entity';
import { RealizacionPractica } from './entities/realizacion-practica.entity';
import { EnfermeriaService } from './services/enfermeria.service';
import { EnfermeriaController } from './controllers/enfermeria.controller';
import { MaestrosModule } from '../maestros/maestros.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventoSuministro,
      EventoControl,
      RealizacionPractica,
    ]),
    MaestrosModule,
  ],
  providers: [EnfermeriaService],
  controllers: [EnfermeriaController],
  exports: [EnfermeriaService, TypeOrmModule],
})
export class EnfermeriaModule {}
