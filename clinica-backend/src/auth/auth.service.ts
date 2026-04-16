import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario, RolUsuario } from './entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usuarioRepo.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    if (!user.activo) {
      throw new UnauthorizedException(
        'El usuario está deshabilitado. Contacte al administrador.',
      );
    }
    const payload = { sub: user.id, username: user.username, rol: user.rol };
    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: user.id,
        username: user.username,
        rol: user.rol,
        nombreCompleto: user.nombreCompleto,
      },
    };
  }

  async crearUsuario(dto: {
    username: string;
    password: string;
    nombreCompleto: string;
    rol: RolUsuario;
  }) {
    const existe = await this.usuarioRepo.findOne({
      where: { username: dto.username },
    });
    if (existe) throw new ConflictException('El usuario ya existe');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = this.usuarioRepo.create({ ...dto, passwordHash });
    return this.usuarioRepo.save(usuario);
  }

  findAllUsuarios() {
    return this.usuarioRepo.find({
      select: ['id', 'username', 'nombreCompleto', 'rol', 'activo', 'creadoEn'],
      order: { nombreCompleto: 'ASC' },
    });
  }

  async actualizarUsuario(
    id: number,
    dto: { activo?: boolean; rol?: RolUsuario },
  ) {
    await this.usuarioRepo.update(id, dto);
    return this.usuarioRepo.findOne({
      where: { id },
      select: ['id', 'username', 'nombreCompleto', 'rol', 'activo', 'creadoEn'],
    });
  }

  async cambiarPassword(userId: number, nuevaPassword: string) {
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await this.usuarioRepo.update(userId, { passwordHash });
  }
}
