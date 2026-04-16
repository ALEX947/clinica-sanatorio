import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { InternacionesService } from '../services/internaciones.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import { IniciarInternacionDto, DarAltaDto } from '../dto/internacion.dto';

@ApiTags('internaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('internaciones')
export class InternacionesController {
  constructor(private svc: InternacionesService) {}

  @Get()
  @ApiQuery({ name: 'activas', required: false, type: Boolean })
  @ApiOperation({ summary: 'Listar internaciones (activas o todas)' })
  findAll(@Query('activas') activas?: string) {
    return this.svc.findAll(
      activas === undefined ? undefined : activas === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Iniciar internación (Mesa de Entradas)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'tipo',
        'pacienteId',
        'profesionalIntervinienteId',
        'obraSocialId',
        'camaId',
        'diagnosticos',
      ],
      properties: {
        tipo: {
          type: 'string',
          enum: ['programada', 'urgente', 'emergente'],
          example: 'programada',
        },
        pacienteId: { type: 'integer', example: 1 },
        profesionalIntervinienteId: { type: 'integer', example: 1 },
        profesionalPrescriptorId: {
          type: 'integer',
          example: 2,
          nullable: true,
        },
        obraSocialId: { type: 'integer', example: 1 },
        camaId: { type: 'integer', example: 1 },
        nroAfiliado: { type: 'string', example: '12345678' },
        observaciones: {
          type: 'string',
          example: 'Paciente con antecedentes de HTA',
        },
        diagnosticos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descripcion: { type: 'string', example: 'Neumonía bilateral' },
              prioridad: { type: 'integer', example: 1 },
            },
          },
        },
        garantia: {
          type: 'object',
          nullable: true,
          properties: {
            tipo: { type: 'string', enum: ['deposito', 'pagare'] },
            monto: { type: 'number', example: 50000 },
            nroComprobante: { type: 'string', example: 'REC-001' },
          },
        },
      },
    },
  })
  iniciar(@Body() dto: IniciarInternacionDto) {
    return this.svc.iniciar(dto as any);
  }

  @Patch(':id/alta')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Dar de alta al paciente' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['motivo'],
      properties: {
        motivo: {
          type: 'string',
          enum: [
            'curacion',
            'mejoria',
            'traslado',
            'fallecimiento',
            'voluntaria',
            'otro',
          ],
          example: 'curacion',
        },
        observaciones: {
          type: 'string',
          example: 'Paciente evoluciona favorablemente',
        },
      },
    },
  })
  darAlta(@Param('id') id: string, @Body() body: DarAltaDto) {
    return this.svc.darAlta(+id, body.motivo as any, body.observaciones);
  }

  @Patch('garantias/:garantiaId/reintegro')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Registrar reintegro de garantía/depósito' })
  reintegrarGarantia(@Param('garantiaId') gid: string) {
    return this.svc.reintegrarGarantia(+gid);
  }
}
