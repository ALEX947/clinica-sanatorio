import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Usuario } from './auth/entities/usuario.entity';
import { Paciente } from './maestros/entities/paciente.entity';
import { Profesional } from './maestros/entities/profesional.entity';
import { TipoProfesion } from './maestros/entities/tipo-profesion.entity';
import { ObraSocial } from './maestros/entities/obra-social.entity';
import { NomencladorInos } from './maestros/entities/nomenclador-inos.entity';
import { ArancelObraSocial } from './maestros/entities/arancel-obra-social.entity';
import { Sector } from './maestros/entities/sector.entity';
import { Cama } from './maestros/entities/cama.entity';
import { Internacion } from './internaciones/entities/internacion.entity';
import { DiagnosticoInternacion } from './internaciones/entities/diagnostico-internacion.entity';
import { Garantia } from './internaciones/entities/garantia.entity';
import { Prescripcion } from './prescripciones/entities/prescripcion.entity';
import { DiagnosticoPrescripcion } from './prescripciones/entities/diagnostico-prescripcion.entity';
import { PracticaPrescripta } from './prescripciones/entities/practica-prescripta.entity';
import { MedicamentoPrescripto } from './prescripciones/entities/medicamento-prescripto.entity';
import { ControlEspecialPrescripto } from './prescripciones/entities/control-especial-prescripto.entity';
import { EventoSuministro } from './enfermeria/entities/evento-suministro.entity';
import { EventoControl } from './enfermeria/entities/evento-control.entity';
import { RealizacionPractica } from './enfermeria/entities/realizacion-practica.entity';
import { SolicitudAbastecimiento } from './botiquin/entities/solicitud-abastecimiento.entity';
import { ItemSolicitud } from './botiquin/entities/item-solicitud.entity';
import { Factura } from './facturacion/entities/factura.entity';
import { DetalleFactura } from './facturacion/entities/detalle-factura.entity';
import { Liquidacion } from './facturacion/entities/liquidacion.entity';
import { ItemLiquidacion } from './facturacion/entities/item-liquidacion.entity';

// Modules
import { AuthModule } from './auth/auth.module';
import { MaestrosModule } from './maestros/maestros.module';
import { InternacionesModule } from './internaciones/internaciones.module';
import { PrescripcionesModule } from './prescripciones/prescripciones.module';
import { EnfermeriaModule } from './enfermeria/enfermeria.module';
import { BotiquinModule } from './botiquin/botiquin.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { MesaEntradasModule } from './mesa-entradas/mesa-entradas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        database: config.get('DB_NAME', 'clinica_db'),
        username: config.get('DB_USER', 'clinica_user'),
        password: config.get('DB_PASS', 'clinica_pass'),
        entities: [
          Usuario,
          Paciente,
          Profesional,
          TipoProfesion,
          ObraSocial,
          NomencladorInos,
          ArancelObraSocial,
          Sector,
          Cama,
          Internacion,
          DiagnosticoInternacion,
          Garantia,
          Prescripcion,
          DiagnosticoPrescripcion,
          PracticaPrescripta,
          MedicamentoPrescripto,
          ControlEspecialPrescripto,
          EventoSuministro,
          EventoControl,
          RealizacionPractica,
          SolicitudAbastecimiento,
          ItemSolicitud,
          Factura,
          DetalleFactura,
          Liquidacion,
          ItemLiquidacion,
        ],
        synchronize: true, // Solo para desarrollo; usar migraciones en producción
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    MaestrosModule,
    InternacionesModule,
    PrescripcionesModule,
    EnfermeriaModule,
    BotiquinModule,
    FacturacionModule,
    MesaEntradasModule,
  ],
})
export class AppModule {}
