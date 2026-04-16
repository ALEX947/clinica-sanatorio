import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../../src/auth/auth.service';
import { Usuario, RolUsuario } from '../../../src/auth/entities/usuario.entity';

const mockUsuarioRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'mock-jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('devuelve accessToken y datos del usuario con credenciales válidas', async () => {
      const hash = await bcrypt.hash('admin123', 10);
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        passwordHash: hash,
        rol: RolUsuario.ADMIN,
        nombreCompleto: 'Administrador',
        activo: true,
      });

      const result = await service.login('admin', 'admin123');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.usuario.username).toBe('admin');
      expect(result.usuario.rol).toBe(RolUsuario.ADMIN);
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.login('noexiste', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      const hash = await bcrypt.hash('correcta', 10);
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        passwordHash: hash,
        rol: RolUsuario.ADMIN,
        nombreCompleto: 'Admin',
        activo: true,
      });
      await expect(service.login('admin', 'incorrecta')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── crearUsuario ─────────────────────────────────────────────────────────────

  describe('crearUsuario', () => {
    it('crea y retorna el usuario nuevo', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      mockUsuarioRepo.create.mockImplementation((dto) => dto);
      mockUsuarioRepo.save.mockImplementation((u) =>
        Promise.resolve({ id: 2, ...u }),
      );

      const result = await service.crearUsuario({
        username: 'enf_nuevo',
        password: 'pass123',
        nombreCompleto: 'Enf. Nueva',
        rol: RolUsuario.ENFERMERIA,
      });

      expect(result.username).toBe('enf_nuevo');
      expect(result.rol).toBe(RolUsuario.ENFERMERIA);
      expect(result.passwordHash).not.toBe('pass123'); // se guarda hasheada, no en texto plano
    });

    it('lanza ConflictException si el username ya existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ id: 1, username: 'admin' });
      await expect(
        service.crearUsuario({
          username: 'admin',
          password: 'x',
          nombreCompleto: 'x',
          rol: RolUsuario.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
