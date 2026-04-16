/**
 * Tests de integración — ProfesionalesService
 *
 * Verifican la gestión de tipos de profesión y profesionales
 * contra clinica_test_db (PostgreSQL real).
 *
 * Requiere: clinica_test_db corriendo (ver setup-db.sql).
 * Ejecutar: npm run test:integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ProfesionalesService } from '../../src/maestros/services/profesionales.service';

import { ALL_ENTITIES, testTypeOrmModule } from './helpers';

describe('ProfesionalesService — integración (PostgreSQL real)', () => {
  let module: TestingModule;
  let service: ProfesionalesService;
  let ds: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [testTypeOrmModule, TypeOrmModule.forFeature(ALL_ENTITIES)],
      providers: [ProfesionalesService],
    }).compile();

    service = module.get(ProfesionalesService);
    ds = module.get(DataSource);
  });

  afterAll(async () => {
    await ds.query(
      `TRUNCATE TABLE profesionales, tipos_profesion RESTART IDENTITY CASCADE`,
    );
    await module.close();
  });

  beforeEach(async () => {
    await ds.query(
      `TRUNCATE TABLE profesionales, tipos_profesion RESTART IDENTITY CASCADE`,
    );
  });

  // ── tipos_profesion ────────────────────────────────────────────────────────

  describe('createTipoProfesion', () => {
    it('persiste el tipo de profesión con nombre y descripción', async () => {
      const creado = await service.createTipoProfesion({
        nombre: 'Médico Clínico',
        descripcion: 'Especialista en medicina general',
      });

      expect(creado.id).toBeGreaterThan(0);
      expect(creado.nombre).toBe('Médico Clínico');
      expect(creado.descripcion).toBe('Especialista en medicina general');
    });
  });

  describe('findTiposProfesion', () => {
    it('retorna la lista ordenada por nombre', async () => {
      await service.createTipoProfesion({ nombre: 'Traumatólogo' });
      await service.createTipoProfesion({ nombre: 'Cardiólogo' });
      await service.createTipoProfesion({ nombre: 'Anestesiólogo' });

      const lista = await service.findTiposProfesion();

      expect(lista.length).toBe(3);
      expect(lista[0].nombre).toBe('Anestesiólogo');
      expect(lista[1].nombre).toBe('Cardiólogo');
      expect(lista[2].nombre).toBe('Traumatólogo');
    });
  });

  describe('updateTipoProfesion', () => {
    it('actualiza la descripción del tipo de profesión', async () => {
      const creado = await service.createTipoProfesion({
        nombre: 'Enfermero',
        descripcion: 'Descripción original',
      });

      const actualizado = await service.updateTipoProfesion(creado.id, {
        descripcion: 'Descripción actualizada',
      });

      expect(actualizado).toBeDefined();
      expect(actualizado!.id).toBe(creado.id);
      expect(actualizado!.descripcion).toBe('Descripción actualizada');
      expect(actualizado!.nombre).toBe('Enfermero');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(
        service.updateTipoProfesion(99999, { descripcion: 'No existe' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── profesionales ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea el profesional asociado a un tipo existente', async () => {
      const tipo = await service.createTipoProfesion({ nombre: 'Pediatra' });

      const creado = await service.create({
        apellido: 'Herrera',
        nombre: 'Marcela',
        matricula: 'MP-1001',
        telefono: '3874561234',
        email: 'mherrera@clinica.com',
        tipoProfesionId: tipo.id,
      });

      expect(creado.id).toBeGreaterThan(0);
      expect(creado.apellido).toBe('Herrera');
      expect(creado.nombre).toBe('Marcela');
      expect(creado.matricula).toBe('MP-1001');
      expect(creado.tipoProfesion).toBeDefined();
      expect(creado.tipoProfesion.id).toBe(tipo.id);
      expect(creado.tipoProfesion.nombre).toBe('Pediatra');
    });

    it('lanza NotFoundException si tipoProfesionId no existe', async () => {
      await expect(
        service.create({
          apellido: 'Inexistente',
          nombre: 'Sin Tipo',
          matricula: 'MP-9999',
          tipoProfesionId: 99999,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('retorna la lista de profesionales ordenada por apellido', async () => {
      const tipo = await service.createTipoProfesion({ nombre: 'Médico' });

      await service.create({
        apellido: 'Zárate',
        nombre: 'Luis',
        matricula: 'MP-001',
        tipoProfesionId: tipo.id,
      });
      await service.create({
        apellido: 'Apaza',
        nombre: 'Elena',
        matricula: 'MP-002',
        tipoProfesionId: tipo.id,
      });
      await service.create({
        apellido: 'Molina',
        nombre: 'Carlos',
        matricula: 'MP-003',
        tipoProfesionId: tipo.id,
      });

      const lista = await service.findAll();

      expect(lista.length).toBe(3);
      expect(lista[0].apellido).toBe('Apaza');
      expect(lista[1].apellido).toBe('Molina');
      expect(lista[2].apellido).toBe('Zárate');
    });
  });

  describe('findOne', () => {
    it('retorna el profesional existente con sus datos', async () => {
      const tipo = await service.createTipoProfesion({ nombre: 'Kinesiólogo' });
      const creado = await service.create({
        apellido: 'Villalba',
        nombre: 'Diego',
        matricula: 'KIN-100',
        tipoProfesionId: tipo.id,
      });

      const encontrado = await service.findOne(creado.id);

      expect(encontrado.id).toBe(creado.id);
      expect(encontrado.apellido).toBe('Villalba');
      expect(encontrado.matricula).toBe('KIN-100');
    });

    it('lanza NotFoundException para ID inexistente', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza teléfono y email del profesional', async () => {
      const tipo = await service.createTipoProfesion({ nombre: 'Radiólogo' });
      const creado = await service.create({
        apellido: 'Castro',
        nombre: 'Inés',
        matricula: 'RAD-200',
        telefono: '3870001111',
        email: 'icastro@old.com',
        tipoProfesionId: tipo.id,
      });

      const actualizado = await service.update(creado.id, {
        telefono: '3879999999',
        email: 'icastro@new.com',
      });

      expect(actualizado.id).toBe(creado.id);
      expect(actualizado.telefono).toBe('3879999999');
      expect(actualizado.email).toBe('icastro@new.com');
      // Datos no modificados se conservan
      expect(actualizado.apellido).toBe('Castro');
      expect(actualizado.matricula).toBe('RAD-200');
    });
  });

  describe('acreditarHonorarios', () => {
    it('incrementa saldoCuenta correctamente (verificado con SQL directo)', async () => {
      const tipo = await service.createTipoProfesion({ nombre: 'Cirujano' });
      const creado = await service.create({
        apellido: 'Quispe',
        nombre: 'Raúl',
        matricula: 'CIR-300',
        tipoProfesionId: tipo.id,
      });

      // El saldo inicial es 0 (default de la entidad)
      await service.acreditarHonorarios(creado.id, 15000);
      await service.acreditarHonorarios(creado.id, 5000);

      const [row] = await ds.query(
        `SELECT "saldoCuenta" FROM profesionales WHERE id = $1`,
        [creado.id],
      );
      expect(Number(row.saldoCuenta)).toBe(20000);
    });
  });
});
