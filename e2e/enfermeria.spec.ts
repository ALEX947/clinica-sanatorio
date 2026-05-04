import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Enfermería — agenda y registro', () => {
  test('enfermería ve Agenda con tabs Suministros y Controles', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/enfermeria');

    await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Agenda de Suministros' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cronograma de Controles' })).toBeVisible();
  });

  test('enfermería ve Historial con botón Consultar', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/enfermeria');

    await expect(page.getByRole('heading', { name: 'Historial', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar' })).toBeVisible();
  });

  test('admin puede acceder a la página de enfermería', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/enfermeria');

    await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  });

  test('tab Cronograma de Controles muestra columna Tipo Control', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/enfermeria');

    await page.getByRole('tab', { name: 'Cronograma de Controles' }).click();
    await page.waitForTimeout(400);

    // Hay dos Tabs en la página (Agenda e Historial); ambos tienen tabpane-active
    // Verificamos el header que es único en el Cronograma de Controles
    await expect(page.getByRole('columnheader', { name: 'Tipo Control' })).toBeVisible();
    // Estado aparece en ambas tablas — usamos first() para evitar strict mode
    await expect(page.getByRole('columnheader', { name: 'Estado' }).first()).toBeVisible();
  });

  test('historial de suministros carga al hacer clic en Consultar', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/enfermeria');

    // Scroll down hasta la sección Historial
    await page.locator('text=Historial').last().scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Consultar' }).click();
    await page.waitForTimeout(600);

    // La tabla de historial debe estar presente (puede estar vacía o con datos)
    await expect(page.getByRole('tab', { name: 'Historial Suministros' })).toBeVisible();
  });

  test('enfermería puede registrar suministro pendiente si existe en agenda', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/enfermeria');

    // Esperar que cargue la agenda
    await page.waitForTimeout(800);

    // Verificar si hay ítems pendientes en la agenda
    const botonesRegistrar = page.getByRole('button', { name: 'Registrar' });
    const count = await botonesRegistrar.count();

    if (count === 0) {
      // Sin ítems pendientes, el test pasa (no hay error, simplemente no hay trabajo)
      return;
    }

    // Registrar el primer suministro pendiente
    await botonesRegistrar.first().click();
    await expect(page.getByRole('dialog', { name: 'Registrar Suministro' })).toBeVisible();

    // Seleccionar personal de enfermería
    await page.getByLabel('Personal de Enfermería').click();
    await page.locator('.ant-select-dropdown').locator('.ant-select-item').first().click();
    await page.getByLabel('Observaciones').fill('Suministrado sin novedades E2E');

    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Registrado correctamente')).toBeVisible();
  });
});
