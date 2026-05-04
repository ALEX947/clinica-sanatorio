import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const MATRICULA = `MP-E2E-${Date.now()}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Tipos de Profesión — gestión admin', () => {
  let tipoId: number;
  const TIPO_NOMBRE = `Tipo-E2E-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.post(`${BACKEND}/maestros/profesionales/tipos-profesion`, {
      data: { nombre: TIPO_NOMBRE, descripcion: 'Tipo creado para E2E' },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    tipoId = created.id;
  });

  test('admin ve botón Nuevo Tipo y tabla', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/tipos-profesion');

    await expect(page.getByRole('button', { name: 'Nuevo Tipo' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
  });

  test('admin puede crear un tipo de profesión', async ({ page }) => {
    const nombre = `TipoProf-${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/tipos-profesion');

    await page.getByRole('button', { name: 'Nuevo Tipo' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Tipo de Profesión' })).toBeVisible();

    await page.getByLabel('Nombre').fill(nombre);
    await page.getByLabel('Descripción').fill('Descripción E2E');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar un tipo de profesión existente', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/tipos-profesion');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(TIPO_NOMBRE).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(TIPO_NOMBRE)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: TIPO_NOMBRE });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const descInput = page.getByLabel('Descripción');
    await descInput.clear();
    await descInput.fill('Descripción actualizada E2E');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });
});

test.describe.serial('Profesionales — gestión admin', () => {
  let primerTipoId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    // Obtener primer tipo de profesión disponible
    const res = await request.get(`${BACKEND}/maestros/profesionales/tipos-profesion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tipos: any[] = await res.json();
    if (tipos.length > 0) primerTipoId = tipos[0].id;

    if (!primerTipoId) return;

    // Crear profesional de test
    await request.post(`${BACKEND}/maestros/profesionales`, {
      data: {
        apellido: 'E2E',
        nombre: 'Profesional',
        matricula: MATRICULA,
        tipoProfesionId: primerTipoId,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('admin ve botón Nuevo Profesional y columna Estado', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/profesionales');

    await expect(page.getByRole('button', { name: 'Nuevo Profesional' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  });

  test('no-admin no ve botón Nuevo Profesional', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/maestros/profesionales');
    await expect(page.getByRole('button', { name: 'Nuevo Profesional' })).not.toBeVisible();
  });

  test('admin puede crear un nuevo profesional', async ({ page }) => {
    if (!primerTipoId) {
      test.skip(true, 'No hay tipos de profesión en la DB');
      return;
    }

    const matriculaNueva = `MP-NEW-${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/profesionales');

    await page.getByRole('button', { name: 'Nuevo Profesional' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Profesional' })).toBeVisible();

    await page.getByLabel('Apellido').fill('Test');
    await page.getByLabel('Nombre').fill('Profesional');
    await page.getByLabel('Matrícula').fill(matriculaNueva);
    // Seleccionar tipo de profesión
    await page.getByLabel('Tipo de Profesión').click();
    await page.locator('.ant-select-dropdown').locator('.ant-select-item').first().click();
    await page.getByLabel('Teléfono').fill('0387-4333333');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar teléfono de un profesional', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/profesionales');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(MATRICULA).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(MATRICULA)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: MATRICULA });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Apellido y Nombre deben estar deshabilitados al editar
    await expect(page.getByLabel('Apellido')).toBeDisabled();
    await expect(page.getByLabel('Matrícula')).toBeDisabled();

    await page.getByLabel('Teléfono').clear();
    await page.getByLabel('Teléfono').fill('0387-4444444');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Profesional actualizado')).toBeVisible();
  });

  test('admin puede desactivar un profesional', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/profesionales');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(MATRICULA).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(MATRICULA)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: MATRICULA });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // El switch Estado aparece solo al editar
    await page.getByRole('dialog').getByRole('switch').click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Profesional actualizado')).toBeVisible();

    // Debe mostrar INACTIVO en la fila
    await page.waitForTimeout(400);
    const filaActualizada = page.locator('table tbody tr').filter({ hasText: MATRICULA });
    await expect(filaActualizada.locator('.ant-tag-red')).toBeVisible();
  });
});
