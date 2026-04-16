import { useEffect, useState } from 'react';
import { Table, Button, Card, Modal, Form, Input, DatePicker, Select, Typography, message, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { pacientesApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function PacientesPage() {
  const { usuario } = useAuth();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const puedeEditar = ['admin', 'mesa_entradas'].includes(usuario?.rol ?? '');

  function cargar() {
    setLoading(true);
    pacientesApi.list()
      .then(setPacientes)
      .catch(() => message.error('Error al cargar pacientes'))
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
      ...r,
      fechaNacimiento: r.fechaNacimiento ? dayjs(r.fechaNacimiento) : null,
    });
    setModalOpen(true);
  }

  async function onFinish(values: any) {
    try {
      const data = { ...values, fechaNacimiento: values.fechaNacimiento.format('YYYY-MM-DD') };
      if (editRecord) {
        await pacientesApi.update(editRecord.id, data);
        message.success('Paciente actualizado');
      } else {
        await pacientesApi.create(data);
        message.success('Paciente registrado');
      }
      setModalOpen(false);
      form.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar paciente'));
    }
  }

  const columns = [
    { title: 'DNI', dataIndex: 'dni', width: 110 },
    { title: 'Apellido', dataIndex: 'apellido' },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Fecha Nac.', render: (_: any, r: any) => dayjs(r.fechaNacimiento).format('DD/MM/YYYY') },
    { title: 'Sexo', dataIndex: 'sexo', width: 60 },
    { title: 'Localidad', dataIndex: 'localidad' },
    { title: 'Teléfono', dataIndex: 'telefono' },
    puedeEditar
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
        title={<Typography.Title level={4} style={{ margin: 0 }}>Pacientes</Typography.Title>}
        extra={
          puedeEditar && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo Paciente
            </Button>
          )
        }
      >
        <Table dataSource={pacientes} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title={editRecord ? 'Editar Paciente' : 'Registrar Paciente'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Guardar"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Space style={{ width: '100%' }} direction="vertical">
            <Form.Item name="dni" label="DNI" rules={[{ required: true }]}>
              <Input placeholder="Sin puntos" disabled={!!editRecord} />
            </Form.Item>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Input />
              </Form.Item>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]} style={{ flex: 1, marginLeft: 8 }}>
                <Input />
              </Form.Item>
            </Space.Compact>
            <Form.Item name="fechaNacimiento" label="Fecha de Nacimiento" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sexo" label="Sexo" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="M">Masculino</Select.Option>
                <Select.Option value="F">Femenino</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="domicilio" label="Domicilio">
              <Input />
            </Form.Item>
            <Form.Item name="localidad" label="Localidad">
              <Input />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono">
              <Input />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
