/**
 * Script de seed: limpia y repuebla todas las tablas de la base de datos.
 * Ejecutar con:
 *   npx ts-node -r tsconfig-paths/register seed.ts
 */
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';

const client = new Client({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'clinica_db',
  user:     process.env.DB_USER     ?? 'clinica_user',
  password: process.env.DB_PASS     ?? 'clinica_pass',
});

/** Genera array de fechas desde `inicio` hasta `fin` separadas por `periodicidadHoras`. */
function fechasRecurrentes(inicio: Date, fin: Date, periodicidadHoras: number): Date[] {
  const fechas: Date[] = [];
  let cur = new Date(inicio);
  while (cur <= fin) {
    fechas.push(new Date(cur));
    cur = new Date(cur.getTime() + periodicidadHoras * 3_600_000);
  }
  return fechas;
}

async function main() {
  await client.connect();
  console.log('Conectado a la base de datos.\n');

  // ── 0. LIMPIAR BASE DE DATOS ──────────────────────────────────────────────
  console.log('Limpiando base de datos...');
  await client.query(`
    TRUNCATE TABLE
      eventos_control, eventos_suministro, realizaciones_practica,
      controles_especiales_prescriptos, medicamentos_prescriptos, practicas_prescriptas,
      diagnosticos_prescripcion, prescripciones,
      items_solicitud, solicitudes_abastecimiento,
      items_liquidacion, liquidaciones,
      detalles_factura, facturas,
      garantias, diagnosticos_internacion, internaciones,
      aranceles_obra_social, nomenclador_inos,
      camas, sectores,
      profesionales, tipos_profesion,
      pacientes, obras_sociales, usuarios
    RESTART IDENTITY CASCADE
  `);
  console.log('  ✓ Todas las tablas vaciadas\n');

  // ── 1. USUARIOS ──────────────────────────────────────────────────────────
  console.log('Creando usuarios...');
  const usuarios = [
    { username: 'admin',       password: 'admin123',  nombreCompleto: 'Administrador del Sistema',    rol: 'admin' },
    { username: 'mesa1',       password: 'mesa123',   nombreCompleto: 'Lucía Fernández',              rol: 'mesa_entradas' },
    { username: 'dr_gomez',    password: 'medico123', nombreCompleto: 'Dr. Héctor Gómez',             rol: 'medico' },
    { username: 'dr_paredes',  password: 'medico123', nombreCompleto: 'Dra. Valeria Paredes',         rol: 'medico' },
    { username: 'enf_torres',  password: 'enf123',    nombreCompleto: 'Enf. Claudia Torres',          rol: 'enfermeria' },
    { username: 'enf_rios',    password: 'enf123',    nombreCompleto: 'Enf. Marcos Ríos',             rol: 'enfermeria' },
    { username: 'fact1',       password: 'fact123',   nombreCompleto: 'Facturación - Sandra López',   rol: 'facturacion' },
    { username: 'botiquin1',   password: 'bot123',    nombreCompleto: 'Botiquín - Carlos Medina',     rol: 'botiquin' },
  ];
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await client.query(
      `INSERT INTO usuarios (username, "passwordHash", "nombreCompleto", rol, activo, "creadoEn")
       VALUES ($1, $2, $3, $4, true, NOW())`,
      [u.username, hash, u.nombreCompleto, u.rol],
    );
    console.log(`  ✓ ${u.username.padEnd(14)} [${u.rol}]  →  contraseña: ${u.password}`);
  }

  // ── 2. TIPOS DE PROFESIÓN ─────────────────────────────────────────────────
  console.log('\nCreando tipos de profesión...');
  const tiposProfesion = [
    { nombre: 'Médico Clínico',       descripcion: 'Médico de práctica clínica general' },
    { nombre: 'Médico Especialista',  descripcion: 'Médico con especialidad reconocida' },
    { nombre: 'Cirujano',             descripcion: 'Médico cirujano' },
    { nombre: 'Anestesiólogo',        descripcion: 'Médico anestesiólogo' },
    { nombre: 'Kinesiólogo',          descripcion: 'Profesional de kinesiología y fisioterapia' },
    { nombre: 'Bioquímico',           descripcion: 'Profesional de laboratorio clínico' },
    { nombre: 'Enfermero/a',          descripcion: 'Profesional de enfermería' },
    { nombre: 'Instrumentador/a',     descripcion: 'Instrumentador/a quirúrgico/a' },
  ];
  for (const t of tiposProfesion) {
    await client.query(
      `INSERT INTO tipos_profesion (nombre, descripcion) VALUES ($1, $2)`,
      [t.nombre, t.descripcion],
    );
    console.log(`  ✓ ${t.nombre}`);
  }

  // ── 3. OBRAS SOCIALES ─────────────────────────────────────────────────────
  console.log('\nCreando obras sociales...');
  const obrasSociales = [
    { nombre: 'PAMI',              cuit: '30-54649489-4', domicilio: 'Av. Belgrano 1234, Salta',   telefono: '387-4220000', email: 'salta@pami.com.ar',           modalidadFacturacion: 'Presentar el día 1 de cada mes con copia de HC y formularios P01/P04',         diaFacturacion: 1 },
    { nombre: 'OSDE',              cuit: '30-51859295-0', domicilio: 'Av. San Martín 567, Salta',  telefono: '387-4310000', email: 'salta@osde.com.ar',            modalidadFacturacion: 'Facturación quincenal. Adjuntar orden de internación y epicrisis.',              diaFacturacion: 15 },
    { nombre: 'Swiss Medical',     cuit: '30-68720284-9', domicilio: 'Caseros 890, Salta',         telefono: '387-4210000', email: 'salta@swissmedical.com.ar',    modalidadFacturacion: 'Presentar el último día hábil del mes con documentación completa.',           diaFacturacion: 28 },
    { nombre: 'IOSFA',             cuit: '30-54649987-1', domicilio: 'Uruguay 123, Salta',         telefono: '387-4250000', email: 'salta@iosfa.mil.ar',           modalidadFacturacion: 'Presentar mensualmente con autorización previa de internación.',               diaFacturacion: 5 },
    { nombre: 'Particular (sin OS)', cuit: null,          domicilio: null,                         telefono: null,          email: null,                           modalidadFacturacion: 'Pago directo al momento del alta. Garantía obligatoria.',                      diaFacturacion: null },
  ];
  for (const os of obrasSociales) {
    await client.query(
      `INSERT INTO obras_sociales (nombre, cuit, domicilio, telefono, email, "modalidadFacturacion", "diaFacturacion", activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [os.nombre, os.cuit, os.domicilio, os.telefono, os.email, os.modalidadFacturacion, os.diaFacturacion],
    );
    console.log(`  ✓ ${os.nombre}`);
  }

  // ── 4. SECTORES ───────────────────────────────────────────────────────────
  console.log('\nCreando sectores...');
  const sectores = [
    { nombre: 'Clínica Médica', descripcion: 'Internación médica general adultos' },
    { nombre: 'Cirugía',        descripcion: 'Internación quirúrgica pre y postoperatoria' },
    { nombre: 'Guardia',        descripcion: 'Urgencias y emergencias' },
    { nombre: 'UTI',            descripcion: 'Unidad de Terapia Intensiva adultos' },
    { nombre: 'Maternidad',     descripcion: 'Obstetricia y puerperio' },
    { nombre: 'Pediatría',      descripcion: 'Internación pediátrica' },
  ];
  for (const s of sectores) {
    await client.query(
      `INSERT INTO sectores (nombre, descripcion) VALUES ($1, $2)`,
      [s.nombre, s.descripcion],
    );
    console.log(`  ✓ ${s.nombre}`);
  }

  // ── 5. CAMAS ──────────────────────────────────────────────────────────────
  console.log('\nCreando camas...');
  const { rows: sectorRows } = await client.query('SELECT id, nombre FROM sectores');
  const sectorId = (nombre: string) => sectorRows.find((r: any) => r.nombre === nombre)?.id;

  const camas = [
    ...['101','102','103','104','105','106','107','108'].map((n, i) => ({ numero: n, individual: i < 2, sector: 'Clínica Médica' })),
    ...['201','202','203','204','205','206'].map((n, i) => ({ numero: n, individual: i < 2, sector: 'Cirugía' })),
    ...['G1','G2','G3','G4'].map((n) => ({ numero: n, individual: false, sector: 'Guardia' })),
    ...['U1','U2','U3','U4','U5','U6'].map((n) => ({ numero: n, individual: true, sector: 'UTI' })),
    ...['M1','M2','M3','M4'].map((n, i) => ({ numero: n, individual: i < 2, sector: 'Maternidad' })),
    ...['P1','P2','P3','P4'].map((n) => ({ numero: n, individual: false, sector: 'Pediatría' })),
  ];
  for (const c of camas) {
    const sid = sectorId(c.sector);
    if (!sid) continue;
    await client.query(
      `INSERT INTO camas (numero, individual, estado, "sectorId") VALUES ($1, $2, 'disponible', $3)`,
      [c.numero, c.individual, sid],
    );
  }
  console.log(`  ✓ ${camas.length} camas (${sectores.length} sectores)`);

  // ── 6. PROFESIONALES ──────────────────────────────────────────────────────
  console.log('\nCreando profesionales...');
  const { rows: tipoRows } = await client.query('SELECT id, nombre FROM tipos_profesion');
  const tipoId = (nombre: string) => tipoRows.find((r: any) => r.nombre === nombre)?.id;

  const profesionales = [
    { apellido: 'Gómez',    nombre: 'Héctor',   matricula: 'MP-3210', telefono: '387-4001010', email: 'hgomez@clinica.com',   tipo: 'Médico Clínico' },
    { apellido: 'Paredes',  nombre: 'Valeria',  matricula: 'MP-4587', telefono: '387-4002020', email: 'vparedes@clinica.com',  tipo: 'Médico Especialista' },
    { apellido: 'Juárez',   nombre: 'Fernando', matricula: 'MP-2198', telefono: '387-4003030', email: 'fjuarez@clinica.com',   tipo: 'Cirujano' },
    { apellido: 'Quispe',   nombre: 'Daniela',  matricula: 'MP-5541', telefono: '387-4004040', email: 'dquispe@clinica.com',   tipo: 'Anestesiólogo' },
    { apellido: 'Molina',   nombre: 'Ricardo',  matricula: 'MK-0871', telefono: '387-4005050', email: 'rmolina@clinica.com',   tipo: 'Kinesiólogo' },
    { apellido: 'Torres',   nombre: 'Claudia',  matricula: 'ME-1120', telefono: '387-4006060', email: 'ctorres@clinica.com',   tipo: 'Enfermero/a' },
    { apellido: 'Ríos',     nombre: 'Marcos',   matricula: 'ME-1185', telefono: '387-4007070', email: 'mrios@clinica.com',     tipo: 'Enfermero/a' },
    { apellido: 'Castillo', nombre: 'Patricia', matricula: 'MB-3302', telefono: '387-4008080', email: 'pcastillo@clinica.com', tipo: 'Bioquímico' },
    { apellido: 'Díaz',     nombre: 'Silvana',  matricula: 'MI-0567', telefono: '387-4009090', email: 'sdiaz@clinica.com',     tipo: 'Instrumentador/a' },
  ];
  for (const p of profesionales) {
    const tid = tipoId(p.tipo);
    if (!tid) continue;
    await client.query(
      `INSERT INTO profesionales (apellido, nombre, matricula, telefono, email, activo, "tipoProfesionId", "saldoCuenta", "creadoEn", "actualizadoEn")
       VALUES ($1, $2, $3, $4, $5, true, $6, 0, NOW(), NOW())`,
      [p.apellido, p.nombre, p.matricula, p.telefono, p.email, tid],
    );
    console.log(`  ✓ ${p.apellido}, ${p.nombre}  [${p.tipo}]`);
  }

  // ── 7. PACIENTES ──────────────────────────────────────────────────────────
  console.log('\nCreando pacientes...');
  const pacientes = [
    { apellido: 'Rodríguez', nombre: 'Ana María',    dni: '25341890', fechaNacimiento: '1972-06-15', sexo: 'F', domicilio: 'Av. San Martín 1234', localidad: 'Salta',                 telefono: '387-4120010' },
    { apellido: 'Mamani',    nombre: 'Jorge Luis',   dni: '31456789', fechaNacimiento: '1990-11-03', sexo: 'M', domicilio: 'Urquiza 567',          localidad: 'Salta',                 telefono: '387-4130020' },
    { apellido: 'Flores',    nombre: 'Carmen Rosa',  dni: '18234567', fechaNacimiento: '1958-03-22', sexo: 'F', domicilio: 'Mitre 890',             localidad: 'Orán',                  telefono: '387-4140030' },
    { apellido: 'Torino',    nombre: 'Pablo Andrés', dni: '28901234', fechaNacimiento: '1985-08-09', sexo: 'M', domicilio: 'España 321',            localidad: 'Metán',                 telefono: '387-4150040' },
    { apellido: 'Yapura',    nombre: 'Elena',        dni: '34567890', fechaNacimiento: '2001-01-30', sexo: 'F', domicilio: 'Alvarado 654',          localidad: 'Rosario de la Frontera', telefono: '387-4160050' },
    { apellido: 'Calizaya',  nombre: 'Roberto Juan', dni: '20987654', fechaNacimiento: '1965-12-18', sexo: 'M', domicilio: 'Pellegrini 789',        localidad: 'Salta',                 telefono: '387-4170060' },
  ];
  for (const p of pacientes) {
    await client.query(
      `INSERT INTO pacientes (apellido, nombre, dni, "fechaNacimiento", sexo, domicilio, localidad, telefono, "creadoEn", "actualizadoEn")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [p.apellido, p.nombre, p.dni, p.fechaNacimiento, p.sexo, p.domicilio, p.localidad, p.telefono],
    );
    console.log(`  ✓ ${p.apellido}, ${p.nombre}  DNI: ${p.dni}`);
  }

  // ── 8. NOMENCLADOR INOS ───────────────────────────────────────────────────
  console.log('\nCreando prácticas INOS...');
  const practicasNom = [
    { codigo: '040101', descripcion: 'Consulta médica en internación',                especialidad: 'Clínica Médica' },
    { codigo: '040201', descripcion: 'Consulta médica de especialidad en internación', especialidad: 'Especialidades' },
    { codigo: '080101', descripcion: 'Hemograma completo',                             especialidad: 'Laboratorio' },
    { codigo: '080201', descripcion: 'Glucemia en sangre',                             especialidad: 'Laboratorio' },
    { codigo: '080301', descripcion: 'Urea y creatinina',                              especialidad: 'Laboratorio' },
    { codigo: '080401', descripcion: 'Ionograma sérico',                               especialidad: 'Laboratorio' },
    { codigo: '080501', descripcion: 'Hemocultivo',                                    especialidad: 'Laboratorio' },
    { codigo: '090101', descripcion: 'Radiografía de tórax frente',                    especialidad: 'Diagnóstico por Imágenes' },
    { codigo: '090201', descripcion: 'Ecografía abdominal',                            especialidad: 'Diagnóstico por Imágenes' },
    { codigo: '090301', descripcion: 'Tomografía computada de tórax',                  especialidad: 'Diagnóstico por Imágenes' },
    { codigo: '100101', descripcion: 'Electrocardiograma',                             especialidad: 'Cardiología' },
    { codigo: '100201', descripcion: 'Ecocardiograma doppler',                         especialidad: 'Cardiología' },
    { codigo: '110101', descripcion: 'Internación en sala general — día cama',         especialidad: 'Internación' },
    { codigo: '110201', descripcion: 'Internación en UTI — día cama',                  especialidad: 'Internación' },
    { codigo: '120101', descripcion: 'Cirugía abdominal — apendicectomía',             especialidad: 'Cirugía' },
    { codigo: '120201', descripcion: 'Colecistectomía laparoscópica',                  especialidad: 'Cirugía' },
    { codigo: '130101', descripcion: 'Kinesioterapia respiratoria — sesión',           especialidad: 'Kinesiología' },
  ];
  for (const p of practicasNom) {
    await client.query(
      `INSERT INTO nomenclador_inos (codigo, descripcion, especialidad, activo) VALUES ($1, $2, $3, true)`,
      [p.codigo, p.descripcion, p.especialidad],
    );
    console.log(`  ✓ [${p.codigo}] ${p.descripcion}`);
  }

  // ── 9. ARANCELES POR OBRA SOCIAL ──────────────────────────────────────────
  console.log('\nCreando aranceles...');
  const { rows: osRows }   = await client.query('SELECT id, nombre FROM obras_sociales');
  const { rows: pracRows } = await client.query('SELECT id, codigo FROM nomenclador_inos');
  const osId   = (nombre: string) => osRows.find((r: any) => r.nombre === nombre)?.id;
  const pracId = (codigo: string) => pracRows.find((r: any) => r.codigo === codigo)?.id;

  const arancelesPAMI = [
    { codigo: '040101', valor: 2800,  copago: 0  },
    { codigo: '040201', valor: 3500,  copago: 10 },
    { codigo: '080101', valor: 1200,  copago: 0  },
    { codigo: '080301', valor: 900,   copago: 0  },
    { codigo: '090101', valor: 2200,  copago: 0  },
    { codigo: '090201', valor: 3000,  copago: 0  },
    { codigo: '100101', valor: 1800,  copago: 0  },
    { codigo: '110101', valor: 12000, copago: 0  },
    { codigo: '110201', valor: 45000, copago: 0  },
    { codigo: '130101', valor: 1500,  copago: 10 },
  ];
  for (const a of arancelesPAMI) {
    const pid = pracId(a.codigo); const oid = osId('PAMI');
    if (!pid || !oid) continue;
    await client.query(
      `INSERT INTO aranceles_obra_social ("practicaId", "obraSocialId", "valorArancel", "porcentajeCopago", "vigenciaDesde")
       VALUES ($1, $2, $3, $4, '2026-01-01')`,
      [pid, oid, a.valor, a.copago],
    );
  }
  console.log(`  ✓ ${arancelesPAMI.length} aranceles PAMI`);

  for (const a of arancelesPAMI) {
    const pid = pracId(a.codigo); const oid = osId('OSDE');
    if (!pid || !oid) continue;
    await client.query(
      `INSERT INTO aranceles_obra_social ("practicaId", "obraSocialId", "valorArancel", "porcentajeCopago", "vigenciaDesde")
       VALUES ($1, $2, $3, $4, '2026-01-01')`,
      [pid, oid, Math.round(a.valor * 1.1), a.copago],
    );
  }
  console.log(`  ✓ ${arancelesPAMI.length} aranceles OSDE`);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS OPERATIVOS: internaciones, prescripciones, enfermería, botiquín, facturación
  // ═══════════════════════════════════════════════════════════════════════════

  const { rows: pacRows }   = await client.query('SELECT id, dni FROM pacientes');
  const { rows: profRows }  = await client.query('SELECT id, matricula FROM profesionales');
  const { rows: osSeedRows } = await client.query('SELECT id, nombre FROM obras_sociales');
  const { rows: camaRows }  = await client.query('SELECT id, numero FROM camas');

  const pacId  = (dni: string)       => pacRows.find((r: any)   => r.dni       === dni)?.id;
  const profId = (mat: string)       => profRows.find((r: any)  => r.matricula === mat)?.id;
  const osSeedId = (nom: string)     => osSeedRows.find((r: any) => r.nombre   === nom)?.id;
  const camaNum  = (num: string)     => camaRows.find((r: any)  => r.numero    === num)?.id;
  const pracNomId = (cod: string)    => pracRows.find((r: any)  => r.codigo    === cod)?.id;

  const NOW = new Date('2026-04-12T12:00:00');

  // ── 10. INTERNACIONES ─────────────────────────────────────────────────────
  console.log('\nCreando internaciones...');

  const internacionesDef = [
    // [0] Rodríguez → cama 101, Clínica Médica, Dr. Gómez, PAMI
    { tipo: 'urgente',    pacDni: '25341890', profMat: 'MP-3210', osNom: 'PAMI',             camaNro: '101', nroAfiliado: 'PAM-00125',   observaciones: 'Fiebre alta, tos productiva y disnea de esfuerzo',         ingreso: '2026-04-08T14:30:00' },
    // [1] Mamani → cama 201, Cirugía, Dra. Paredes, OSDE
    { tipo: 'programada', pacDni: '31456789', profMat: 'MP-4587', osNom: 'OSDE',             camaNro: '201', nroAfiliado: 'OSDE-55234',  observaciones: 'Internado para colecistectomía laparoscópica programada',   ingreso: '2026-04-10T08:00:00' },
    // [2] Flores → cama U1, UTI, Dr. Gómez, IOSFA
    { tipo: 'emergente',  pacDni: '18234567', profMat: 'MP-3210', osNom: 'IOSFA',            camaNro: 'U1',  nroAfiliado: 'IOSFA-33821', observaciones: 'Derivada de guardia por insuficiencia respiratoria aguda',  ingreso: '2026-04-07T22:15:00' },
    // [3] Torino → cama G1, Guardia, Dra. Paredes, Swiss Medical
    { tipo: 'urgente',    pacDni: '28901234', profMat: 'MP-4587', osNom: 'Swiss Medical',    camaNro: 'G1',  nroAfiliado: 'SWM-98123',   observaciones: 'Gastroenteritis con deshidratación moderada',              ingreso: '2026-04-11T10:00:00' },
  ];

  const internIds: number[] = [];
  for (const i of internacionesDef) {
    const { rows } = await client.query(
      `INSERT INTO internaciones
         (tipo, estado, "fechaHoraIngreso", "nroAfiliado", observaciones,
          "pacienteId", "profesionalIntervinienteId", "obraSocialId", "camaId", "creadoEn", "actualizadoEn")
       VALUES ($1, 'activa', $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [i.tipo, i.ingreso, i.nroAfiliado, i.observaciones,
       pacId(i.pacDni), profId(i.profMat), osSeedId(i.osNom), camaNum(i.camaNro)],
    );
    internIds.push(rows[0].id);
    console.log(`  ✓ Internación #${rows[0].id}: ${i.pacDni} — cama ${i.camaNro}`);
  }

  // Marcar camas como ocupadas
  for (const camaNro of ['101', '201', 'U1', 'G1']) {
    await client.query(`UPDATE camas SET estado = 'ocupada' WHERE numero = $1`, [camaNro]);
  }

  // ── 11. DIAGNÓSTICOS DE INTERNACIÓN ───────────────────────────────────────
  console.log('\nCreando diagnósticos de internación...');
  const diagsInt = [
    { i: 0, descripcion: 'Neumonía bacteriana bilateral',       prioridad: 1 },
    { i: 0, descripcion: 'Insuficiencia respiratoria leve',     prioridad: 2 },
    { i: 1, descripcion: 'Colelitiasis sintomática',            prioridad: 1 },
    { i: 1, descripcion: 'HTA controlada',                      prioridad: 2 },
    { i: 2, descripcion: 'Insuficiencia respiratoria aguda',    prioridad: 1 },
    { i: 2, descripcion: 'EPOC reagudizado',                    prioridad: 2 },
    { i: 3, descripcion: 'Gastroenteritis aguda',               prioridad: 1 },
    { i: 3, descripcion: 'Deshidratación moderada',             prioridad: 2 },
  ];
  for (const d of diagsInt) {
    await client.query(
      `INSERT INTO diagnosticos_internacion ("internacionId", descripcion, prioridad) VALUES ($1, $2, $3)`,
      [internIds[d.i], d.descripcion, d.prioridad],
    );
  }
  console.log(`  ✓ ${diagsInt.length} diagnósticos de internación`);

  // ── 12. PRESCRIPCIONES ────────────────────────────────────────────────────
  console.log('\nCreando prescripciones...');
  // idx 0 → medicamento Amoxicilina     (internacion 0 – Rodríguez)
  // idx 1 → práctica Hemograma          (internacion 0 – Rodríguez)
  // idx 2 → control Temperatura         (internacion 1 – Mamani)
  // idx 3 → medicamento Ibuprofeno      (internacion 1 – Mamani)
  // idx 4 → control Presión arterial    (internacion 2 – Flores)
  // idx 5 → medicamento Metoclopramida  (internacion 3 – Torino)
  const prescDef = [
    { internIdx: 0, tipo: 'medicamento',      profMat: 'MP-3210', fecha: '2026-04-08T15:00:00' },
    { internIdx: 0, tipo: 'practica',         profMat: 'MP-3210', fecha: '2026-04-08T15:10:00' },
    { internIdx: 1, tipo: 'control_especial', profMat: 'MP-4587', fecha: '2026-04-10T09:00:00' },
    { internIdx: 1, tipo: 'medicamento',      profMat: 'MP-4587', fecha: '2026-04-10T09:10:00' },
    { internIdx: 2, tipo: 'control_especial', profMat: 'MP-3210', fecha: '2026-04-07T23:00:00' },
    { internIdx: 3, tipo: 'medicamento',      profMat: 'MP-4587', fecha: '2026-04-11T10:30:00' },
  ];

  const prescIds: number[] = [];
  for (const p of prescDef) {
    const { rows } = await client.query(
      `INSERT INTO prescripciones
         (tipo, estado, "fechaHoraPrescripcion", "internacionId", "profesionalPrescriptorId", "creadoEn", "actualizadoEn")
       VALUES ($1, 'prescripta', $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [p.tipo, p.fecha, internIds[p.internIdx], profId(p.profMat)],
    );
    prescIds.push(rows[0].id);
  }
  console.log(`  ✓ ${prescIds.length} prescripciones`);

  // ── 13. DIAGNÓSTICOS DE PRESCRIPCIÓN ──────────────────────────────────────
  const diagsPresc = [
    { p: 0, descripcion: 'Neumonía bacteriana — tratamiento antibiótico',      prioridad: 1 },
    { p: 1, descripcion: 'Neumonía bacteriana — control hematológico',          prioridad: 1 },
    { p: 2, descripcion: 'Control febril postoperatorio',                       prioridad: 1 },
    { p: 3, descripcion: 'Dolor e inflamación postoperatoria',                  prioridad: 1 },
    { p: 4, descripcion: 'Monitoreo hemodinámico — insuficiencia respiratoria', prioridad: 1 },
    { p: 5, descripcion: 'Náuseas y vómitos — gastroenteritis aguda',           prioridad: 1 },
  ];
  for (const d of diagsPresc) {
    await client.query(
      `INSERT INTO diagnosticos_prescripcion ("prescripcionId", descripcion, prioridad) VALUES ($1, $2, $3)`,
      [prescIds[d.p], d.descripcion, d.prioridad],
    );
  }
  console.log(`  ✓ ${diagsPresc.length} diagnósticos de prescripción`);

  // ── 14. MEDICAMENTOS PRESCRIPTOS ──────────────────────────────────────────
  console.log('\nCreando medicamentos prescriptos...');
  const medDef = [
    { pIdx: 0, droga: 'Amoxicilina',    conc: '500 mg',  pres: 'comprimido', inicio: '2026-04-08T08:00:00', fin: '2026-04-15T08:00:00', periHoras: 8, cant: 1 },
    { pIdx: 3, droga: 'Ibuprofeno',     conc: '400 mg',  pres: 'comprimido', inicio: '2026-04-10T08:00:00', fin: '2026-04-13T08:00:00', periHoras: 8, cant: 1 },
    { pIdx: 5, droga: 'Metoclopramida', conc: '10 mg',   pres: 'inyectable', inicio: '2026-04-11T10:00:00', fin: '2026-04-13T10:00:00', periHoras: 8, cant: 1 },
  ];

  const medPrescIds: number[] = [];
  for (const m of medDef) {
    const { rows } = await client.query(
      `INSERT INTO medicamentos_prescriptos
         ("prescripcionId", droga, concentracion, presentacion, "inicioTratamiento", "finTratamiento", "periodicidadHoras", cantidad)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [prescIds[m.pIdx], m.droga, m.conc, m.pres, m.inicio, m.fin, m.periHoras, m.cant],
    );
    medPrescIds.push(rows[0].id);
    console.log(`  ✓ ${m.droga} ${m.conc} — prescripción #${prescIds[m.pIdx]}`);
  }

  // ── 15. PRÁCTICAS PRESCRIPTAS ─────────────────────────────────────────────
  console.log('\nCreando prácticas prescriptas...');
  const { rows: pracNomRows } = await client.query('SELECT id, codigo FROM nomenclador_inos');
  const pracNomIdFn = (cod: string) => pracNomRows.find((r: any) => r.codigo === cod)?.id;

  await client.query(
    `INSERT INTO practicas_prescriptas ("prescripcionId", "practicaId", indicaciones) VALUES ($1, $2, $3)`,
    [prescIds[1], pracNomIdFn('080101'), 'Solicitar en ayunas, repetir a las 48hs si persiste fiebre'],
  );
  console.log('  ✓ Hemograma completo (prescripción #' + prescIds[1] + ')');

  // ── 16. EVENTOS DE SUMINISTRO ─────────────────────────────────────────────
  console.log('\nGenerando eventos de suministro...');
  const enfTorresId = profRows.find((r: any) => r.matricula === 'ME-1120')?.id;
  const enfRiosId   = profRows.find((r: any) => r.matricula === 'ME-1185')?.id;

  for (let i = 0; i < medDef.length; i++) {
    const m = medDef[i];
    const mpId = medPrescIds[i];
    const fechas = fechasRecurrentes(new Date(m.inicio), new Date(m.fin), m.periHoras);

    for (let j = 0; j < fechas.length; j++) {
      const f = fechas[j];
      const pasado  = f < NOW;
      const estado  = pasado ? 'suministrado' : 'pendiente';
      const realiz  = pasado ? new Date(f.getTime() + 4 * 60_000).toISOString() : null;
      const enfId   = pasado ? (j % 2 === 0 ? enfTorresId : enfRiosId) : null;

      await client.query(
        `INSERT INTO eventos_suministro
           ("medicamentoPrescriptoId", "fechaHoraPlanificada", "fechaHoraRealizada", estado, "personalEnfermeriaId")
         VALUES ($1, $2, $3, $4, $5)`,
        [mpId, f.toISOString(), realiz, estado, enfId],
      );
    }
    console.log(`  ✓ ${fechas.length} eventos — ${m.droga}`);
  }

  // ── 17. CONTROLES ESPECIALES PRESCRIPTOS ──────────────────────────────────
  console.log('\nCreando controles especiales prescriptos...');
  const controlDef = [
    { pIdx: 2, tipo: 'Temperatura corporal', inicio: '2026-04-10T08:00:00', fin: '2026-04-14T08:00:00', periHoras: 4 },
    { pIdx: 4, tipo: 'Presión arterial',     inicio: '2026-04-07T08:00:00', fin: '2026-04-13T08:00:00', periHoras: 4 },
  ];

  const ctrlIds: number[] = [];
  for (const c of controlDef) {
    const { rows } = await client.query(
      `INSERT INTO controles_especiales_prescriptos
         ("prescripcionId", "tipoControl", "inicioControl", "finControl", "periodicidadHoras")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [prescIds[c.pIdx], c.tipo, c.inicio, c.fin, c.periHoras],
    );
    ctrlIds.push(rows[0].id);
    console.log(`  ✓ ${c.tipo} — prescripción #${prescIds[c.pIdx]}`);
  }

  // ── 18. EVENTOS DE CONTROL ────────────────────────────────────────────────
  console.log('\nGenerando eventos de control...');
  const resultadosTemp = ['36.8°C', '37.2°C', '38.1°C', '38.5°C', '37.9°C', '37.3°C', '36.9°C', '38.0°C'];
  const resultadosPA   = ['120/80 mmHg', '130/85 mmHg', '115/75 mmHg', '125/82 mmHg', '118/78 mmHg', '135/90 mmHg', '122/80 mmHg', '128/84 mmHg'];

  for (let i = 0; i < controlDef.length; i++) {
    const c = controlDef[i];
    const cpId    = ctrlIds[i];
    const fechas  = fechasRecurrentes(new Date(c.inicio), new Date(c.fin), c.periHoras);
    const resultados = i === 0 ? resultadosTemp : resultadosPA;

    for (let j = 0; j < fechas.length; j++) {
      const f = fechas[j];
      const pasado   = f < NOW;
      const estado   = pasado ? 'realizado' : 'pendiente';
      const realiz   = pasado ? new Date(f.getTime() + 3 * 60_000).toISOString() : null;
      const resultado = pasado ? resultados[j % resultados.length] : null;
      const enfId    = pasado ? (j % 2 === 0 ? enfTorresId : enfRiosId) : null;

      await client.query(
        `INSERT INTO eventos_control
           ("controlEspecialPrescriptoId", "fechaHoraPlanificada", "fechaHoraRealizada", estado, resultado, "personalEnfermeriaId")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cpId, f.toISOString(), realiz, estado, resultado, enfId],
      );
    }
    console.log(`  ✓ ${fechas.length} eventos — ${c.tipo}`);
  }

  // ── 19. SOLICITUD DE ABASTECIMIENTO (BOTIQUÍN) ────────────────────────────
  console.log('\nCreando solicitudes de abastecimiento...');
  const { rows: solRows } = await client.query(
    `INSERT INTO solicitudes_abastecimiento ("internacionId", estado, "creadoEn")
     VALUES ($1, 'pendiente', NOW())
     RETURNING id`,
    [internIds[0]],
  );
  const solicitudId = solRows[0].id;

  // Item 1: Amoxicilina × 10 unidades
  await client.query(
    `INSERT INTO items_solicitud ("solicitudId", "medicamentoPrescriptoId", "cantidadSolicitada", "cantidadEntregada", "cantidadDevuelta")
     VALUES ($1, $2, 10, 0, 0)`,
    [solicitudId, medPrescIds[0]],
  );
  // Item 2: Ibuprofeno × 6 unidades (para internacion 1, distinta solicitud)
  const { rows: sol2Rows } = await client.query(
    `INSERT INTO solicitudes_abastecimiento ("internacionId", estado, "creadoEn")
     VALUES ($1, 'parcial', NOW())
     RETURNING id`,
    [internIds[1]],
  );
  await client.query(
    `INSERT INTO items_solicitud ("solicitudId", "medicamentoPrescriptoId", "cantidadSolicitada", "cantidadEntregada", "cantidadDevuelta")
     VALUES ($1, $2, 9, 6, 0)`,
    [sol2Rows[0].id, medPrescIds[1]],
  );
  console.log('  ✓ 2 solicitudes de abastecimiento con items');

  // ── 20. FACTURAS ──────────────────────────────────────────────────────────
  console.log('\nCreando facturas...');
  // Factura F-2026-001: PAMI, período marzo 2026, internación de Rodríguez
  const { rows: facRows } = await client.query(
    `INSERT INTO facturas
       ("nroFactura", "obraSocialId", "periodoDesde", "periodoHasta", "fechaEmision",
        "montoTotal", "montoCopagosDescontados", estado)
     VALUES ($1, $2, '2026-03-01', '2026-03-31', '2026-04-05', 104200, 0, 'emitida')
     RETURNING id`,
    ['F-2026-001', osSeedId('PAMI')],
  );
  const facId1 = facRows[0].id;

  // Detalle 1: día cama × 7 días (internacion 0 como referencia)
  await client.query(
    `INSERT INTO detalles_factura
       ("facturaId", "internacionId", "practicaId", "prestadorId", "valorFacturado", "copagoPrecobrado", estado)
     VALUES ($1, $2, $3, $4, 84000, 0, 'facturado')`,
    [facId1, internIds[0], pracNomIdFn('110101'), profId('MP-3210')],
  );
  // Detalle 2: Hemograma
  await client.query(
    `INSERT INTO detalles_factura
       ("facturaId", "internacionId", "prescripcionId", "practicaId", "prestadorId", "valorFacturado", "copagoPrecobrado", estado)
     VALUES ($1, $2, $3, $4, $5, 1200, 0, 'facturado')`,
    [facId1, internIds[0], prescIds[1], pracNomIdFn('080101'), profId('MB-3302')],
  );
  // Detalle 3: Consultas médicas × 7 días
  await client.query(
    `INSERT INTO detalles_factura
       ("facturaId", "internacionId", "practicaId", "prestadorId", "valorFacturado", "copagoPrecobrado", estado)
     VALUES ($1, $2, $3, $4, 19600, 0, 'facturado')`,
    [facId1, internIds[0], pracNomIdFn('040101'), profId('MP-3210')],
  );
  console.log(`  ✓ Factura F-2026-001 (PAMI, marzo 2026) — $104.200 — 3 detalles`);

  // Factura F-2026-002: OSDE, período marzo 2026
  const { rows: facRows2 } = await client.query(
    `INSERT INTO facturas
       ("nroFactura", "obraSocialId", "periodoDesde", "periodoHasta", "fechaEmision",
        "montoTotal", "montoCopagosDescontados", estado)
     VALUES ($1, $2, '2026-03-01', '2026-03-31', '2026-04-05', 42000, 0, 'emitida')
     RETURNING id`,
    ['F-2026-002', osSeedId('OSDE')],
  );
  const facId2 = facRows2[0].id;

  await client.query(
    `INSERT INTO detalles_factura
       ("facturaId", "internacionId", "practicaId", "prestadorId", "valorFacturado", "copagoPrecobrado", estado)
     VALUES ($1, $2, $3, $4, 36000, 0, 'facturado')`,
    [facId2, internIds[1], pracNomIdFn('110101'), profId('MP-4587')],
  );
  await client.query(
    `INSERT INTO detalles_factura
       ("facturaId", "internacionId", "practicaId", "prestadorId", "valorFacturado", "copagoPrecobrado", estado)
     VALUES ($1, $2, $3, $4, 6000, 0, 'facturado')`,
    [facId2, internIds[1], pracNomIdFn('040201'), profId('MP-4587')],
  );
  console.log(`  ✓ Factura F-2026-002 (OSDE, marzo 2026) — $42.000 — 2 detalles`);

  await client.end();

  console.log('\n════════════════════════════════════════════════════════');
  console.log(' Seed completado. Podés iniciar sesión en:');
  console.log(' http://localhost:3000/api/docs  (Swagger)');
  console.log(' http://localhost:5173           (Frontend)');
  console.log('');
  console.log(' Usuarios de prueba:');
  console.log('   admin       / admin123   (administrador)');
  console.log('   mesa1       / mesa123    (mesa de entradas)');
  console.log('   dr_gomez    / medico123  (médico)');
  console.log('   enf_torres  / enf123     (enfermería)');
  console.log('   fact1       / fact123    (facturación)');
  console.log('   botiquin1   / bot123     (botiquín)');
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
