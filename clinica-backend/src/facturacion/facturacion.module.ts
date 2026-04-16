import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from './entities/factura.entity';
import { DetalleFactura } from './entities/detalle-factura.entity';
import { Liquidacion } from './entities/liquidacion.entity';
import { ItemLiquidacion } from './entities/item-liquidacion.entity';
import { FacturacionService } from './services/facturacion.service';
import { FacturacionController } from './controllers/facturacion.controller';
import { MaestrosModule } from '../maestros/maestros.module';
import { InternacionesModule } from '../internaciones/internaciones.module';
import { PrescripcionesModule } from '../prescripciones/prescripciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      DetalleFactura,
      Liquidacion,
      ItemLiquidacion,
    ]),
    MaestrosModule,
    InternacionesModule,
    PrescripcionesModule,
  ],
  providers: [FacturacionService],
  controllers: [FacturacionController],
  exports: [FacturacionService],
})
export class FacturacionModule {}
