import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { EnfermeriaService } from '../services/enfermeria.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  RegistrarSuministroDto,
  RegistrarControlDto,
} from '../dto/enfermeria.dto';

@ApiTags('enfermeria')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('enfermeria')
export class EnfermeriaController {
  constructor(private svc: EnfermeriaService) {}

  @Get('agenda-suministros')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.ENFERMERIA)
  @ApiOperation({ summary: 'Agenda de suministros por período' })
  agendaSuministros(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.svc.agendaSuministrosPorPeriodo(
      new Date(desde),
      new Date(hasta),
    );
  }

  @Get('cronograma-controles')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.ENFERMERIA)
  @ApiOperation({ summary: 'Cronograma de controles especiales por período' })
  cronogramaControles(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.svc.cronogramaControlesPorPeriodo(
      new Date(desde),
      new Date(hasta),
    );
  }

  @Get('historial-suministros')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary: 'Historial de suministros (todos los estados, rango opcional)',
  })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  historialSuministros(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.svc.historialSuministros(
      desde ? new Date(desde) : undefined,
      hasta ? new Date(hasta) : undefined,
    );
  }

  @Get('historial-controles')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary: 'Historial de controles (todos los estados, rango opcional)',
  })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  historialControles(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.svc.historialControles(
      desde ? new Date(desde) : undefined,
      hasta ? new Date(hasta) : undefined,
    );
  }

  @Patch('suministros/:id/registrar')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ENFERMERIA)
  @ApiOperation({ summary: 'Registrar suministro de medicamento ejecutado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['enfermeraId'],
      properties: {
        enfermeraId: { type: 'integer', example: 1 },
        observaciones: {
          type: 'string',
          example: 'Suministrado sin inconvenientes',
        },
      },
    },
  })
  registrarSuministro(
    @Param('id') id: string,
    @Body() dto: RegistrarSuministroDto,
  ) {
    return this.svc.registrarSuministro(+id, dto);
  }

  @Patch('controles/:id/registrar')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary: 'Registrar control especial ejecutado (con resultado)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['enfermeraId', 'resultado'],
      properties: {
        enfermeraId: { type: 'integer', example: 1 },
        resultado: { type: 'string', example: '37.2°C' },
        observaciones: { type: 'string', example: 'Sin fiebre' },
      },
    },
  })
  registrarControl(@Param('id') id: string, @Body() dto: RegistrarControlDto) {
    return this.svc.registrarControl(+id, dto);
  }

  @Post('practicas/realizacion')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary:
      'Registrar realización de práctica (con profesionales intervinientes)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['prescripcionId', 'profesionalesIntervinientes'],
      properties: {
        prescripcionId: { type: 'integer', example: 1 },
        observaciones: {
          type: 'string',
          example: 'Práctica realizada en turno mañana',
        },
        profesionalesIntervinientes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              profesionalId: { type: 'integer', example: 1 },
              rol: { type: 'string', example: 'ejecutor' },
            },
          },
        },
      },
    },
  })
  registrarRealizacion(@Body() dto: any) {
    return this.svc.registrarRealizacionPractica(dto);
  }
}
