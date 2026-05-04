import { Layout, Menu, Typography, Button, Avatar, Dropdown } from 'antd';
import {
  HomeOutlined, UserOutlined, TeamOutlined,
  MedicineBoxOutlined, FileTextOutlined, ShoppingOutlined,
  HeartOutlined, DollarOutlined, LogoutOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotFoundPage from '../pages/NotFoundPage';

function isRoutePermitted(pathname: string, permitidos: string[]): boolean {
  return permitidos.some(key => {
    if (!key.startsWith('/')) return false;
    return pathname === key || pathname.startsWith(key + '/');
  });
}

const { Header, Sider, Content } = Layout;

// Todos los items posibles del menú
const allMenuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Inicio' },
  { key: '/internaciones', icon: <MedicineBoxOutlined />, label: 'Internaciones' },
  { key: '/prescripciones', icon: <FileTextOutlined />, label: 'Prescripciones' },
  { key: '/enfermeria', icon: <HeartOutlined />, label: 'Enfermería' },
  { key: '/botiquin', icon: <ShoppingOutlined />, label: 'Botiquín' },
  { key: '/facturacion', icon: <DollarOutlined />, label: 'Facturación' },
  {
    key: 'maestros',
    icon: <TeamOutlined />,
    label: 'Maestros',
    children: [
      { key: '/maestros/pacientes', label: 'Pacientes' },
      { key: '/maestros/profesionales', label: 'Profesionales' },
      { key: '/maestros/tipos-profesion', label: 'Tipos de Profesión' },
      { key: '/maestros/obras-sociales', label: 'Obras Sociales' },
      { key: '/maestros/nomenclador', label: 'Nomenclador INOS' },
      { key: '/maestros/camas', label: 'Camas' },
      { key: '/maestros/sectores', label: 'Sectores' },
    ],
  },
  { key: '/usuarios', icon: <SettingOutlined />, label: 'Usuarios' },
];

// Ítems permitidos por rol
const ROL_KEYS: Record<string, string[]> = {
  admin: [
    '/', '/internaciones', '/prescripciones', '/enfermeria', '/botiquin', '/facturacion',
    'maestros',
    '/maestros/pacientes', '/maestros/profesionales', '/maestros/tipos-profesion',
    '/maestros/obras-sociales', '/maestros/nomenclador',
    '/maestros/camas', '/maestros/sectores',
    '/usuarios',
  ],
  mesa_entradas: [
    '/', '/internaciones', '/prescripciones',
    'maestros', '/maestros/pacientes', '/maestros/camas',
  ],
  medico: [
    '/', '/internaciones', '/prescripciones', '/enfermeria', '/facturacion',
  ],
  enfermeria: [
    '/', '/internaciones', '/enfermeria', '/botiquin',
  ],
  botiquin: [
    '/', '/internaciones', '/botiquin',
  ],
  facturacion: [
    '/', '/internaciones', '/facturacion',
    'maestros', '/maestros/profesionales', '/maestros/obras-sociales', '/maestros/nomenclador',
  ],
};

function filtrarMenu(items: any[], permitidos: string[]): any[] {
  return items.reduce((acc: any[], item) => {
    if (!permitidos.includes(item.key)) return acc;
    if (item.children) {
      const hijos = item.children.filter((c: any) => permitidos.includes(c.key));
      if (hijos.length > 0) {
        acc.push({ ...item, children: hijos });
      }
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuth();

  const rol = usuario?.rol ?? '';
  const permitidos = ROL_KEYS[rol] ?? [];
  const menuItems = filtrarMenu(allMenuItems, permitidos);

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar Sesión',
        onClick: () => { logout(); navigate('/login'); },
      },
    ],
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider width={220} theme="dark" collapsible style={{ height: '100vh', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px', textAlign: 'center', color: '#fff', borderBottom: '1px solid #1f3a5f', flexShrink: 0 }}>
            <Typography.Text strong style={{ color: '#fff', fontSize: 14 }}>
              Clínica/Sanatorio
            </Typography.Text>
          </div>
          <div className="sidebar-scroll" style={{ flex: 1, overflowX: 'hidden' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              defaultOpenKeys={['maestros']}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
      </Sider>
      <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ flexShrink: 0, background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{usuario?.nombreCompleto ?? usuario?.username}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>({usuario?.rol})</Typography.Text>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ flex: 1, overflow: 'auto', margin: 16 }}>
          {isRoutePermitted(location.pathname, permitidos) ? <Outlet /> : <NotFoundPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
