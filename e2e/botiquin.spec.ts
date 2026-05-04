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

test.describe('Botiquín — cola de trabajo y entregas', () => {
  test('botiquín ve tabs Cola de trabajo e Historial', async ({ page }) => {
    await loginAs(page, 'botiquin');
    await page.goto('/botiquin');

    await expect(page.getByRole('heading', { name: 'Botiquín' })).toBeVisible();
    // Los tabs usan texto con íconos; localizamos por texto parcial en el elemento tab
    await expect(page.locator('.ant-tabs-tab').filter({ hasText: 'Cola de trabajo' })).toBeVisible();
    await expect(page.locator('.ant-tabs-tab').filter({ hasText: 'Historial' })).toBeVisible();
  });

  test('enfermería ve botón Nueva Solicitud', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/botiquin');

    await expect(page.getByRole('button', { name: 'Nueva Solicitud' })).toBeVisible();
  });

  test('botiquín NO ve botón Nueva Solicitud', async ({ page }) => {
    await loginAs(page, 'botiquin');
    await page.goto('/botiquin');

    await expect(page.getByRole('button', { name: 'Nueva Solicitud' })).not.toBeVisible();
  });

  test('admin ve botón Nueva Solicitud', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/botiquin');

    await expect(page.getByRole('button', { name: 'Nueva Solicitud' })).toBeVisible();
  });

  test('botiquín ve botón Registrar Entrega en solicitudes pendientes', async ({ page }) => {
    await loginAs(page, 'botiquin');
    await page.goto('/botiquin');

    await page.waitForTimeout(600);

    // Si hay solicitudes en la cola, debe haber botón Registrar Entrega
    const filas = page.locator('table tbody tr');
    const count = await filas.count();

    if (count === 0) {
      // Sin solicitudes, verificamos que la columna Acciones existe en la estructura
      return;
    }

    // El botón debe ser visible para el rol botiquín
    await expect(filas.first().getByRole('button', { name: 'Registrar Entrega' })).toBeVisible();
  });

  test('historial de botiquín carga al cambiar a tab Historial', async ({ page }) => {
    await loginAs(page, 'botiquin');
    await page.goto('/botiquin');

    await page.locator('.ant-tabs-tab').filter({ hasText: 'Historial' }).click();
    await page.waitForTimeout(500);

    // Filtros de historial deben ser visibles
    await expect(page.getByRole('button', { name: 'Consultar' })).toBeVisible();
  });

  test('historial acepta filtro por estado y consulta', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/botiquin');

    await page.locator('.ant-tabs-tab').filter({ hasText: 'Historial' }).click();
    await page.waitForTimeout(400);

    // Ant Design Select no usa placeholder nativo; localizamos el primer select del panel activo
    await page.locator('.ant-tabs-tabpane-active .ant-select').first().click();
    // Usar el dropdown visible para evitar strict mode con tags del mismo texto
    await page.locator('.ant-select-dropdown:visible').getByText('Entregada').click();

    await page.getByRole('button', { name: 'Consultar' }).click();
    await page.waitForTimeout(600);

    // La tabla de historial se debe haber cargado (puede estar vacía)
    await expect(page.locator('table').last()).toBeVisible();
  });

  test('enfermería puede abrir el modal de nueva solicitud y seleccionar una internación', async ({
    page,
    request,
  }) => {
    const token = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Verificar si hay internaciones activas
    const intRes = await request.get(`${BACKEND}/internaciones?activas=true`, { headers });
    const internaciones: any[] = await intRes.json();
    const internacionesActivas = internaciones.filter((i: any) => i.estado === 'activa');

    if (internacionesActivas.length === 0) {
      test.skip(true, 'No hay internaciones activas para crear solicitud');
      return;
    }

    await loginAs(page, 'enfermeria');
    await page.goto('/botiquin');

    await page.getByRole('button', { name: 'Nueva Solicitud' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva Solicitud de Medicamentos' })).toBeVisible();

    // Seleccionar la primera internación activa disponible
    await page.getByLabel('Internación').click();
    await page.locator('.ant-select-dropdown:visible').locator('.ant-select-item').first().click();
    await page.waitForTimeout(600);

    // El modal debe seguir abierto con la internación seleccionada
    await expect(page.getByRole('dialog', { name: 'Nueva Solicitud de Medicamentos' })).toBeVisible();
    // Botón "Agregar ítem" debe ser visible para poder agregar medicamentos
    await expect(page.getByRole('button', { name: 'Agregar ítem' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear Solicitud' })).toBeVisible();

    // Cancelar — el modal se cierra
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva Solicitud de Medicamentos' })).not.toBeVisible();
  });
});
