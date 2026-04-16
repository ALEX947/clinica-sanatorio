import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { FacturacionService } from '../services/facturacion.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  CrearFacturaDto,
  RegistrarLiquidacionDto,
} from '../dto/facturacion.dto';

@ApiTags('facturacion')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('facturacion')
export class FacturacionController {
  constructor(private svc: FacturacionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Listar facturas' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post('facturas')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Confeccionar factura a Obra Social' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['internacionId', 'obraSocialId', 'prescripcionIds'],
      properties: {
        internacionId: { type: 'integer', example: 1 },
        obraSocialId: { type: 'integer', example: 1 },
        prescripcionIds: {
          type: 'array',
          items: { type: 'integer' },
          example: [1, 2, 3],
        },
        observaciones: {
          type: 'string',
          example: 'Factura período Abril 2026',
        },
      },
    },
  })
  crearFactura(@Body() dto: CrearFacturaDto) {
    return this.svc.crearFactura(dto as any);
  }

  @Post('liquidaciones')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Registrar liquidación de Obra Social' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['obraSocialId', 'facturaIds', 'montoTotal', 'fechaPago'],
      properties: {
        obraSocialId: { type: 'integer', example: 1 },
        facturaIds: {
          type: 'array',
          items: { type: 'integer' },
          example: [1, 2],
        },
        montoTotal: { type: 'number', example: 45000.0 },
        fechaPago: { type: 'string', format: 'date', example: '2026-04-30' },
        nroLiquidacion: { type: 'string', example: 'LIQ-2026-04-001' },
        observaciones: {
          type: 'string',
          example: 'Pago completo sin retenciones',
        },
      },
    },
  })
  registrarLiquidacion(@Body() dto: RegistrarLiquidacionDto) {
    return this.svc.registrarLiquidacion(dto as any);
  }

  @Get('prestadores/:id/consulta')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION, RolUsuario.MEDICO)
  @ApiOperation({ summary: 'Consulta de prestador: pendientes y liquidadas' })
  consultaPrestador(@Param('id') id: string) {
    return this.svc.consultaPrestador(+id);
  }
}
