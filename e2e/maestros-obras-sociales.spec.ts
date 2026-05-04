import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const NOMBRE_OS = `OS-E2E-${Date.now()}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Obras Sociales — gestión admin/facturación', () => {
  let obraSocialId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.post(`${BACKEND}/maestros/obras-sociales`, {
      data: { nombre: NOMBRE_OS, cuit: '30-99999999-9' },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    obraSocialId = created.id;
  });

  test('admin ve botón Nueva Obra Social y columna Estado', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/obras-sociales');

    await expect(page.getByRole('button', { name: 'Nueva Obra Social' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  });

  test('facturación ve botón editar pero no Nueva Obra Social', async ({ page }) => {
    await loginAs(page, 'facturacion');
    await page.goto('/maestros/obras-sociales');

    // facturación puede editar pero no crear (solo admin crea)
    await expect(page.getByRole('button', { name: 'Nueva Obra Social' })).not.toBeVisible();
    // La columna de edición sí aparece
    await expect(page.locator('table tbody tr').first().getByRole('button')).toBeVisible();
  });

  test('admin puede registrar una nueva obra social', async ({ page }) => {
    const nombre = `OS-Nueva-${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/obras-sociales');

    await page.getByRole('button', { name: 'Nueva Obra Social' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Obra Social' })).toBeVisible();

    await page.getByLabel('Nombre').fill(nombre);
    await page.getByLabel('CUIT').fill('30-12345678-9');
    await page.getByLabel('Teléfono').fill('0387-4111111');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar datos de una obra social', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/obras-sociales');

    await expect(page.getByText(NOMBRE_OS)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: NOMBRE_OS });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Teléfono').clear();
    await page.getByLabel('Teléfono').fill('0387-4222222');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Obra social actualizada')).toBeVisible();
  });

  test('admin puede desactivar una obra social', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/obras-sociales');

    await expect(page.getByText(NOMBRE_OS)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: NOMBRE_OS });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // El switch Estado (activa/inactiva) aparece solo al editar
    await page.getByRole('dialog').getByRole('switch').click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });

    // El API solo devuelve OS activas; al desactivarla desaparece de la lista
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody tr').filter({ hasText: NOMBRE_OS })).toHaveCount(0);
  });

  test('enfermería no ve botón editar en obras sociales', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/maestros/obras-sociales');
    // No debe haber botones de edición en la tabla
    await expect(page.locator('table tbody tr').first().getByRole('button')).not.toBeVisible();
  });
});
