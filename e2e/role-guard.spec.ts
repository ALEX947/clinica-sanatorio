import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const NOT_FOUND_TEXT = 'Página no encontrada';

test.describe('Role-based route guard', () => {
  test('enfermeria no puede ver /usuarios', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/usuarios');
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    expect(page.url()).toContain('/usuarios');
  });

  test('enfermeria no puede ver /facturacion', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/facturacion');
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  });

  test('admin puede ver /usuarios normalmente', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/usuarios');
    await expect(page.getByText(NOT_FOUND_TEXT)).not.toBeVisible();
    await expect(page.getByText('Usuarios del Sistema')).toBeVisible();
  });

  test('mesa_entradas puede ver /maestros/pacientes pero no /maestros/obras-sociales', async ({ page }) => {
    await loginAs(page, 'mesa_entradas');

    await page.goto('/maestros/pacientes');
    await expect(page.getByText(NOT_FOUND_TEXT)).not.toBeVisible();

    await page.goto('/maestros/obras-sociales');
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  });

  test('enfermeria puede ver sub-ruta /internaciones/:id', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/internaciones/1');
    await expect(page.getByText(NOT_FOUND_TEXT)).not.toBeVisible();
  });

  test('URL inexistente muestra NotFoundPage', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  });

  test('usuario sin sesión es redirigido a /login', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/login/);
  });

  test('enfermeria solo ve en el menú las secciones permitidas', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/');
    await expect(page.getByRole('menuitem', { name: 'Usuarios' })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Facturación' })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Enfermería' })).toBeVisible();
  });
});
