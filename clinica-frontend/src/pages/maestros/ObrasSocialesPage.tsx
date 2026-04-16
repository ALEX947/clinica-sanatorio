import { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Typography, message, Modal, Form, Input, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { obrasSocialesApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function ObrasSocialesPage() {
  const { usuario } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const esAdmin = ['admin', 'facturacion'].includes(usuario?.rol ?? '');

  function cargar() {
    setLoading(true);
    obrasSocialesApi.list()
      .then(setData)
      .catch(() => message.error('Error al cargar obras sociales'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  }

  function abrirEditar(r: any) {
    setEditRecord(r);
    form.setFieldsValue({ ...r, activa: r.activa });
    setModalOpen(true);
  }

  async function onFinish(values: any) {
    try {
      if (editRecord) {
        await obrasSocialesApi.update(editRecord.id, values);
        message.success('Obra social actualizada');
      } else {
        await obrasSocialesApi.create(values);
        message.success('Obra social registrada');
      }
      setModalOpen(false);
      form.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar obra social'));
    }
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'CUIT', dataIndex: 'cuit' },
    { title: 'Domicilio', dataIndex: 'domicilio' },
    { title: 'Teléfono', dataIndex: 'telefono' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={r.activa ? 'green' : 'red'}>{r.activa ? 'ACTIVA' : 'INACTIVA'}</Tag>
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
        title={<Typography.Title level={4} style={{ margin: 0 }}>Obras Sociales</Typography.Title>}
        extra={
          usuario?.rol === 'admin' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nueva Obra Social
            </Button>
          )
        }
      >
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title={editRecord ? 'Editar Obra Social' : 'Registrar Obra Social'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Guardar"
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cuit" label="CUIT">
            <Input placeholder="30-54649489-4" />
          </Form.Item>
          <Form.Item name="domicilio" label="Domicilio">
            <Input />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="modalidadFacturacion" label="Modalidad de Facturación">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="diaFacturacion" label="Día de Facturación">
            <Input type="number" min={1} max={31} />
          </Form.Item>
          {editRecord && (
            <Form.Item name="activa" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
