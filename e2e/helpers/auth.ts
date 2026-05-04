import { Page } from '@playwright/test';

const BACKEND = 'http://localhost:3000';

const USERS = {
  admin:         { username: 'admin',      password: 'admin123'  },
  enfermeria:    { username: 'enf_torres', password: 'enf123'    },
  mesa_entradas: { username: 'mesa1',      password: 'mesa123'   },
  facturacion:   { username: 'fact1',      password: 'fact123'   },
  botiquin:      { username: 'botiquin1',  password: 'bot123'    },
  medico:        { username: 'dr_gomez',   password: 'medico123' },
} as const;

export type Rol = keyof typeof USERS;

export async function loginAs(page: Page, rol: Rol) {
  const { username, password } = USERS[rol];
  const res = await page.request.post(`${BACKEND}/auth/login`, {
    data: { username, password },
  });
  const { accessToken } = await res.json();
  await page.goto('/');
  await page.evaluate((token: string) => localStorage.setItem('token', token), accessToken);
  await page.reload();
}
