import { Card, Col, Row, Typography } from 'antd';
import {
  MedicineBoxOutlined, HeartOutlined, DollarOutlined, ShoppingOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const todosLosAccesos = [
  {
    titulo: 'Internaciones',
    desc: 'Gestionar internaciones activas',
    icon: <MedicineBoxOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    ruta: '/internaciones',
    roles: ['admin', 'mesa_entradas', 'medico', 'enfermeria', 'botiquin', 'facturacion'],
  },
  {
    titulo: 'Prescripciones',
    desc: 'Prescribir y autorizar indicaciones médicas',
    icon: <FileTextOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    ruta: '/prescripciones',
    roles: ['admin', 'mesa_entradas', 'medico'],
  },
  {
    titulo: 'Enfermería',
    desc: 'Agenda de suministros y controles',
    icon: <HeartOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    ruta: '/enfermeria',
    roles: ['admin', 'medico', 'enfermeria'],
  },
  {
    titulo: 'Botiquín',
    desc: 'Solicitudes de medicamentos',
    icon: <ShoppingOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    ruta: '/botiquin',
    roles: ['admin', 'enfermeria', 'botiquin'],
  },
  {
    titulo: 'Facturación',
    desc: 'Facturas a Obras Sociales',
    icon: <DollarOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    ruta: '/facturacion',
    roles: ['admin', 'facturacion', 'medico'],
  },
];

export default function HomePage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const accesos = todosLosAccesos.filter(
    (a) => usuario?.rol && a.roles.includes(usuario.rol),
  );

  return (
    <div style={{ overflowX: 'hidden' }}>
      <Typography.Title level={3}>
        Bienvenido, {usuario?.nombreCompleto}
      </Typography.Title>
      <Typography.Text type="secondary">Sistema de Administración de Clínica/Sanatorio</Typography.Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {accesos.map((a) => (
          <Col xs={24} sm={12} lg={6} key={a.titulo}>
            <Card
              hoverable
              onClick={() => navigate(a.ruta)}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              {a.icon}
              <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 4 }}>{a.titulo}</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{a.desc}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
