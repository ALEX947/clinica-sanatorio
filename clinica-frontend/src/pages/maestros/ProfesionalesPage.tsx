import { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Typography, message, Modal, Form, Input, Select, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { profesionalesApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfesionalesPage() {
  const { usuario } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const esAdmin = usuario?.rol === 'admin';

  function cargar() {
    setLoading(true);
    profesionalesApi.list()
      .then(setData)
      .catch(() => message.error('Error al cargar profesionales'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    profesionalesApi.tipos().then(setTipos).catch(() => {});
  }, []);

  function abrirNuevo() {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  }

  function abrirEditar(r: any) {
    setEditRecord(r);
    form.setFieldsValue({
      apellido: r.apellido,
      nombre: r.nombre,
      matricula: r.matricula,
      tipoProfesionId: r.tipoProfesion?.id,
      telefono: r.telefono,
      email: r.email,
      activo: r.activo,
    });
    setModalOpen(true);
  }

  async function onFinish(values: any) {
    try {
      if (editRecord) {
        await profesionalesApi.update(editRecord.id, {
          telefono: values.telefono,
          email: values.email,
          activo: values.activo,
        });
        message.success('Profesional actualizado');
      } else {
        await profesionalesApi.create(values);
        message.success('Profesional registrado');
      }
      setModalOpen(false);
      form.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar profesional'));
    }
  }

  const columns = [
    { title: 'Apellido', dataIndex: 'apellido' },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Matrícula', dataIndex: 'matricula' },
    { title: 'Tipo', render: (_: any, r: any) => r.tipoProfesion?.nombre ?? '-' },
    { title: 'Teléfono', dataIndex: 'telefono' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={r.activo ? 'green' : 'red'}>{r.activo ? 'ACTIVO' : 'INACTIVO'}</Tag>
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
        title={<Typography.Title level={4} style={{ margin: 0 }}>Profesionales</Typography.Title>}
        extra={
          esAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo Profesional
            </Button>
          )
        }
      >
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title={editRecord ? 'Editar Profesional' : 'Registrar Profesional'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Guardar"
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="apellido" label="Apellido" rules={editRecord ? [] : [{ required: true }]}>
            <Input disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={editRecord ? [] : [{ required: true }]}>
            <Input disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="matricula" label="Matrícula" rules={editRecord ? [] : [{ required: true }]}>
            <Input placeholder="MP-12345" disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="tipoProfesionId" label="Tipo de Profesión" rules={editRecord ? [] : [{ required: true }]}>
            <Select
              options={tipos.map((t) => ({ value: t.id, label: t.nombre }))}
              disabled={!!editRecord}
            />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          {editRecord && (
            <Form.Item name="activo" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
