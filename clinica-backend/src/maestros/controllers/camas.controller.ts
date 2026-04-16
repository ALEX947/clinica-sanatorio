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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CamasService } from '../services/camas.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  CrearCamaDto,
  ActualizarEstadoCamaDto,
  CrearSectorDto,
  ActualizarSectorDto,
} from '../dto/cama.dto';

@ApiTags('maestros/camas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/camas')
export class CamasController {
  constructor(private svc: CamasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las camas' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Camas disponibles (filtrar por sector)' })
  findDisponibles(@Query('sectorId') sectorId?: string) {
    return this.svc.findDisponibles(sectorId ? +sectorId : undefined);
  }

  @Get('sectores')
  @ApiOperation({ summary: 'Listar sectores' })
  findSectores() {
    return this.svc.findSectores();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar cama' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['numero', 'sector'],
      properties: {
        numero: { type: 'string', example: '101' },
        individual: { type: 'boolean', example: false },
        sector: {
          type: 'object',
          properties: { id: { type: 'integer', example: 1 } },
        },
      },
    },
  })
  create(@Body() dto: CrearCamaDto) {
    return this.svc.create(dto as any);
  }

  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Cambiar estado de cama (disponible/ocupada/mantenimiento)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['estado'],
      properties: {
        estado: {
          type: 'string',
          enum: ['disponible', 'ocupada', 'mantenimiento'],
          example: 'disponible',
        },
      },
    },
  })
  updateEstado(@Param('id') id: string, @Body() body: ActualizarEstadoCamaDto) {
    return this.svc.updateEstado(+id, body.estado as any);
  }

  @Patch('sectores/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar sector' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        descripcion: { type: 'string' },
      },
    },
  })
  updateSector(@Param('id') id: string, @Body() dto: ActualizarSectorDto) {
    return this.svc.updateSector(+id, dto);
  }

  @Post('sectores')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar sector' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string', example: 'UTI Adultos' },
        descripcion: {
          type: 'string',
          example: 'Unidad de Terapia Intensiva Adultos',
        },
      },
    },
  })
  createSector(@Body() dto: CrearSectorDto) {
    return this.svc.createSector(dto);
  }
}
