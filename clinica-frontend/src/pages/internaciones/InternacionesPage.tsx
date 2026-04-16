import { useEffect, useState } from 'react';
import { Table, Button, Tag, Card, Tabs, Typography, message } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { internacionesApi } from '../../api/client';

const estadoColor: Record<string, string> = {
  activa: 'green',
  alta: 'default',
};

export default function InternacionesPage() {
  const [internaciones, setInternaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'activas' | 'todas'>('activas');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    internacionesApi.list(tab === 'activas' ? true : undefined)
      .then(setInternaciones)
      .catch(() => message.error('Error al cargar internaciones'))
      .finally(() => setLoading(false));
  }, [tab]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: 'Paciente',
      render: (_: any, r: any) => `${r.paciente?.apellido}, ${r.paciente?.nombre}`,
    },
    {
      title: 'Cama / Sector',
      render: (_: any, r: any) => `${r.cama?.sector?.nombre} - Cama ${r.cama?.numero}`,
    },
    { title: 'Obra Social', render: (_: any, r: any) => r.obraSocial?.nombre },
    { title: 'Médico', render: (_: any, r: any) => `${r.profesionalInterviniente?.apellido}, ${r.profesionalInterviniente?.nombre}` },
    {
      title: 'Ingreso',
      render: (_: any, r: any) => dayjs(r.fechaHoraIngreso).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Estado',
      render: (_: any, r: any) => <Tag color={estadoColor[r.estado]}>{r.estado.toUpperCase()}</Tag>,
    },
    {
      title: 'Acciones',
      render: (_: any, r: any) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/internaciones/${r.id}`)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Internaciones</Typography.Title>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/internaciones/nueva')}>
          Nueva Internación
        </Button>
      }
    >
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as any)}
        items={[
          { key: 'activas', label: 'Activas' },
          { key: 'todas', label: 'Historial completo' },
        ]}
      />
      <Table
        dataSource={internaciones}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
}
