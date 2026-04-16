/**
 * Helpers compartidos para los tests de integración.
 * Todos los tests usan clinica_test_db (PostgreSQL real).
 */
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from '../../src/auth/entities/usuario.entity';
import { TipoProfesion } from '../../src/maestros/entities/tipo-profesion.entity';
import { Profesional } from '../../src/maestros/entities/profesional.entity';
import { Paciente } from '../../src/maestros/entities/paciente.entity';
import { ObraSocial } from '../../src/maestros/entities/obra-social.entity';
import { Sector } from '../../src/maestros/entities/sector.entity';
import { Cama } from '../../src/maestros/entities/cama.entity';
import { NomencladorInos } from '../../src/maestros/entities/nomenclador-inos.entity';
import { ArancelObraSocial } from '../../src/maestros/entities/arancel-obra-social.entity';
import { Internacion } from '../../src/internaciones/entities/internacion.entity';
import { DiagnosticoInternacion } from '../../src/internaciones/entities/diagnostico-internacion.entity';
import { Garantia } from '../../src/internaciones/entities/garantia.entity';
import { Prescripcion } from '../../src/prescripciones/entities/prescripcion.entity';
import { DiagnosticoPrescripcion } from '../../src/prescripciones/entities/diagnostico-prescripcion.entity';
import { PracticaPrescripta } from '../../src/prescripciones/entities/practica-prescripta.entity';
import { MedicamentoPrescripto } from '../../src/prescripciones/entities/medicamento-prescripto.entity';
import { ControlEspecialPrescripto } from '../../src/prescripciones/entities/control-especial-prescripto.entity';
import { EventoSuministro } from '../../src/enfermeria/entities/evento-suministro.entity';
import { EventoControl } from '../../src/enfermeria/entities/evento-control.entity';
import { RealizacionPractica } from '../../src/enfermeria/entities/realizacion-practica.entity';
import { SolicitudAbastecimiento } from '../../src/botiquin/entities/solicitud-abastecimiento.entity';
import { ItemSolicitud } from '../../src/botiquin/entities/item-solicitud.entity';
import { Factura } from '../../src/facturacion/entities/factura.entity';
import { DetalleFactura } from '../../src/facturacion/entities/detalle-factura.entity';
import { Liquidacion } from '../../src/facturacion/entities/liquidacion.entity';
import { ItemLiquidacion } from '../../src/facturacion/entities/item-liquidacion.entity';

export const ALL_ENTITIES = [
  Usuario,
  TipoProfesion,
  Profesional,
  Paciente,
  ObraSocial,
  Sector,
  Cama,
  NomencladorInos,
  ArancelObraSocial,
  Internacion,
  DiagnosticoInternacion,
  Garantia,
  Prescripcion,
  DiagnosticoPrescripcion,
  PracticaPrescripta,
  MedicamentoPrescripto,
  ControlEspecialPrescripto,
  EventoSuministro,
  EventoControl,
  RealizacionPractica,
  SolicitudAbastecimiento,
  ItemSolicitud,
  Factura,
  DetalleFactura,
  Liquidacion,
  ItemLiquidacion,
];

/** Módulo TypeORM apuntando a clinica_test_db con synchronize:true. */
export const testTypeOrmModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.TEST_DB_NAME ?? 'clinica_test_db',
  username: process.env.DB_USER ?? 'clinica_user',
  password: process.env.DB_PASS ?? 'clinica_pass',
  entities: ALL_ENTITIES,
  synchronize: true, // TypeORM crea/actualiza las tablas automáticamente
  logging: false,
});

/** Limpia TODAS las tablas y reinicia las secuencias entre tests. */
export const TRUNCATE_ALL = `
  TRUNCATE TABLE
    eventos_control, eventos_suministro, realizaciones_practica,
    controles_especiales_prescriptos, medicamentos_prescriptos, practicas_prescriptas,
    diagnosticos_prescripcion, prescripciones,
    items_solicitud, solicitudes_abastecimiento,
    items_liquidacion, liquidaciones, detalles_factura, facturas,
    garantias, diagnosticos_internacion, internaciones,
    aranceles_obra_social, nomenclador_inos,
    camas, sectores, profesionales, tipos_profesion,
    pacientes, obras_sociales, usuarios
  RESTART IDENTITY CASCADE
`;

/** Inserta el seed mínimo necesario y retorna los IDs generados. */
export async function seedMinimo(ds: any): Promise<{
  profesionalId: number;
  pacienteId: number;
  obraSocialId: number;
  camaId: number;
  internacionId: number;
  practicaId: number;
}> {
  const [tipo] = await ds.query(
    `INSERT INTO tipos_profesion (nombre, descripcion) VALUES ('Médico', 'Clínico') RETURNING id`,
  );
  const [prof] = await ds.query(
    `INSERT INTO profesionales (apellido, nombre, matricula, activo, "tipoProfesionId", "saldoCuenta", "creadoEn", "actualizadoEn")
     VALUES ('García', 'Luis', 'MP-TEST-01', true, $1, 0, NOW(), NOW()) RETURNING id`,
    [tipo.id],
  );
  const [pac] = await ds.query(
    `INSERT INTO pacientes (apellido, nombre, dni, "fechaNacimiento", sexo, "creadoEn", "actualizadoEn")
     VALUES ('Pérez', 'Juan', '99999999', '1990-01-01', 'M', NOW(), NOW()) RETURNING id`,
  );
  const [os] = await ds.query(
    `INSERT INTO obras_sociales (nombre, "modalidadFacturacion", activa)
     VALUES ('OS Test', 'mensual', true) RETURNING id`,
  );
  const [sector] = await ds.query(
    `INSERT INTO sectores (nombre) VALUES ('Sala Test') RETURNING id`,
  );
  const [cama] = await ds.query(
    `INSERT INTO camas (numero, individual, estado, "sectorId")
     VALUES ('T01', false, 'disponible', $1) RETURNING id`,
    [sector.id],
  );
  const [intern] = await ds.query(
    `INSERT INTO internaciones
       (tipo, estado, "fechaHoraIngreso", "pacienteId", "profesionalIntervinienteId", "obraSocialId", "camaId", "creadoEn", "actualizadoEn")
     VALUES ('urgente', 'activa', NOW(), $1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
    [pac.id, prof.id, os.id, cama.id],
  );
  const [practica] = await ds.query(
    `INSERT INTO nomenclador_inos (codigo, descripcion, activo)
     VALUES ('TST-001', 'Práctica de prueba', true) RETURNING id`,
  );

  return {
    profesionalId: prof.id,
    pacienteId: pac.id,
    obraSocialId: os.id,
    camaId: cama.id,
    internacionId: intern.id,
    practicaId: practica.id,
  };
}
