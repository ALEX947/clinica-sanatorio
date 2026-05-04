import { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Typography,
  message,
  Modal,
  Form,
  Tag,
  Switch,
  Space,
  Popconfirm,
  Select,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DollarOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { nomencladorApi, obrasSocialesApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

export default function NomencladorPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';

  // Lista principal
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  // Modal crear/editar práctica
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form] = Form.useForm();

  // Modal gestión de aranceles
  const [arancelModalOpen, setArancelModalOpen] = useState(false);
  const [arancelPractica, setArancelPractica] = useState<any>(null);
  const [aranceles, setAranceles] = useState<any[]>([]);
  const [arancelesLoading, setArancelesLoading] = useState(false);

  // Modal crear/editar arancel
  const [arancelFormOpen, setArancelFormOpen] = useState(false);
  const [editArancel, setEditArancel] = useState<any>(null);
  const [obrasSociales, setObrasSociales] = useState<any[]>([]);
  const [arancelForm] = Form.useForm();

  function buscar(q?: string, inactivos = incluirInactivos) {
    setLoading(true);
    nomencladorApi
      .search(q || undefined, inactivos)
      .then(setData)
      .catch(() => message.error('Error al buscar'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    buscar();
  }, []);

  function abrirNuevo() {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  }

  function abrirEditar(r: any) {
    setEditRecord(r);
    form.setFieldsValue({
      descripcion: r.descripcion,
      especialidad: r.especialidad,
      activo: r.activo,
    });
    setModalOpen(true);
  }

  async function onFinishNomenclador(values: any) {
    try {
      if (editRecord) {
        await nomencladorApi.update(editRecord.id, values);
        message.success('Práctica actualizada');
      } else {
        await nomencladorApi.create(values);
        message.success('Práctica registrada');
      }
      setModalOpen(false);
      form.resetFields();
      buscar(query || undefined);
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar práctica'));
    }
  }

  function abrirAranceles(practica: any) {
    setArancelPractica(practica);
    setAranceles([]);
    setArancelModalOpen(true);
    cargarAranceles(practica.id);
    obrasSocialesApi.list().then(setObrasSociales).catch(() => {});
  }

  function cargarAranceles(practicaId: number) {
    setArancelesLoading(true);
    nomencladorApi
      .listAranceles(practicaId)
      .then(setAranceles)
      .catch(() => message.error('Error al cargar aranceles'))
      .finally(() => setArancelesLoading(false));
  }

  function abrirNuevoArancel() {
    setEditArancel(null);
    arancelForm.resetFields();
    setArancelFormOpen(true);
  }

  function abrirEditarArancel(a: any) {
    setEditArancel(a);
    arancelForm.setFieldsValue({
      obraSocialId: a.obraSocial?.id,
      valorArancel: Number(a.valorArancel),
      porcentajeCopago: Number(a.porcentajeCopago),
      vigenciaDesde: a.vigenciaDesde,
      vigenciaHasta: a.vigenciaHasta ?? undefined,
    });
    setArancelFormOpen(true);
  }

  async function onFinishArancel(values: any) {
    const payload = { ...values };
    if (!payload.vigenciaHasta) delete payload.vigenciaHasta;
    try {
      if (editArancel) {
        await nomencladorApi.updateArancel(editArancel.id, payload);
        message.success('Arancel actualizado');
      } else {
        await nomencladorApi.createArancel({
          ...payload,
          practicaId: arancelPractica.id,
        });
        message.success('Arancel registrado');
      }
      setArancelFormOpen(false);
      arancelForm.resetFields();
      cargarAranceles(arancelPractica.id);
    } catch (err) {
      message.error(errorMsg(err, 'Error al guardar arancel'));
    }
  }

  async function eliminarArancel(id: number) {
    try {
      await nomencladorApi.deleteArancel(id);
      message.success('Arancel eliminado');
      cargarAranceles(arancelPractica.id);
    } catch (err) {
      message.error(errorMsg(err, 'Error al eliminar arancel'));
    }
  }

  const columns: any[] = [
    { title: 'Código', dataIndex: 'codigo', width: 110 },
    { title: 'Descripción', dataIndex: 'descripcion' },
    { title: 'Especialidad', dataIndex: 'especialidad' },
    ...(esAdmin
      ? [
          {
            title: 'Estado',
            width: 100,
            render: (_: any, r: any) => (
              <Tag color={r.activo ? 'green' : 'red'}>
                {r.activo ? 'ACTIVO' : 'INACTIVO'}
              </Tag>
            ),
          },
          {
            title: 'Acciones',
            width: 110,
            render: (_: any, r: any) => (
              <Space size="small">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => abrirEditar(r)}
                  title="Editar"
                />
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => abrirAranceles(r)}
                  title="Aranceles"
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  const arancelColumns: any[] = [
    {
      title: 'Obra Social',
      render: (_: any, r: any) => r.obraSocial?.nombre ?? '-',
    },
    {
      title: 'Valor',
      dataIndex: 'valorArancel',
      render: (v: any) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Copago %',
      dataIndex: 'porcentajeCopago',
      render: (v: any) => `${Number(v).toFixed(1)}%`,
    },
    { title: 'Vigencia desde', dataIndex: 'vigenciaDesde' },
    {
      title: 'Vigencia hasta',
      dataIndex: 'vigenciaHasta',
      render: (v: any) => v ?? '—',
    },
    {
      title: '',
      width: 90,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => abrirEditarArancel(r)}
          />
          <Popconfirm
            title="¿Eliminar este arancel?"
            onConfirm={() => eliminarArancel(r.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            Nomenclador INOS
          </Title>
        }
        extra={
          esAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nueva Práctica
            </Button>
          )
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Buscar por código o descripción..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={(val) => buscar(val)}
            enterButton={
              <>
                <SearchOutlined /> Buscar
              </>
            }
            style={{ width: 380 }}
            allowClear
          />
          {esAdmin && (
            <Space>
              <Text>Mostrar inactivos</Text>
              <Switch
                checked={incluirInactivos}
                onChange={(v) => {
                  setIncluirInactivos(v);
                  buscar(query || undefined, v);
                }}
              />
            </Space>
          )}
        </Space>

        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
        />
      </Card>

      {/* Modal: crear/editar práctica */}
      <Modal
        title={editRecord ? 'Editar Práctica INOS' : 'Registrar Práctica INOS'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Guardar"
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={onFinishNomenclador}>
          {!editRecord && (
            <Form.Item
              name="codigo"
              label="Código"
              rules={[{ required: true, message: 'Ingresá el código' }]}
            >
              <Input placeholder="Ej: 010101" />
            </Form.Item>
          )}
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'Ingresá la descripción' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="especialidad" label="Especialidad">
            <Input placeholder="Ej: Clínica Médica" />
          </Form.Item>
          {editRecord && (
            <Form.Item name="activo" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal: gestión de aranceles */}
      <Modal
        title={`Aranceles — ${arancelPractica?.codigo}: ${arancelPractica?.descripcion}`}
        open={arancelModalOpen}
        onCancel={() => setArancelModalOpen(false)}
        footer={null}
        width={740}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={abrirNuevoArancel}
          style={{ marginBottom: 12 }}
        >
          Nuevo Arancel
        </Button>
        <Table
          dataSource={aranceles}
          columns={arancelColumns}
          rowKey="id"
          loading={arancelesLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'Sin aranceles definidos' }}
        />
      </Modal>

      {/* Modal: formulario de arancel */}
      <Modal
        title={editArancel ? 'Editar Arancel' : 'Nuevo Arancel'}
        open={arancelFormOpen}
        onCancel={() => {
          setArancelFormOpen(false);
          arancelForm.resetFields();
        }}
        onOk={() => arancelForm.submit()}
        okText="Guardar"
        width={440}
      >
        <Form form={arancelForm} layout="vertical" onFinish={onFinishArancel}>
          {!editArancel && (
            <Form.Item
              name="obraSocialId"
              label="Obra Social"
              rules={[{ required: true, message: 'Seleccioná una obra social' }]}
            >
              <Select
                placeholder="Seleccioná una obra social"
                showSearch
                filterOption={(input, option) =>
                  ((option?.label as string) ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={obrasSociales
                  .filter((os) => os.activa)
                  .map((os) => ({ value: os.id, label: os.nombre }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="valorArancel"
            label="Valor Arancel ($)"
            rules={[{ required: true, message: 'Ingresá el valor' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="$" />
          </Form.Item>
          <Form.Item name="porcentajeCopago" label="% Copago" initialValue={0}>
            <InputNumber min={0} max={100} precision={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="vigenciaDesde"
            label="Vigencia Desde"
            rules={[{ required: true, message: 'Ingresá la fecha de inicio' }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item name="vigenciaHasta" label="Vigencia Hasta">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
