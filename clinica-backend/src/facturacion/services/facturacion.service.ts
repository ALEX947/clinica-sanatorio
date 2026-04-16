import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Internacion } from '../../internaciones/entities/internacion.entity';
import { Prescripcion } from '../../prescripciones/entities/prescripcion.entity';
import { Factura, EstadoFactura } from '../entities/factura.entity';
import {
  DetalleFactura,
  EstadoDetalle,
} from '../entities/detalle-factura.entity';
import { Liquidacion } from '../entities/liquidacion.entity';
import {
  ItemLiquidacion,
  TipoItemLiquidacion,
} from '../entities/item-liquidacion.entity';
import { ObrasSocialesService } from '../../maestros/services/obras-sociales.service';
import { ProfesionalesService } from '../../maestros/services/profesionales.service';
import { NomencladorService } from '../../maestros/services/nomenclador.service';

@Injectable()
export class FacturacionService {
  constructor(
    @InjectRepository(Factura) private facturaRepo: Repository<Factura>,
    @InjectRepository(DetalleFactura)
    private detalleRepo: Repository<DetalleFactura>,
    @InjectRepository(Liquidacion)
    private liquidacionRepo: Repository<Liquidacion>,
    @InjectRepository(ItemLiquidacion)
    private itemLiquidRepo: Repository<ItemLiquidacion>,
    private obrasSocialesService: ObrasSocialesService,
    private profesionalesService: ProfesionalesService,
    private nomencladorService: NomencladorService,
    private dataSource: DataSource,
  ) {}

  findAll() {
    return this.facturaRepo.find({
      relations: ['obraSocial'],
      order: { fechaEmision: 'DESC' },
    });
  }

  async findOne(id: number) {
    const f = await this.facturaRepo.findOne({
      where: { id },
      relations: [
        'obraSocial',
        'detalles',
        'detalles.internacion',
        'detalles.internacion.paciente',
        'detalles.practica',
        'detalles.prestador',
        'liquidaciones',
      ],
    });
    if (!f) throw new NotFoundException(`Factura ${id} no encontrada`);
    return f;
  }

  async crearFactura(dto: {
    obraSocialId: number;
    periodoDesde: Date;
    periodoHasta: Date;
    nroFactura: string;
    detalles: Array<{
      internacionId: number;
      prescripcionId?: number;
      practicaId?: number;
      prestadorId: number;
      valorFacturado: number;
      copagoPrecobrado?: number;
    }>;
  }) {
    const facturaId = await this.dataSource.transaction(async (manager) => {
      const obraSocial = await this.obrasSocialesService.findOne(
        dto.obraSocialId,
      );
      let montoTotal = 0;
      let montoCopagos = 0;

      const factura = await manager.save(Factura, {
        nroFactura: dto.nroFactura,
        obraSocial,
        periodoDesde: dto.periodoDesde,
        periodoHasta: dto.periodoHasta,
        fechaEmision: new Date(),
        estado: EstadoFactura.EMITIDA,
      });

      for (const det of dto.detalles) {
        const prestador = await this.profesionalesService.findOne(
          det.prestadorId,
        );
        const practica = det.practicaId
          ? await this.nomencladorService.findOne(det.practicaId)
          : undefined;
        await manager.save(DetalleFactura, {
          factura,
          internacion: { id: det.internacionId } as unknown as Internacion,
          prescripcion: det.prescripcionId
            ? ({ id: det.prescripcionId } as unknown as Prescripcion)
            : undefined,
          practica,
          prestador,
          valorFacturado: det.valorFacturado,
          copagoPrecobrado: det.copagoPrecobrado ?? 0,
        });
        montoTotal += det.valorFacturado;
        montoCopagos += det.copagoPrecobrado ?? 0;
      }

      await manager.update(Factura, factura.id, {
        montoTotal,
        montoCopagosDescontados: montoCopagos,
      });
      return factura.id;
    });
    return this.findOne(facturaId);
  }

  async registrarLiquidacion(dto: {
    facturaId: number;
    fechaLiquidacion: Date;
    nroReferencia?: string;
    items: Array<{
      detalleFacturaId: number;
      tipo: TipoItemLiquidacion;
      monto: number;
      motivoDebito?: string;
    }>;
  }) {
    await this.dataSource.transaction(async (manager) => {
      const factura = await this.findOne(dto.facturaId);
      let montoLiquidado = 0;

      const liquidacion = await manager.save(Liquidacion, {
        factura,
        fechaLiquidacion: dto.fechaLiquidacion,
        nroReferencia: dto.nroReferencia,
        montoLiquidado: 0,
      });

      for (const item of dto.items) {
        await manager.save(ItemLiquidacion, {
          liquidacion,
          detalleFactura: {
            id: item.detalleFacturaId,
          } as unknown as DetalleFactura,
          tipo: item.tipo,
          monto: item.monto,
          motivoDebito: item.motivoDebito,
        });

        // Actualizar estado del detalle
        await manager.update(DetalleFactura, item.detalleFacturaId, {
          estado:
            item.tipo === TipoItemLiquidacion.RECONOCIDO
              ? EstadoDetalle.LIQUIDADO
              : EstadoDetalle.DEBITADO,
          motivoDebito: item.motivoDebito,
        });

        if (item.tipo === TipoItemLiquidacion.RECONOCIDO) {
          montoLiquidado += item.monto;

          // Acreditar honorarios al prestador
          const detalle = await manager.findOne(DetalleFactura, {
            where: { id: item.detalleFacturaId },
            relations: ['prestador'],
          });
          if (detalle?.prestador) {
            await manager.increment(
              'profesionales',
              { id: detalle.prestador.id },
              'saldoCuenta',
              item.monto,
            );
          }
        }
      }

      await manager.update(Liquidacion, liquidacion.id, { montoLiquidado });

      // Actualizar estado de la factura
      const detalles = await manager.find(DetalleFactura, {
        where: { factura: { id: dto.facturaId } },
      });
      const todosLiquidados = detalles.every(
        (d) => d.estado !== EstadoDetalle.FACTURADO,
      );
      await manager.update(Factura, dto.facturaId, {
        estado: todosLiquidados
          ? EstadoFactura.LIQUIDADA
          : EstadoFactura.PARCIALMENTE_LIQUIDADA,
      });
    });
    return this.findOne(dto.facturaId);
  }

  // Consulta para prestadores: prácticas pendientes de liquidación
  async consultaPrestador(prestadorId: number) {
    return {
      pendientesLiquidacion: await this.detalleRepo.find({
        where: {
          prestador: { id: prestadorId },
          estado: EstadoDetalle.FACTURADO,
        },
        relations: [
          'factura',
          'factura.obraSocial',
          'internacion',
          'internacion.paciente',
          'practica',
        ],
        order: { factura: { fechaEmision: 'DESC' } },
      }),
      liquidadas: await this.detalleRepo.find({
        where: {
          prestador: { id: prestadorId },
          estado: EstadoDetalle.LIQUIDADO,
        },
        relations: [
          'factura',
          'factura.obraSocial',
          'internacion',
          'internacion.paciente',
          'practica',
        ],
        order: { factura: { fechaEmision: 'DESC' } },
      }),
    };
  }
}
