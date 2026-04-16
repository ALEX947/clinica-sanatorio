import { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Typography, message, Modal, Form, Input, Select, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usuariosApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'medico', label: 'Médico' },
  { value: 'enfermeria', label: 'Enfermería' },
  { value: 'mesa_entradas', label: 'Mesa de Entradas' },
  { value: 'facturacion', label: 'Facturación' },
  { value: 'botiquin', label: 'Botiquín' },
];

const rolColor: Record<string, string> = {
  admin: 'red',
  medico: 'blue',
  enfermeria: 'green',
  mesa_entradas: 'orange',
  facturacion: 'purple',
  botiquin: 'cyan',
};

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  function cargar() {
    setLoading(true);
    usuariosApi.list()
      .then(setUsuarios)
      .catch(() => message.error('Error al cargar usuarios'))
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
    form.setFieldsValue({
      nombreCompleto: r.nombreCompleto,
      rol: r.rol,
      activo: r.activo,
    });
    setModalOpen(true);
  }

  async function onFinish(values: any) {
    try {
      if (editRecord) {
        await usuariosApi.update(editRecord.id, {
          nombreCompleto: values.nombreCompleto,
          rol: values.rol,
          activo: values.activo,
          ...(values.password ? { password: values.password } : {}),
        });
        message.success('Usuario actualizado');
      } else {
        await usuariosApi.create(values);
        message.success('Usuario creado');
      }
      setModalOpen(false);
      form.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar usuario'));
    }
  }

  const columns = [
    { title: 'Nombre Completo', dataIndex: 'nombreCompleto' },
    { title: 'Username', dataIndex: 'username' },
    {
      title: 'Rol',
      render: (_: any, r: any) => (
        <Tag color={rolColor[r.rol] ?? 'default'}>{r.rol}</Tag>
      ),
    },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={r.activo ? 'green' : 'red'}>{r.activo ? 'ACTIVO' : 'INACTIVO'}</Tag>
      ),
    },
    {
      title: 'Creado',
      render: (_: any, r: any) => dayjs(r.creadoEn).format('DD/MM/YYYY'),
    },
    {
      title: '',
      width: 60,
      render: (_: any, r: any) =>
        r.id !== usuarioActual?.id ? (
          <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(r)} />
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>tu cuenta</Typography.Text>
        ),
    },
  ];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Usuarios del Sistema</Typography.Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
            Nuevo Usuario
          </Button>
        }
      >
        <Table dataSource={usuarios} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title={editRecord ? 'Editar Usuario' : 'Crear Usuario'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editRecord ? 'Guardar' : 'Crear'}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="nombreCompleto" label="Nombre Completo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editRecord && (
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input autoComplete="off" />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={editRecord ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            rules={editRecord ? [] : [{ required: true, min: 6 }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
            <Select options={ROLES} />
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
