import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Tag, Typography, message, Modal, Form, Input,
  Select, DatePicker, InputNumber, Space, Divider,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  facturacionApi, obrasSocialesApi, internacionesApi, profesionalesApi, nomencladorApi, errorMsg,
} from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const estadoColor: Record<string, string> = {
  emitida: 'orange',
  liquidada: 'green',
  parcialmente_liquidada: 'blue',
};

export default function FacturacionPage() {
  const { usuario } = useAuth();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [detalleFactura, setDetalleFactura] = useState<any>(null);

  const [obrasSociales, setObrasSociales] = useState<any[]>([]);
  const [internaciones, setInternaciones] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [practicas, setPracticas] = useState<any[]>([]);

  const [formFactura] = Form.useForm();

  const esFacturacion = ['admin', 'facturacion'].includes(usuario?.rol ?? '');

  function cargar() {
    setLoading(true);
    facturacionApi.list()
      .then(setFacturas)
      .catch(() => message.error('Error al cargar facturas'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    obrasSocialesApi.list().then(setObrasSociales).catch(() => {});
    internacionesApi.list().then(setInternaciones).catch(() => {});
    profesionalesApi.list().then(setProfesionales).catch(() => {});
    nomencladorApi.search().then(setPracticas).catch(() => {});
  }, []);

  async function crearFactura(values: any) {
    try {
      await facturacionApi.crearFactura({
        obraSocialId: values.obraSocialId,
        periodoDesde: values.periodo[0].format('YYYY-MM-DD'),
        periodoHasta: values.periodo[1].format('YYYY-MM-DD'),
        nroFactura: values.nroFactura,
        detalles: (values.detalles ?? []).map((d: any) => ({
          internacionId: d.internacionId,
          prestadorId: d.prestadorId,
          practicaId: d.practicaId ?? undefined,
          valorFacturado: d.valorFacturado,
          copagoPrecobrado: d.copagoPrecobrado ?? 0,
        })),
      });
      message.success('Factura emitida');
      setFacturaOpen(false);
      formFactura.resetFields();
      cargar();
    } catch (err) {
      message.error(errorMsg(err, 'Error al emitir factura'));
    }
  }

  async function verDetalle(id: number) {
    try {
      const f = await facturacionApi.get(id);
      setDetalleFactura(f);
    } catch (err) {
      message.error(errorMsg(err, 'Error al cargar detalle'));
    }
  }

  const profesionalOptions = profesionales.map((p) => ({
    value: p.id,
    label: `${p.apellido}, ${p.nombre}`,
  }));

  const practicaOptions = practicas.map((p) => ({
    value: p.id,
    label: `[${p.codigo}] ${p.descripcion}`,
  }));

  const internacionOptions = internaciones.map((i) => ({
    value: i.id,
    label: `#${i.id} – ${i.paciente?.apellido ?? ''}, ${i.paciente?.nombre ?? ''}`,
  }));

  const columns = [
    { title: 'Nro.', dataIndex: 'nroFactura', width: 120 },
    { title: 'Obra Social', render: (_: any, r: any) => r.obraSocial?.nombre ?? '-' },
    { title: 'Período', render: (_: any, r: any) => r.periodoDesde ? `${dayjs(r.periodoDesde).format('DD/MM/YYYY')} – ${dayjs(r.periodoHasta).format('DD/MM/YYYY')}` : '-' },
    { title: 'Monto Total', render: (_: any, r: any) => r.montoTotal != null ? `$${Number(r.montoTotal).toLocaleString('es-AR')}` : '-' },
    { title: 'Emisión', render: (_: any, r: any) => r.fechaEmision ? dayjs(r.fechaEmision).format('DD/MM/YYYY') : '-' },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={estadoColor[r.estado] ?? 'default'}>
          {(r.estado ?? '-').toUpperCase().replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: '',
      width: 60,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r.id)} />
      ),
    },
  ];

  const detallesColumns = [
    { title: 'Internación', render: (_: any, r: any) => `#${r.internacion?.id ?? '?'} – ${r.internacion?.paciente?.apellido ?? '-'}` },
    { title: 'Prestador', render: (_: any, r: any) => r.prestador ? `${r.prestador.apellido}, ${r.prestador.nombre}` : '-' },
    { title: 'Práctica', render: (_: any, r: any) => r.practica ? `[${r.practica.codigo}] ${r.practica.descripcion}` : '-' },
    { title: 'Valor', render: (_: any, r: any) => `$${Number(r.valorFacturado).toLocaleString('es-AR')}` },
    { title: 'Copago', render: (_: any, r: any) => `$${Number(r.copagoPrecobrado ?? 0).toLocaleString('es-AR')}` },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={r.estado === 'liquidado' ? 'green' : r.estado === 'debitado' ? 'red' : 'orange'}>
          {(r.estado ?? '-').toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Facturación a Obras Sociales</Typography.Title>}
        extra={
          esFacturacion && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFacturaOpen(true)}>
              Nueva Factura
            </Button>
          )
        }
      >
        <Table dataSource={facturas} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 15 }} />
      </Card>

      {/* Modal Nueva Factura */}
      <Modal
        title="Emitir Factura a Obra Social"
        open={facturaOpen}
        onCancel={() => { setFacturaOpen(false); formFactura.resetFields(); }}
        onOk={() => formFactura.submit()}
        okText="Emitir"
        width={680}
      >
        <Form form={formFactura} layout="vertical" onFinish={crearFactura}>
          <Space style={{ width: '100%' }}>
            <Form.Item name="nroFactura" label="Nro. Factura" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="F-2026-001" />
            </Form.Item>
            <Form.Item name="obraSocialId" label="Obra Social" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select showSearch optionFilterProp="label" options={obrasSociales.map((o) => ({ value: o.id, label: o.nombre }))} />
            </Form.Item>
          </Space>
          <Form.Item name="periodo" label="Período de facturación" rules={[{ required: true }]}>
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Divider>Detalles</Divider>

          <Form.List name="detalles" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} direction="vertical" style={{ width: '100%', marginBottom: 8, border: '1px solid #f0f0f0', padding: 8, borderRadius: 6 }}>
                    <Space style={{ width: '100%' }}>
                      <Form.Item {...rest} name={[name, 'internacionId']} label="Internación" rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
                        <Select showSearch optionFilterProp="label" options={internacionOptions} style={{ width: 220 }} />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'prestadorId']} label="Prestador" rules={[{ required: true }]} style={{ flex: 2, marginBottom: 0 }}>
                        <Select showSearch optionFilterProp="label" options={profesionalOptions} style={{ width: 220 }} />
                      </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                      <Form.Item {...rest} name={[name, 'practicaId']} label="Práctica (opcional)" style={{ flex: 3, marginBottom: 0 }}>
                        <Select showSearch optionFilterProp="label" options={practicaOptions} allowClear style={{ width: 260 }} />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'valorFacturado']} label="Valor $" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'copagoPrecobrado']} label="Copago $" style={{ marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: 90 }} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                          <Button danger size="small" onClick={() => remove(name)}>–</Button>
                        </Form.Item>
                      )}
                    </Space>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />}>Agregar detalle</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Modal Detalle Factura */}
      <Modal
        title={`Factura ${detalleFactura?.nroFactura ?? ''}`}
        open={!!detalleFactura}
        onCancel={() => setDetalleFactura(null)}
        footer={null}
        width={760}
      >
        {detalleFactura && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Tag>{detalleFactura.obraSocial?.nombre}</Tag>
              <Typography.Text type="secondary">
                Período: {dayjs(detalleFactura.periodoDesde).format('DD/MM/YYYY')} – {dayjs(detalleFactura.periodoHasta).format('DD/MM/YYYY')}
              </Typography.Text>
              <Typography.Text strong>Total: ${Number(detalleFactura.montoTotal ?? 0).toLocaleString('es-AR')}</Typography.Text>
            </Space>
            <Table dataSource={detalleFactura.detalles ?? []} columns={detallesColumns} rowKey="id" size="small" pagination={false} />
          </Space>
        )}
      </Modal>
    </>
  );
}
