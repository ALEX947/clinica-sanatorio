import { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Select, Typography, message, Modal, Form, Input, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { camasApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const ESTADO_COLOR: Record<string, string> = {
  disponible: 'green',
  ocupada: 'red',
  mantenimiento: 'orange',
};

const ESTADO_LABEL: Record<string, string> = {
  disponible: 'DISPONIBLE',
  ocupada: 'OCUPADA',
  mantenimiento: 'MANTENIMIENTO',
};

export default function CamasPage() {
  const { usuario } = useAuth();
  const [camas, setCamas] = useState<any[]>([]);
  const [sectores, setSectores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal nueva cama
  const [modalNuevaOpen, setModalNuevaOpen] = useState(false);
  const [formNueva] = Form.useForm();

  // Modal editar estado
  const [editRecord, setEditRecord] = useState<any>(null);
  const [formEditar] = Form.useForm();

  const esAdmin = usuario?.rol === 'admin';

  function cargar() {
    setLoading(true);
    Promise.all([camasApi.list(), camasApi.sectores()])
      .then(([c, s]) => { setCamas(c); setSectores(s); })
      .catch(() => message.error('Error al cargar camas'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []);

  function abrirEditar(r: any) {
    setEditRecord(r);
    formEditar.setFieldsValue({ estado: r.estado });
  }

  async function onFinishNueva(values: any) {
    try {
      await camasApi.create({
        numero: values.numero,
        individual: values.individual === 'true',
        sector: { id: values.sectorId },
      });
      message.success('Cama registrada');
      setModalNuevaOpen(false);
      formNueva.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al registrar cama'));
    }
  }

  async function onFinishEditar(values: any) {
    try {
      await camasApi.updateEstado(editRecord.id, values.estado);
      message.success('Estado actualizado');
      setEditRecord(null);
      formEditar.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al cambiar estado'));
    }
  }

  const columns = [
    { title: 'Número', dataIndex: 'numero', width: 90 },
    { title: 'Sector', render: (_: any, r: any) => r.sector?.nombre ?? '-' },
    { title: 'Tipo', render: (_: any, r: any) => (r.individual ? 'Individual' : 'Compartida') },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={ESTADO_COLOR[r.estado] ?? 'default'}>
          {ESTADO_LABEL[r.estado] ?? r.estado?.toUpperCase()}
        </Tag>
      ),
    },
    esAdmin
      ? {
          title: '',
          width: 60,
          render: (_: any, r: any) => (
            <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(r)} />
          ),
        }
      : null,
  ].filter(Boolean) as any[];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Camas</Typography.Title>}
        extra={
          esAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalNuevaOpen(true)}>
              Nueva Cama
            </Button>
          )
        }
      >
        <Table dataSource={camas} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      {/* Modal nueva cama */}
      <Modal
        title="Registrar Cama"
        open={modalNuevaOpen}
        onCancel={() => { setModalNuevaOpen(false); formNueva.resetFields(); }}
        onOk={() => formNueva.submit()}
        okText="Guardar"
      >
        <Form form={formNueva} layout="vertical" onFinish={onFinishNueva}>
          <Form.Item name="numero" label="Número de cama" rules={[{ required: true }]}>
            <Input placeholder="101" />
          </Form.Item>
          <Form.Item name="sectorId" label="Sector" rules={[{ required: true }]}>
            <Select options={sectores.map((s) => ({ value: s.id, label: s.nombre }))} />
          </Form.Item>
          <Form.Item name="individual" label="Tipo" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="false">Compartida</Select.Option>
              <Select.Option value="true">Individual</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal editar estado */}
      <Modal
        title={`Editar Cama ${editRecord?.numero ?? ''}`}
        open={!!editRecord}
        onCancel={() => { setEditRecord(null); formEditar.resetFields(); }}
        onOk={() => formEditar.submit()}
        okText="Guardar"
      >
        <Form form={formEditar} layout="vertical" onFinish={onFinishEditar}>
          <Space style={{ width: '100%' }} direction="vertical">
            <Typography.Text type="secondary">
              Sector: {editRecord?.sector?.nombre ?? '-'} · Tipo: {editRecord?.individual ? 'Individual' : 'Compartida'}
            </Typography.Text>
            <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
              <Select options={[
                { value: 'disponible', label: 'Disponible' },
                { value: 'ocupada', label: 'Ocupada' },
                { value: 'mantenimiento', label: 'En mantenimiento' },
              ]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
