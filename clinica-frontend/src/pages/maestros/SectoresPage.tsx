import { useEffect, useState } from 'react';
import { Table, Card, Button, Typography, message, Modal, Form, Input } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { camasApi, errorMsg } from '../../api/client';

export default function SectoresPage() {
  const [sectores, setSectores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  function cargar() {
    setLoading(true);
    camasApi.sectores()
      .then(setSectores)
      .catch(() => message.error('Error al cargar sectores'))
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
    form.setFieldsValue(r);
    setModalOpen(true);
  }

  async function onFinish(values: any) {
    try {
      if (editRecord) {
        await camasApi.updateSector(editRecord.id, values);
        message.success('Sector actualizado');
      } else {
        await camasApi.createSector(values);
        message.success('Sector registrado');
      }
      setModalOpen(false);
      form.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar sector'));
    }
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Descripción', dataIndex: 'descripcion' },
    {
      title: '',
      width: 60,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(r)} />
      ),
    },
  ];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Sectores</Typography.Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
            Nuevo Sector
          </Button>
        }
      >
        <Table dataSource={sectores} columns={columns} rowKey="id" loading={loading} size="small" />
      </Card>

      <Modal
        title={editRecord ? 'Editar Sector' : 'Registrar Sector'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Ej: UTI Adultos, Clínica Médica, Quirúrgico" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
