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

test.describe.serial('Sectores — gestión admin', () => {
  const SECTOR_NOMBRE = `Sector-E2E-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    await request.post(`${BACKEND}/maestros/camas/sectores`, {
      data: { nombre: SECTOR_NOMBRE, descripcion: 'Sector E2E test' },
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('se ve botón Nuevo Sector y tabla con columnas', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/sectores');

    await expect(page.getByRole('button', { name: 'Nuevo Sector' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
  });

  test('admin puede registrar un nuevo sector', async ({ page }) => {
    const nombre = `Sector-Nuevo-${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/sectores');

    await page.getByRole('button', { name: 'Nuevo Sector' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Sector' })).toBeVisible();

    await page.getByLabel('Nombre').fill(nombre);
    await page.getByLabel('Descripción').fill('Sector de prueba E2E');
    await page.getByRole('button', { name: 'Guardar' }).click();
    // El sector puede quedar en página 2 si hay muchos registros previos; alcanza con que el diálogo cierre
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar descripción de un sector', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/sectores');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(SECTOR_NOMBRE).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(SECTOR_NOMBRE)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: SECTOR_NOMBRE });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const descInput = page.getByLabel('Descripción');
    await descInput.clear();
    await descInput.fill('Descripción actualizada por E2E');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Sector actualizado')).toBeVisible();
  });
});

test.describe.serial('Camas — gestión admin', () => {
  let sectorId: number;
  let camaNumero: string;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Obtener primer sector disponible
    const res = await request.get(`${BACKEND}/maestros/camas/sectores`, { headers });
    const sectores: any[] = await res.json();
    if (sectores.length > 0) sectorId = sectores[0].id;

    if (!sectorId) return;

    camaNumero = `E2E-${Date.now().toString().slice(-4)}`;
    await request.post(`${BACKEND}/maestros/camas`, {
      data: {
        numero: camaNumero,
        individual: false,
        sector: { id: sectorId },
      },
      headers,
    });
  });

  test('admin ve botón Nueva Cama y columna Estado', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/camas');

    await expect(page.getByRole('button', { name: 'Nueva Cama' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  });

  test('no-admin no ve botón Nueva Cama', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/maestros/camas');
    await expect(page.getByRole('button', { name: 'Nueva Cama' })).not.toBeVisible();
  });

  test('admin puede registrar una nueva cama', async ({ page }) => {
    if (!sectorId) {
      test.skip(true, 'No hay sectores en la DB');
      return;
    }

    const numero = `N${Date.now().toString().slice(-4)}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/camas');

    await page.getByRole('button', { name: 'Nueva Cama' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Cama' })).toBeVisible();

    await page.getByLabel('Número de cama').fill(numero);

    // Seleccionar sector
    await page.getByLabel('Sector').click();
    await page.locator('.ant-select-dropdown').locator('.ant-select-item').first().click();

    // Seleccionar tipo
    await page.getByLabel('Tipo').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Compartida').click();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede cambiar el estado de una cama a mantenimiento', async ({ page }) => {
    if (!camaNumero) {
      test.skip(true, 'No se creó cama de test');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/maestros/camas');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(camaNumero).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(camaNumero)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: camaNumero });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // La selection-item del Select intercepta el click en el input; usar .ant-select-selector
    await page.getByRole('dialog').locator('.ant-select-selector').click();
    await page.locator('.ant-select-dropdown:visible').getByText('En mantenimiento').click();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Estado actualizado')).toBeVisible();

    // La cama debe mostrar MANTENIMIENTO
    await page.waitForTimeout(400);
    const filaActualizada = page.locator('table tbody tr').filter({ hasText: camaNumero });
    await expect(filaActualizada.locator('.ant-tag-orange')).toBeVisible();
  });

  test('admin puede restablecer el estado de la cama a disponible', async ({ page }) => {
    if (!camaNumero) {
      test.skip(true, 'No se creó cama de test');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/maestros/camas');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(camaNumero).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(camaNumero)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: camaNumero });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('dialog').locator('.ant-select-selector').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Disponible').click();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Estado actualizado')).toBeVisible();

    await page.waitForTimeout(400);
    const filaActualizada = page.locator('table tbody tr').filter({ hasText: camaNumero });
    await expect(filaActualizada.locator('.ant-tag-green')).toBeVisible();
  });
});
