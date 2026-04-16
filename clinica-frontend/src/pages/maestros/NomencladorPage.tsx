import { useEffect, useState } from 'react';
import { Table, Card, Input, Button, Typography, message, Modal, Form } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { nomencladorApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function NomencladorPage() {
  const { usuario } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const esAdmin = usuario?.rol === 'admin';

  function buscar(q?: string) {
    setLoading(true);
    nomencladorApi.search(q || undefined)
      .then(setData)
      .catch(() => message.error('Error al buscar'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { buscar(); }, []);

  async function onFinish(values: any) {
    try {
      await nomencladorApi.create(values);
      message.success('Práctica registrada');
      setModalOpen(false);
      form.resetFields();
      buscar(query || undefined);
    } catch (err) {
      message.error(errorMsg(err, 'Error al registrar práctica'));
    }
  }

  const columns = [
    { title: 'Código', dataIndex: 'codigo', width: 110 },
    { title: 'Descripción', dataIndex: 'descripcion' },
    { title: 'Especialidad', dataIndex: 'especialidad' },
  ];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Nomenclador INOS</Typography.Title>}
        extra={
          esAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Nueva Práctica
            </Button>
          )
        }
      >
        <Input.Search
          placeholder="Buscar por código o descripción..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={(val) => buscar(val)}
          enterButton={<><SearchOutlined /> Buscar</>}
          style={{ maxWidth: 480, marginBottom: 16 }}
          allowClear
        />
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Registrar Práctica INOS"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Guardar"
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="codigo" label="Código" rules={[{ required: true }]}>
            <Input placeholder="Ej: 010101" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="especialidad" label="Especialidad">
            <Input placeholder="Ej: Clínica Médica" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
