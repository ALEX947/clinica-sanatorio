import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { NomencladorService } from '../services/nomenclador.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import { CrearNomencladorDto } from '../dto/nomenclador.dto';

@ApiTags('maestros/nomenclador')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/nomenclador')
export class NomencladorController {
  constructor(private svc: NomencladorService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar prácticas INOS' })
  findAll(@Query('q') q?: string) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Cargar práctica INOS' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['codigo', 'descripcion'],
      properties: {
        codigo: { type: 'string', example: '040101' },
        descripcion: { type: 'string', example: 'Consulta médica ambulatoria' },
        especialidad: { type: 'string', example: 'Clínica Médica' },
      },
    },
  })
  create(@Body() dto: CrearNomencladorDto) {
    return this.svc.create(dto);
  }

  @Post('aranceles')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Definir arancel de práctica para una OS' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['practicaId', 'obraSocialId', 'valorArancel', 'vigenciaDesde'],
      properties: {
        practicaId: { type: 'integer', example: 1 },
        obraSocialId: { type: 'integer', example: 1 },
        valorArancel: { type: 'number', example: 1500.0 },
        porcentajeCopago: { type: 'number', example: 10 },
        vigenciaDesde: {
          type: 'string',
          format: 'date',
          example: '2026-01-01',
        },
        vigenciaHasta: {
          type: 'string',
          format: 'date',
          example: '2026-12-31',
        },
      },
    },
  })
  setArancel(@Body() dto: any) {
    return this.svc.setArancel(dto);
  }

  @Get(':practicaId/arancel/:obraSocialId')
  @ApiOperation({ summary: 'Obtener arancel vigente de práctica para una OS' })
  getArancel(
    @Param('practicaId') pid: string,
    @Param('obraSocialId') osid: string,
  ) {
    return this.svc.getArancelParaOS(+pid, +osid);
  }
}
