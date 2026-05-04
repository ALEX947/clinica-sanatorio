import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const CODIGO = `E2E-${Date.now()}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Nomenclador INOS — gestión admin', () => {
  let practicaId: number;
  let primeraObraSocialId: number;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Crear práctica de test via API
    const res = await request.post(`${BACKEND}/maestros/nomenclador`, {
      data: { codigo: CODIGO, descripcion: 'Práctica E2E Test', especialidad: 'Test' },
      headers,
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    practicaId = created.id;

    // Obtener primera obra social activa para tests de aranceles
    const osRes = await request.get(`${BACKEND}/maestros/obras-sociales`, { headers });
    const obrasSociales: any[] = await osRes.json();
    const activa = obrasSociales.find((os) => os.activa);
    if (activa) primeraObraSocialId = activa.id;
  });

  test('admin ve botones Nueva Práctica y columna Acciones', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await expect(page.getByRole('button', { name: 'Nueva Práctica' })).toBeVisible();

    // Buscar la práctica creada para confirmar que la columna Acciones aparece
    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    const fila = page.locator('table tbody tr').first();
    await expect(fila).toBeVisible();
    // Debe tener los dos botones de acción (editar y aranceles)
    await expect(fila.getByRole('button')).toHaveCount(2);
  });

  test('admin puede editar descripción y especialidad de una práctica', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    // Botón editar (primero de la fila)
    await page.locator('table tbody tr').first().getByRole('button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const descInput = page.getByLabel('Descripción');
    await descInput.clear();
    await descInput.fill('Práctica E2E — descripción actualizada');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Práctica actualizada')).toBeVisible();
    await expect(page.getByText('Práctica E2E — descripción actualizada')).toBeVisible();
  });

  test('admin puede desactivar una práctica y verla con el switch "Mostrar inactivos"', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    // Abrir modal de edición
    await page.locator('table tbody tr').first().getByRole('button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Toggle switch "Activo" → inactivo (dentro del dialog)
    await page.getByRole('dialog').getByRole('switch').click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Práctica actualizada')).toBeVisible();

    // Ya no debe aparecer en la lista normal
    await page.waitForTimeout(400);
    await expect(page.getByText(CODIGO)).not.toBeVisible();

    // Activar "Mostrar inactivos" → debe reaparecer con tag INACTIVO
    await page.locator('.ant-space').filter({ hasText: 'Mostrar inactivos' }).getByRole('switch').click();
    await page.waitForTimeout(600);
    await expect(page.getByText(CODIGO)).toBeVisible();
    await expect(page.locator('table .ant-tag-red')).toBeVisible();

    // Reactivar para los tests siguientes
    await page.locator('table tbody tr').first().getByRole('button').first().click();
    await page.getByRole('dialog').getByRole('switch').click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Práctica actualizada')).toBeVisible();
  });

  test('admin puede abrir el modal de aranceles de una práctica', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    // Botón aranceles (segundo de la fila)
    await page.locator('table tbody tr').first().getByRole('button').nth(1).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Nuevo Arancel')).toBeVisible();
    await expect(page.getByText('Sin aranceles definidos')).toBeVisible();
  });

  test('admin puede crear un arancel para una práctica', async ({ page }) => {
    if (!primeraObraSocialId) {
      test.skip(true, 'No hay obras sociales activas en la DB');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    await page.locator('table tbody tr').first().getByRole('button').nth(1).click();
    await expect(page.getByText('Nuevo Arancel')).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo Arancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Nuevo Arancel' })).toBeVisible();

    // Seleccionar obra social
    await page.getByLabel('Obra Social').click();
    await page.locator('.ant-select-dropdown').locator('.ant-select-item').first().click();

    await page.getByLabel('Valor Arancel ($)').click();
    await page.getByLabel('Valor Arancel ($)').fill('1500');

    await page.getByLabel('% Copago').click();
    await page.getByLabel('% Copago').fill('10');

    await page.getByLabel('Vigencia Desde').fill('2026-01-01');

    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Arancel registrado')).toBeVisible();
    await expect(page.getByText('$1500.00')).toBeVisible();
  });

  test('admin puede editar el valor de un arancel existente', async ({ page }) => {
    if (!primeraObraSocialId) {
      test.skip(true, 'No hay obras sociales activas en la DB');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    await page.locator('table tbody tr').first().getByRole('button').nth(1).click();
    await expect(page.getByText('Nuevo Arancel')).toBeVisible();
    await page.waitForTimeout(400);

    const arancelRows = page.locator('.ant-modal-body table tbody tr');
    const count = await arancelRows.count();
    if (count === 0) {
      test.skip(true, 'No hay aranceles para editar');
      return;
    }

    // Botón editar del primer arancel
    await arancelRows.first().getByRole('button').first().click();
    await expect(page.getByRole('dialog', { name: 'Editar Arancel' })).toBeVisible();

    const valorInput = page
      .getByRole('dialog', { name: 'Editar Arancel' })
      .locator('.ant-form-item')
      .filter({ hasText: 'Valor Arancel' })
      .locator('input');
    await valorInput.click({ clickCount: 3 });
    await valorInput.fill('2000');
    await page.keyboard.press('Tab');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Arancel actualizado')).toBeVisible();
    await expect(page.getByText('$2000.00')).toBeVisible();
  });

  test('admin puede eliminar un arancel', async ({ page }) => {
    if (!primeraObraSocialId) {
      test.skip(true, 'No hay obras sociales activas en la DB');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/maestros/nomenclador');

    await page.getByPlaceholder('Buscar por código o descripción...').fill(CODIGO);
    await page.getByRole('button', { name: /Buscar/ }).click();
    await page.waitForTimeout(600);

    await page.locator('table tbody tr').first().getByRole('button').nth(1).click();
    await expect(page.getByText('Nuevo Arancel')).toBeVisible();
    await page.waitForTimeout(400);

    const arancelRows = page.locator('.ant-modal-body table tbody tr');
    const count = await arancelRows.count();
    if (count === 0) {
      test.skip(true, 'No hay aranceles para eliminar');
      return;
    }

    // Botón eliminar (segundo botón = danger)
    await arancelRows.first().getByRole('button').nth(1).click();
    // Confirmar popconfirm
    await page.getByRole('button', { name: 'Sí' }).click();

    await expect(page.getByText('Arancel eliminado')).toBeVisible();
  });

  test('usuario no-admin no ve botones de gestión', async ({ page }) => {
    await loginAs(page, 'enfermeria');
    await page.goto('/maestros/nomenclador');

    await expect(page.getByRole('button', { name: 'Nueva Práctica' })).not.toBeVisible();
    // La columna "Acciones" no debe existir
    await expect(page.getByText('Acciones')).not.toBeVisible();
  });
});
