import {
  Body,
  Controller,
  Post,
  Patch,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RolUsuario } from './entities/usuario.entity';
import { Roles, RolesGuard } from './roles.guard';
import {
  LoginDto,
  CrearUsuarioDto,
  ActualizarUsuarioDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'admin123' },
      },
    },
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Post('usuarios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear usuario (solo admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password', 'nombreCompleto', 'rol'],
      properties: {
        username: { type: 'string', example: 'enfermera1' },
        password: { type: 'string', example: 'pass123' },
        nombreCompleto: { type: 'string', example: 'María González' },
        rol: {
          type: 'string',
          enum: [
            'admin',
            'medico',
            'enfermeria',
            'mesa_entradas',
            'facturacion',
            'botiquin',
          ],
          example: 'enfermeria',
        },
      },
    },
  })
  crearUsuario(@Body() body: CrearUsuarioDto) {
    return this.authService.crearUsuario(body as any);
  }

  @Get('usuarios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios del sistema (solo admin)' })
  listarUsuarios() {
    return this.authService.findAllUsuarios();
  }

  @Patch('usuarios/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activar/desactivar o cambiar rol de usuario (solo admin)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        activo: { type: 'boolean', example: false },
        rol: {
          type: 'string',
          enum: [
            'admin',
            'medico',
            'enfermeria',
            'mesa_entradas',
            'facturacion',
            'botiquin',
          ],
        },
      },
    },
  })
  actualizarUsuario(
    @Param('id') id: string,
    @Body() body: ActualizarUsuarioDto,
  ) {
    return this.authService.actualizarUsuario(+id, body as any);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  me(@Request() req: { user: Record<string, unknown> }) {
    const { passwordHash, ...user } = req.user;
    return user;
  }
}
