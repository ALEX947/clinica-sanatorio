import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InternacionesService } from '../../internaciones/services/internaciones.service';
import { PrescripcionesService } from '../../prescripciones/services/prescripciones.service';
import { MotivoAlta } from '../../internaciones/entities/internacion.entity';
import { EstadoPrescripcion } from '../../prescripciones/entities/prescripcion.entity';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';

/**
 * Mesa de Entradas actúa como orquestador de admisión, autorizaciones y alta.
 * Delega la lógica de negocio a InternacionesService y PrescripcionesService.
 */
@ApiTags('mesa-entradas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
@Controller('mesa-entradas')
export class MesaEntradasController {
  constructor(
    private internacionesService: InternacionesService,
    private prescripcionesService: PrescripcionesService,
  ) {}

  @Get('internaciones-activas')
  @ApiOperation({
    summary: 'Ver internaciones activas (vista de Mesa de Entradas)',
  })
  internacionesActivas() {
    return this.internacionesService.findAll(true);
  }

  @Get('internaciones/:id/prescripciones-pendientes')
  @ApiOperation({
    summary: 'Ver prescripciones sin autorización de una internación',
  })
  async prescripcionesPendientes(@Param('id') id: string) {
    const todas = await this.prescripcionesService.findByInternacion(+id);
    return todas.filter((p) => p.estado === EstadoPrescripcion.PRESCRIPTA);
  }

  @Patch('prescripciones/:id/autorizar')
  @ApiOperation({ summary: 'Registrar autorización de OS y cobro de coseguro' })
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
  autorizar(
    @Param('id') id: string,
    @Body()
    body: {
      nroAutorizacion: string;
      coseguroCobrado?: number;
      nroComprobanteCoseguro?: string;
    },
  ) {
    return this.prescripcionesService.autorizarPrescripcion(
      +id,
      body.nroAutorizacion,
      body.coseguroCobrado,
      body.nroComprobanteCoseguro,
    );
  }

  @Patch('internaciones/:id/alta')
  @ApiOperation({
    summary: 'Gestionar alta del paciente (reintegro y liberación de cama)',
  })
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
  darAlta(
    @Param('id') id: string,
    @Body() body: { motivo: MotivoAlta; observaciones?: string },
  ) {
    return this.internacionesService.darAlta(
      +id,
      body.motivo,
      body.observaciones,
    );
  }

  @Patch('internaciones/garantias/:garantiaId/reintegro')
  @ApiOperation({
    summary: 'Registrar reintegro de depósito/pagaré de garantía',
  })
  reintegrarGarantia(@Param('garantiaId') gid: string) {
    return this.internacionesService.reintegrarGarantia(+gid);
  }
}
