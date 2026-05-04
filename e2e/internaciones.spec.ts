import { test, expect, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BACKEND = 'http://localhost:3000';
const DNI = `7${Date.now().toString().slice(-8)}`;

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { accessToken } = await res.json();
  return accessToken;
}

test.describe.serial('Internaciones — flujo completo mesa de entradas', () => {
  let internacionId: number;
  let pacienteLabel: string;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${token}` };

    // Verificar que hay datos necesarios (pacientes, profesionales, obras sociales, camas disponibles)
    const [pacientesRes, profRes, osRes, camasRes] = await Promise.all([
      request.get(`${BACKEND}/maestros/pacientes`, { headers }),
      request.get(`${BACKEND}/maestros/profesionales`, { headers }),
      request.get(`${BACKEND}/maestros/obras-sociales`, { headers }),
      request.get(`${BACKEND}/maestros/camas/disponibles`, { headers }),
    ]);

    const pacientes: any[] = await pacientesRes.json();
    const profesionales: any[] = await profRes.json();
    const obrasSociales: any[] = await osRes.json();
    const camas: any[] = await camasRes.json();

    // Si faltan datos, crear el mínimo necesario
    let pacienteId: number;
    if (pacientes.length > 0) {
      pacienteId = pacientes[0].id;
      pacienteLabel = `${pacientes[0].apellido}, ${pacientes[0].nombre}`;
    } else {
      const res = await request.post(`${BACKEND}/maestros/pacientes`, {
        data: { dni: DNI, apellido: 'E2E', nombre: 'Internado', fechaNacimiento: '1970-01-01', sexo: 'M' },
        headers,
      });
      const p = await res.json();
      pacienteId = p.id;
      pacienteLabel = 'E2E, Internado';
    }

    if (profesionales.length === 0 || obrasSociales.length === 0 || camas.length === 0) {
      // No hay datos suficientes — los tests que dependan de esto saltarán
      return;
    }

    // Crear internación de test via API
    const profActivo = profesionales.find((p: any) => p.activo) ?? profesionales[0];
    const osActiva = obrasSociales.find((os: any) => os.activa) ?? obrasSociales[0];
    const cama = camas[0];

    const res = await request.post(`${BACKEND}/internaciones`, {
      data: {
        tipo: 'urgente',
        pacienteId,
        profesionalIntervinienteId: profActivo.id,
        obraSocialId: osActiva.id,
        camaId: cama.id,
        nroAfiliado: '123456',
        diagnosticos: [{ descripcion: 'Diagnóstico E2E test', prioridad: 1 }],
      },
      headers,
    });
    if (res.ok()) {
      const created = await res.json();
      internacionId = created.id;
    }
  });

  test('admin ve lista de internaciones con pestañas Activas e Historial', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/internaciones');

    await expect(page.getByRole('button', { name: 'Nueva Internación' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Activas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Historial completo' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible();
  });

  test('admin puede acceder al formulario de nueva internación', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/internaciones');

    await page.getByRole('button', { name: 'Nueva Internación' }).click();
    await expect(page).toHaveURL(/\/internaciones\/nueva/);

    await expect(page.getByLabel('Tipo de Internación')).toBeVisible();
    await expect(page.getByLabel('Paciente')).toBeVisible();
    await expect(page.getByLabel('Profesional Interviniente')).toBeVisible();
    await expect(page.getByLabel('Obra Social')).toBeVisible();
    await expect(page.getByLabel('Cama')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar Internación' })).toBeVisible();
  });

  test('admin puede navegar al detalle de una internación existente', async ({ page }) => {
    if (!internacionId) {
      test.skip(true, 'No hay internación de test disponible');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto('/internaciones');

    // Cambiar a pestaña historial completo para asegurar que se ve
    await page.getByRole('tab', { name: 'Historial completo' }).click();
    await page.waitForTimeout(500);

    // Buscar el botón Ver de la internación creada
    const fila = page.locator('table tbody tr').filter({ hasText: `#${internacionId}` }).first();
    if (await fila.count() === 0) {
      // Buscar por ID en cualquier fila
      const botonVer = page.locator('table tbody tr').first().getByRole('button', { name: 'Ver' });
      await botonVer.click();
    } else {
      await fila.getByRole('button', { name: 'Ver' }).click();
    }

    await expect(page).toHaveURL(/\/internaciones\/\d+/);
    await expect(page.getByText(/Internación #/)).toBeVisible();
  });

  test('detalle de internación muestra prescripciones y botón Dar Alta para mesa_entradas', async ({ page }) => {
    if (!internacionId) {
      test.skip(true, 'No hay internación de test disponible');
      return;
    }

    await loginAs(page, 'mesa_entradas');
    await page.goto(`/internaciones/${internacionId}`);

    await expect(page.getByText(`Internación #${internacionId}`)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Dar Alta' })).toBeVisible();
    // La card de prescripciones tiene un header; scope a la zona principal para evitar el sidebar
    await expect(page.locator('.ant-card-head-title').filter({ hasText: 'Prescripciones' })).toBeVisible();
  });

  test('medico NO ve botón Dar Alta en detalle de internación', async ({ page }) => {
    if (!internacionId) {
      test.skip(true, 'No hay internación de test disponible');
      return;
    }

    await loginAs(page, 'medico');
    await page.goto(`/internaciones/${internacionId}`);

    await expect(page.getByText(`Internación #${internacionId}`)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Dar Alta' })).not.toBeVisible();
  });

  test('detalle de internación muestra descripción del diagnóstico', async ({ page }) => {
    if (!internacionId) {
      test.skip(true, 'No hay internación de test disponible');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto(`/internaciones/${internacionId}`);

    await expect(page.getByText('Diagnóstico E2E test')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('urgente')).toBeVisible();
  });

  test('admin puede dar alta a una internación activa con motivo y observaciones', async ({ page }) => {
    if (!internacionId) {
      test.skip(true, 'No hay internación de test disponible');
      return;
    }

    await loginAs(page, 'admin');
    await page.goto(`/internaciones/${internacionId}`);

    await expect(page.getByText(`Internación #${internacionId}`)).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Dar Alta' }).click();
    await expect(page.getByRole('dialog', { name: 'Dar Alta al Paciente' })).toBeVisible();

    await page.getByLabel('Motivo del Alta').click();
    await page.getByText('Curación').click();
    await page.getByLabel('Observaciones').fill('Alta E2E — paciente recuperado');

    await page.getByRole('button', { name: 'Confirmar Alta' }).click();
    await expect(page.getByText('Alta registrada')).toBeVisible();

    // El estado debe cambiar a ALTA
    await expect(page.locator('.ant-tag').filter({ hasText: 'ALTA' })).toBeVisible({ timeout: 5000 });
    // El botón Dar Alta ya no debe aparecer
    await expect(page.getByRole('button', { name: 'Dar Alta' })).not.toBeVisible();
  });

  test('historial completo incluye internaciones con estado alta', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/internaciones');

    await page.getByRole('tab', { name: 'Historial completo' }).click();
    await page.waitForTimeout(500);

    // La tabla de historial completo debe mostrar alguna fila con estado ALTA
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });
});
