import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { PrescripcionesService } from '../services/prescripciones.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  PrescribirPracticaDto,
  PrescribirMedicamentoDto,
  PrescribirControlDto,
  AutorizarPrescripcionDto,
  SuspenderMedicamentoDto,
} from '../dto/prescripcion.dto';

@ApiTags('prescripciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('prescripciones')
export class PrescripcionesController {
  constructor(private svc: PrescripcionesService) {}

  @Get('internacion/:internacionId')
  @ApiOperation({ summary: 'Listar prescripciones de una internación' })
  findByInternacion(@Param('internacionId') id: string) {
    return this.svc.findByInternacion(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post('practica')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO)
  @ApiOperation({ summary: 'Prescribir práctica/estudio complementario' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'internacionId',
        'profesionalPrescriptorId',
        'practicaId',
        'diagnosticos',
      ],
      properties: {
        internacionId: { type: 'integer', example: 1 },
        profesionalPrescriptorId: { type: 'integer', example: 1 },
        practicaId: { type: 'integer', example: 1 },
        indicaciones: { type: 'string', example: 'Realizar en ayunas' },
        diagnosticos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descripcion: { type: 'string', example: 'Anemia' },
              prioridad: { type: 'integer', example: 1 },
            },
          },
        },
      },
    },
  })
  prescribirPractica(@Body() dto: PrescribirPracticaDto) {
    return this.svc.prescribirPractica(dto);
  }

  @Post('medicamento')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO)
  @ApiOperation({
    summary: 'Prescribir medicamento (genera agenda automática)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'internacionId',
        'profesionalPrescriptorId',
        'droga',
        'concentracion',
        'presentacion',
        'inicioTratamiento',
        'finTratamiento',
        'periodicidadHoras',
        'cantidad',
        'diagnosticos',
      ],
      properties: {
        internacionId: { type: 'integer', example: 1 },
        profesionalPrescriptorId: { type: 'integer', example: 1 },
        droga: { type: 'string', example: 'Amoxicilina' },
        concentracion: { type: 'string', example: '500 mg' },
        presentacion: {
          type: 'string',
          enum: [
            'comprimido',
            'grajea',
            'jarabe',
            'suspension',
            'inyectable',
            'capsula',
            'crema',
            'otro',
          ],
          example: 'comprimido',
        },
        inicioTratamiento: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-12T08:00:00Z',
        },
        finTratamiento: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-19T08:00:00Z',
        },
        periodicidadHoras: { type: 'integer', example: 8 },
        cantidad: { type: 'number', example: 1 },
        diagnosticos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descripcion: {
                type: 'string',
                example: 'Infección respiratoria',
              },
              prioridad: { type: 'integer', example: 1 },
            },
          },
        },
      },
    },
  })
  prescribirMedicamento(@Body() dto: PrescribirMedicamentoDto) {
    return this.svc.prescribirMedicamento(dto as any);
  }

  @Post('control-especial')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO)
  @ApiOperation({
    summary: 'Prescribir control especial (genera cronograma automático)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'internacionId',
        'profesionalPrescriptorId',
        'tipoControl',
        'inicioControl',
        'finControl',
        'periodicidadHoras',
        'diagnosticos',
      ],
      properties: {
        internacionId: { type: 'integer', example: 1 },
        profesionalPrescriptorId: { type: 'integer', example: 1 },
        tipoControl: { type: 'string', example: 'Temperatura' },
        inicioControl: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-12T08:00:00Z',
        },
        finControl: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T08:00:00Z',
        },
        periodicidadHoras: { type: 'integer', example: 4 },
        diagnosticos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descripcion: { type: 'string', example: 'Fiebre persistente' },
              prioridad: { type: 'integer', example: 1 },
            },
          },
        },
      },
    },
  })
  prescribirControl(@Body() dto: PrescribirControlDto) {
    return this.svc.prescribirControlEspecial(dto as any);
  }

  @Patch(':id/autorizar')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Registrar autorización de OS (Mesa de Entradas)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nroAutorizacion'],
      properties: {
        nroAutorizacion: { type: 'string', example: 'AUTH-2026-00123' },
        coseguroCobrado: { type: 'number', example: 500 },
        nroComprobanteCoseguro: { type: 'string', example: 'REC-456' },
      },
    },
  })
  autorizar(@Param('id') id: string, @Body() body: AutorizarPrescripcionDto) {
    return this.svc.autorizarPrescripcion(
      +id,
      body.nroAutorizacion,
      body.coseguroCobrado,
      body.nroComprobanteCoseguro,
    );
  }

  @Patch(':id/suspender')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO)
  @ApiOperation({ summary: 'Suspender medicamento (cancela agenda pendiente)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['profesionalSuspensorId', 'motivoSuspension'],
      properties: {
        profesionalSuspensorId: { type: 'integer', example: 1 },
        motivoSuspension: {
          type: 'string',
          example: 'Reacción alérgica al medicamento',
        },
      },
    },
  })
  suspender(@Param('id') id: string, @Body() body: SuspenderMedicamentoDto) {
    return this.svc.suspenderMedicamento(+id, body);
  }
}
