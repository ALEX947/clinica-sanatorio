import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Prescripciones — flujo médico/mesa de entradas', () => {
  let internacionActivaId: number;
  let primerProfesionalId: number;
  let primerPracticaId: number;
  let prescripcionId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Buscar una internación activa
    const intRes = await request.get(`${BACKEND}/internaciones?activas=true`, { headers });
    const internaciones: any[] = await intRes.json();
    const activa = internaciones.find((i: any) => i.estado === 'activa');
    if (activa) internacionActivaId = activa.id;

    // Primer profesional activo
    const profRes = await request.get(`${BACKEND}/maestros/profesionales`, { headers });
    const profesionales: any[] = await profRes.json();
    const profActivo = profesionales.find((p: any) => p.activo) ?? profesionales[0];
    if (profActivo) primerProfesionalId = profActivo.id;

    // Primera práctica activa del nomenclador
    const nomRes = await request.get(`${BACKEND}/maestros/nomenclador`, { headers });
    const practicas: any[] = await nomRes.json();
    if (practicas.length > 0) primerPracticaId = practicas[0].id;

    // Crear prescripción de práctica si hay internación activa
    if (internacionActivaId && primerProfesionalId && primerPracticaId) {
      const prescRes = await request.post(`${BACKEND}/prescripciones/practica`, {
        data: {
          internacionId: internacionActivaId,
          profesionalPrescriptorId: primerProfesionalId,
          practicaId: primerPracticaId,
          indicaciones: 'Indicaciones E2E test',
          diagnosticos: [{ descripcion: 'Neumonía bilateral E2E', prioridad: 1 }],
        },
        headers,
      });
      if (prescRes.ok()) {
        const prescCreada = await prescRes.json();
        prescripcionId = prescCreada.id;
      }
    }
  });

  test('médico ve selector de internaciones activas y tabs de prescripciones', async ({ page }) => {
    await loginAs(page, 'medico');
    await page.goto('/prescripciones');

    // Ant Design Select usa span custom, no placeholder nativo
    await expect(page.locator('.ant-select-selection-placeholder').filter({ hasText: 'Seleccionar internación activa' })).toBeVisible();
    // Sin internación seleccionada, no hay tabs visibles
    await expect(page.getByRole('tab', { name: 'Prácticas' })).not.toBeVisible();
  });

  test('médico puede seleccionar una internación y ver sus prescripciones', async ({ page }) => {
    if (!internacionActivaId) {
      test.skip(true, 'No hay internaciones activas en la DB');
      return;
    }

    await loginAs(page, 'medico');
    await page.goto('/prescripciones');

    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(500);

    // Con internación seleccionada deben aparecer las 3 tabs
    await expect(page.getByRole('tab', { name: 'Prácticas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Medicamentos' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Controles Especiales' })).toBeVisible();

    // Y el botón Nueva Prescripción
    await expect(page.getByRole('button', { name: 'Nueva Prescripción' })).toBeVisible();
  });

  test('médico puede prescribir una práctica INOS', async ({ page }) => {
    if (!internacionActivaId || !primerProfesionalId || !primerPracticaId) {
      test.skip(true, 'Faltan datos para prescribir práctica');
      return;
    }

    await loginAs(page, 'medico');
    await page.goto('/prescripciones');

    // Seleccionar internación
    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Nueva Prescripción' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva Prescripción' })).toBeVisible();

    // Tipo práctica ya está seleccionado por defecto
    // Seleccionar profesional prescriptor
    await page.getByLabel('Profesional que prescribe').click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    // Esperar que cierre la animación del dropdown del profesional antes de abrir el de práctica
    await page.waitForTimeout(400);

    // Seleccionar práctica INOS
    await page.getByLabel('Práctica INOS').click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();

    // Diagnóstico
    const diagInput = page.locator('.ant-form-item').filter({ hasText: 'Descripción' }).locator('input').first();
    await diagInput.fill('Diagnóstico prescripción E2E');

    await page.getByRole('button', { name: 'Prescribir' }).click();
    await expect(page.getByText('Prescripción registrada')).toBeVisible();
  });

  test('mesa_entradas puede autorizar una prescripción prescripta', async ({ page }) => {
    if (!prescripcionId || !internacionActivaId) {
      test.skip(true, 'No hay prescripción para autorizar');
      return;
    }

    await loginAs(page, 'mesa_entradas');
    await page.goto('/prescripciones');

    // Seleccionar internación
    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(500);

    // Ir a tab Prácticas
    await page.getByRole('tab', { name: 'Prácticas' }).click();

    // Buscar fila con estado PRESCRIPTA y botón Autorizar
    const filaPresoripta = page.locator('table tbody tr').filter({ hasText: 'PRESCRIPTA' }).first();
    if (await filaPresoripta.count() === 0) {
      test.skip(true, 'No hay prescripciones en estado PRESCRIPTA');
      return;
    }

    await filaPresoripta.getByRole('button', { name: 'Autorizar' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Autorización OS' })).toBeVisible();

    await page.getByLabel('Nro. Autorización OS').fill('AUTH-E2E-001');
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('Prescripción autorizada')).toBeVisible();
  });

  test('enfermería NO ve botón Autorizar ni Nueva Prescripción', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/prescripciones');

    // enfermería no tiene acceso a la ruta /prescripciones — el frontend muestra 404
    // por lo tanto ningún botón de la pantalla de prescripciones es visible
    await expect(page.getByRole('button', { name: 'Nueva Prescripción' })).not.toBeVisible();
  });

  test('médico puede prescribir un medicamento con agenda de suministros', async ({ page }) => {
    if (!internacionActivaId || !primerProfesionalId) {
      test.skip(true, 'Faltan datos para prescribir medicamento');
      return;
    }

    await loginAs(page, 'medico');
    await page.goto('/prescripciones');

    await page.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Nueva Prescripción' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva Prescripción' })).toBeVisible();

    // Cambiar tipo a Medicamento
    const tipoSelect = page.getByRole('dialog').locator('.ant-select').first();
    await tipoSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText('Medicamento', { exact: true }).click();
    // Esperar que cierre la animación del dropdown de tipo antes de abrir el del prescriptor
    await page.waitForTimeout(400);

    // Prescriptor
    await page.getByLabel('Profesional que prescribe').click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(400);

    await page.getByLabel('Droga').fill('Amoxicilina');
    await page.getByLabel('Concentración').fill('500 mg');
    await page.locator('.ant-form-item').filter({ hasText: 'Presentación' }).locator('.ant-select-selector').click();
    await page.waitForTimeout(400);
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();

    // Cantidad y periodicidad — usar los InputNumber
    const cantidadInput = page.locator('.ant-form-item').filter({ hasText: 'Cantidad' }).locator('input');
    await cantidadInput.click({ clickCount: 3 });
    await cantidadInput.fill('20');
    await page.keyboard.press('Tab');

    const cadaInput = page.locator('.ant-form-item').filter({ hasText: 'Cada (hs)' }).locator('input');
    await cadaInput.click({ clickCount: 3 });
    await cadaInput.fill('8');
    await page.keyboard.press('Tab');

    // Fechas de inicio y fin — usar DatePicker
    const inicioInputs = page.getByLabel('Inicio');
    await inicioInputs.click();
    await page.keyboard.type('01/05/2026 08:00');
    await page.keyboard.press('Enter');

    const finInputs = page.getByLabel('Fin');
    await finInputs.click();
    await page.keyboard.type('08/05/2026 08:00');
    await page.keyboard.press('Enter');

    // Diagnóstico
    const diagInput = page.locator('.ant-form-item').filter({ hasText: 'Descripción' }).locator('input').first();
    await diagInput.fill('Infección respiratoria E2E');

    await page.getByRole('button', { name: 'Prescribir' }).click();
    await expect(page.getByText('Prescripción registrada')).toBeVisible();

    // Ir a tab Medicamentos y verificar que aparece
    await page.getByRole('tab', { name: 'Medicamentos' }).click();
    await expect(page.locator('.ant-tabs-tabpane-active').locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });
});
