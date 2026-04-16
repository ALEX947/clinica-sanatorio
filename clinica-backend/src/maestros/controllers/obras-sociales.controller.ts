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
import { ObrasSocialesService } from '../services/obras-sociales.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  CrearObraSocialDto,
  ActualizarObraSocialDto,
} from '../dto/obra-social.dto';

@ApiTags('maestros/obras-sociales')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/obras-sociales')
export class ObrasSocialesController {
  constructor(private svc: ObrasSocialesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar obras sociales' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar obra social' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string', example: 'PAMI' },
        cuit: { type: 'string', example: '30-54649489-4' },
        domicilio: { type: 'string', example: 'Av. Belgrano 1234' },
        telefono: { type: 'string', example: '387-4220000' },
        email: { type: 'string', example: 'contacto@pami.com.ar' },
        modalidadFacturacion: {
          type: 'string',
          example: 'Presentar el día 1 de cada mes con copia de HC',
        },
        diaFacturacion: { type: 'integer', example: 1 },
      },
    },
  })
  create(@Body() dto: CrearObraSocialDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Actualizar obra social' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        telefono: { type: 'string' },
        email: { type: 'string' },
        modalidadFacturacion: { type: 'string' },
        activa: { type: 'boolean' },
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: ActualizarObraSocialDto) {
    return this.svc.update(+id, dto);
  }
}
