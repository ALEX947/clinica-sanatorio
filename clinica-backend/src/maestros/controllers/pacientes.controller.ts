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
import { PacientesService } from '../services/pacientes.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import { CrearPacienteDto, ActualizarPacienteDto } from '../dto/paciente.dto';

@ApiTags('maestros/pacientes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/pacientes')
export class PacientesController {
  constructor(private svc: PacientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar paciente por DNI' })
  findByDni(@Query('dni') dni: string) {
    return this.svc.findByDni(dni);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Registrar paciente' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['dni', 'apellido', 'nombre', 'fechaNacimiento', 'sexo'],
      properties: {
        dni: { type: 'string', example: '12345678' },
        apellido: { type: 'string', example: 'González' },
        nombre: { type: 'string', example: 'Juan Carlos' },
        fechaNacimiento: {
          type: 'string',
          format: 'date',
          example: '1985-03-20',
        },
        sexo: { type: 'string', enum: ['M', 'F'] },
        domicilio: { type: 'string', example: 'Av. San Martín 450' },
        localidad: { type: 'string', example: 'Salta' },
        telefono: { type: 'string', example: '387-4123456' },
      },
    },
  })
  create(@Body() dto: CrearPacienteDto) {
    return this.svc.create(dto as any);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.MESA_ENTRADAS)
  @ApiOperation({ summary: 'Actualizar datos del paciente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        domicilio: { type: 'string' },
        localidad: { type: 'string' },
        telefono: { type: 'string' },
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: ActualizarPacienteDto) {
    return this.svc.update(+id, dto as any);
  }
}
