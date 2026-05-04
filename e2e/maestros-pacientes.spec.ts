import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const DNI = `9${Date.now().toString().slice(-8)}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Pacientes — gestión mesa de entradas', () => {
  let pacienteId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.post(`${BACKEND}/maestros/pacientes`, {
      data: {
        dni: DNI,
        apellido: 'E2E',
        nombre: 'Paciente',
        fechaNacimiento: '1990-05-15',
        sexo: 'M',
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    pacienteId = created.id;
  });

  test('admin ve botón Nuevo Paciente y la tabla de pacientes', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/pacientes');

    await expect(page.getByRole('button', { name: 'Nuevo Paciente' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DNI' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Apellido' })).toBeVisible();
  });

  test('mesa_entradas ve botón Nuevo Paciente', async ({ page }) => {
    await loginAs(page, 'mesa_entradas');
    await page.goto('/maestros/pacientes');
    await expect(page.getByRole('button', { name: 'Nuevo Paciente' })).toBeVisible();
  });

  test('enfermería no ve botón Nuevo Paciente', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/maestros/pacientes');
    await expect(page.getByRole('button', { name: 'Nuevo Paciente' })).not.toBeVisible();
  });

  test('admin puede registrar un nuevo paciente', async ({ page }) => {
    const dniNuevo = `8${Date.now().toString().slice(-8)}`;
    await loginAs(page, 'admin');
    await page.goto('/maestros/pacientes');

    await page.getByRole('button', { name: 'Nuevo Paciente' }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar Paciente' })).toBeVisible();

    await page.getByLabel('DNI').fill(dniNuevo);
    await page.getByLabel('Apellido').fill('García');
    await page.getByLabel('Nombre').fill('Test E2E');
    // DatePicker — click the input and type
    await page.locator('.ant-picker input').click();
    await page.locator('.ant-picker input').fill('15/06/1985');
    await page.keyboard.press('Enter');
    // Seleccionar sexo
    await page.getByLabel('Sexo').click();
    await page.getByText('Masculino').click();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
  });

  test('admin puede editar domicilio de un paciente existente', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/pacientes');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(DNI).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(DNI)).toBeVisible({ timeout: 5000 });

    const fila = page.locator('table tbody tr').filter({ hasText: DNI });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Domicilio').clear();
    await page.getByLabel('Domicilio').fill('Av. Siempre Viva 123');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Paciente actualizado')).toBeVisible();
  });

  test('DNI no es editable al editar un paciente (campo deshabilitado)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/pacientes');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible' });

    for (let i = 0; i < 5; i++) {
      if (await page.getByText(DNI).isVisible()) break;
      const nextBtn = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)');
      if (!await nextBtn.isVisible()) break;
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(DNI)).toBeVisible({ timeout: 5000 });
    const fila = page.locator('table tbody tr').filter({ hasText: DNI });
    await fila.getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // El campo DNI debe estar deshabilitado al editar (según spec: datos identificatorios son inmutables)
    const dniInput = page.getByLabel('DNI');
    await expect(dniInput).toBeDisabled();
  });
});
