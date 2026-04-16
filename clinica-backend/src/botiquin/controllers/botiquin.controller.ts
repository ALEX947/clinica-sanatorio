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
import { BotiquinService } from '../services/botiquin.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import { CrearSolicitudDto, RegistrarEntregaDto } from '../dto/botiquin.dto';
import { EstadoSolicitud } from '../entities/solicitud-abastecimiento.entity';

@ApiTags('botiquin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('botiquin')
export class BotiquinController {
  constructor(private svc: BotiquinService) {}

  @Get('solicitudes')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.BOTIQUIN, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary:
      'Listar solicitudes de abastecimiento (historial, filtrable por estado y fecha)',
  })
  @ApiQuery({ name: 'estado', enum: EstadoSolicitud, required: false })
  @ApiQuery({ name: 'desde', required: false })
  @ApiQuery({ name: 'hasta', required: false })
  listar(
    @Query('estado') estado?: EstadoSolicitud,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.svc.findSolicitudes(
      estado,
      desde ? new Date(desde) : undefined,
      hasta ? new Date(hasta) : undefined,
    );
  }

  @Get('solicitudes/pendientes')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.BOTIQUIN, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary: 'Listar solicitudes pendientes y parciales (requieren acción)',
  })
  pendientes() {
    return this.svc.findSolicitudesPendientes();
  }

  @Get('solicitudes/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.BOTIQUIN, RolUsuario.ENFERMERIA)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post('solicitudes')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.ENFERMERIA)
  @ApiOperation({
    summary: 'Crear solicitud de abastecimiento de medicamentos',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['internacionId', 'prescripcionId', 'items'],
      properties: {
        internacionId: { type: 'integer', example: 1 },
        prescripcionId: { type: 'integer', example: 1 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              droga: { type: 'string', example: 'Amoxicilina' },
              concentracion: { type: 'string', example: '500 mg' },
              presentacion: { type: 'string', example: 'comprimido' },
              cantidad: { type: 'number', example: 21 },
            },
          },
        },
      },
    },
  })
  crear(@Body() dto: CrearSolicitudDto) {
    return this.svc.crearSolicitud(dto);
  }

  @Patch('solicitudes/:id/entrega')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.BOTIQUIN)
  @ApiOperation({ summary: 'Registrar entrega de medicamentos' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'integer', example: 1 },
              cantidadEntregada: { type: 'number', example: 21 },
            },
          },
        },
      },
    },
  })
  registrarEntrega(@Param('id') id: string, @Body() body: RegistrarEntregaDto) {
    return this.svc.registrarEntrega(+id, body.items);
  }

  @Patch('items/:id/devolucion')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.BOTIQUIN)
  @ApiOperation({
    summary: 'Registrar devolución de medicamentos no suministrados',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['cantidadDevuelta'],
      properties: {
        cantidadDevuelta: { type: 'number', example: 5 },
      },
    },
  })
  devolucion(
    @Param('id') id: string,
    @Body() body: { cantidadDevuelta: number },
  ) {
    return this.svc.registrarDevolucion(+id, body.cantidadDevuelta);
  }
}
