import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NomencladorService } from '../services/nomenclador.service';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { RolUsuario } from '../../auth/entities/usuario.entity';
import {
  ActualizarArancelDto,
  ActualizarNomencladorDto,
  CrearNomencladorDto,
} from '../dto/nomenclador.dto';

@ApiTags('maestros/nomenclador')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('maestros/nomenclador')
export class NomencladorController {
  constructor(private svc: NomencladorService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar prácticas INOS' })
  findAll(
    @Query('q') q?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.svc.findAll(q, incluirInactivos === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Cargar práctica INOS' })
  create(@Body() dto: CrearNomencladorDto) {
    return this.svc.create(dto);
  }

  // Rutas estáticas de aranceles — deben ir ANTES de /:id para evitar conflictos
  @Post('aranceles')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Definir arancel de práctica para una OS' })
  setArancel(@Body() dto: any) {
    return this.svc.setArancel(dto);
  }

  @Get('aranceles/:id')
  @ApiOperation({ summary: 'Obtener arancel por ID' })
  getArancelById(@Param('id') id: string) {
    return this.svc.findArancel(+id);
  }

  @Patch('aranceles/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Actualizar arancel' })
  updateArancel(@Param('id') id: string, @Body() dto: ActualizarArancelDto) {
    return this.svc.updateArancel(+id, dto);
  }

  @Delete('aranceles/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN, RolUsuario.FACTURACION)
  @ApiOperation({ summary: 'Eliminar arancel' })
  deleteArancel(@Param('id') id: string) {
    return this.svc.deleteArancel(+id);
  }

  // Rutas con parámetro dinámico — van DESPUÉS de las estáticas
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar práctica INOS' })
  update(@Param('id') id: string, @Body() dto: ActualizarNomencladorDto) {
    return this.svc.update(+id, dto);
  }

  @Get(':id/aranceles')
  @ApiOperation({ summary: 'Listar aranceles de una práctica' })
  listAranceles(@Param('id') id: string) {
    return this.svc.listAranceles(+id);
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
