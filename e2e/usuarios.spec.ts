import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const USERNAME_TEST = `e2e_user_${Date.now()}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Usuarios del sistema — gestión admin', () => {
  let usuarioId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.post(`${BACKEND}/auth/usuarios`, {
      data: {
        username: USERNAME_TEST,
        password: 'test12345',
        nombreCompleto: 'Usuario E2E Test',
        rol: 'enfermeria',
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    usuarioId = created.id;
  });

  test('admin ve lista de usuarios y botón Nuevo Usuario', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/usuarios');

    await expect(page.getByRole('button', { name: 'Nuevo Usuario' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nombre Completo' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Rol' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  });

  test('admin puede crear un nuevo usuario', async ({ page }) => {
    const username = `e2e_new_${Date.now()}`;
    await loginAs(page, 'admin');
    await page.goto('/usuarios');

    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await expect(page.getByRole('dialog', { name: 'Crear Usuario' })).toBeVisible();

    await page.getByLabel('Nombre Completo').fill('Nuevo Usuario E2E');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Contraseña').fill('nueva123');

    // Seleccionar rol
    await page.getByLabel('Rol').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Facturación').click();

    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar nombre y rol de un usuario', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/usuarios');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(USERNAME_TEST).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(USERNAME_TEST)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: USERNAME_TEST });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog', { name: 'Editar Usuario' })).toBeVisible();

    const nombreInput = page.getByLabel('Nombre Completo');
    await nombreInput.clear();
    await nombreInput.fill('Usuario E2E — Actualizado');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar Usuario' })).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede desactivar un usuario', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/usuarios');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(USERNAME_TEST).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(USERNAME_TEST)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: USERNAME_TEST });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog', { name: 'Editar Usuario' })).toBeVisible();

    // El switch Estado aparece solo al editar
    await page.getByRole('dialog').getByRole('switch').click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar Usuario' })).not.toBeVisible({ timeout: 8000 });

    // Re-navegar si el usuario queda fuera de la vista tras reload
    await page.waitForTimeout(500);
    for (let i = 0; i < 5; i++) {
      if (await page.getByText(USERNAME_TEST).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    const filaActualizada = page.locator('table tbody tr').filter({ hasText: USERNAME_TEST });
    await expect(filaActualizada.locator('.ant-tag-red')).toBeVisible();
  });

  test('admin propio muestra "tu cuenta" en lugar de botón editar', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/usuarios');

    // Buscar la fila del usuario admin
    const filaAdmin = page.locator('table tbody tr').filter({ hasText: 'admin' }).first();
    await expect(filaAdmin.getByText('tu cuenta')).toBeVisible();
    await expect(filaAdmin.getByRole('button')).not.toBeVisible();
  });
});
