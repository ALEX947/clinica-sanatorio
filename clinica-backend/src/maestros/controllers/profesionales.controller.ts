import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ProfesionalesService } from '../services/profesionales.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  CrearProfesionalDto,
  ActualizarProfesionalDto,
  CrearTipoProfesionDto,
  ActualizarTipoProfesionDto,
} from '../dto/profesional.dto';

@ApiTags('maestros/profesionales')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/profesionales')
export class ProfesionalesController {
  constructor(private svc: ProfesionalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar profesionales' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('tipos-profesion')
  @ApiOperation({ summary: 'Listar tipos de profesión' })
  findTipos() {
    return this.svc.findTiposProfesion();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar profesional' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['apellido', 'nombre', 'matricula', 'tipoProfesionId'],
      properties: {
        apellido: { type: 'string', example: 'Pérez' },
        nombre: { type: 'string', example: 'Roberto' },
        matricula: { type: 'string', example: 'MP-12345' },
        telefono: { type: 'string', example: '387-4001122' },
        email: { type: 'string', example: 'rperez@clinica.com' },
        tipoProfesionId: { type: 'integer', example: 1 },
      },
    },
  })
  create(@Body() dto: CrearProfesionalDto) {
    return this.svc.create(dto);
  }

  @Patch('tipos-profesion/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar tipo de profesión' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        descripcion: { type: 'string' },
      },
    },
  })
  updateTipo(@Param('id') id: string, @Body() dto: ActualizarTipoProfesionDto) {
    return this.svc.updateTipoProfesion(+id, dto);
  }

  @Post('tipos-profesion')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar tipo de profesión' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string', example: 'Médico Clínico' },
        descripcion: {
          type: 'string',
          example: 'Médico especialista en clínica médica',
        },
      },
    },
  })
  createTipo(@Body() dto: CrearTipoProfesionDto) {
    return this.svc.createTipoProfesion(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar profesional' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        telefono: { type: 'string' },
        email: { type: 'string' },
        activo: { type: 'boolean' },
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: ActualizarProfesionalDto) {
    return this.svc.update(+id, dto);
  }
}
