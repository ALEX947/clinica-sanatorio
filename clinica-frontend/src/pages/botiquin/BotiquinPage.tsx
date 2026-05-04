import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Tag, Typography, message, Modal,
  Form, Select, InputNumber, Space, Tabs, DatePicker,
} from 'antd';
import { CheckOutlined, PlusOutlined, HistoryOutlined, UnorderedListOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { botiquinApi, internacionesApi, prescripcionesApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const { RangePicker } = DatePicker;

const ESTADO_CFG: Record<string, { color: string; label: string }> = {
  pendiente: { color: 'orange', label: 'PENDIENTE' },
  parcial:   { color: 'gold',   label: 'PARCIAL'   },
  entregada: { color: 'green',  label: 'ENTREGADA' },
};

function EstadoTag({ estado }: { estado: string }) {
  const cfg = ESTADO_CFG[estado] ?? { color: 'default', label: estado.toUpperCase() };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

function nombreMed(item: any) {
  return item.medicamentoPrescripto
    ? `${item.medicamentoPrescripto.droga} ${item.medicamentoPrescripto.concentracion}`
    : `Ítem #${item.id}`;
}

export default function BotiquinPage() {
  const { usuario } = useAuth();
  const esBotiquin = ['admin', 'botiquin'].includes(usuario?.rol ?? '');
  const puedeCrear  = ['admin', 'enfermeria'].includes(usuario?.rol ?? '');

  // ── Cola de trabajo ────────────────────────────────────────────────────────
  const [cola, setCola]               = useState<any[]>([]);
  const [loadingCola, setLoadingCola] = useState(false);

  // Modal entrega
  const [entregaId, setEntregaId]               = useState<number | null>(null);
  const [solicitudDetalle, setSolicitudDetalle] = useState<any>(null);
  const [formEntrega]                           = Form.useForm();
  const [confirmLoading, setConfirmLoading]     = useState(false);

  // ── Historial ──────────────────────────────────────────────────────────────
  const [historial, setHistorial]               = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroEstado, setFiltroEstado]         = useState<string | undefined>(undefined);
  const [historialRango, setHistorialRango]     = useState<[Dayjs, Dayjs] | null>(null);

  // ── Nueva solicitud ────────────────────────────────────────────────────────
  const [nuevaOpen, setNuevaOpen]     = useState(false);
  const [formNueva]                   = Form.useForm();
  const [internaciones, setInternaciones] = useState<any[]>([]);
  const [medicamentos, setMedicamentos]   = useState<any[]>([]);
  const [loadingMeds, setLoadingMeds]     = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  function cargarCola() {
    setLoadingCola(true);
    botiquinApi.pendientes()
      .then(setCola)
      .catch(() => message.error('Error al cargar solicitudes'))
      .finally(() => setLoadingCola(false));
  }

  function cargarHistorial(estado?: string, rango?: [Dayjs, Dayjs] | null) {
    setLoadingHistorial(true);
    const desde = rango?.[0].toISOString();
    const hasta  = rango?.[1].toISOString();
    botiquinApi.historial(estado, desde, hasta)
      .then(setHistorial)
      .catch(() => message.error('Error al cargar historial'))
      .finally(() => setLoadingHistorial(false));
  }

  useEffect(() => {
    cargarCola();
    internacionesApi.list(true).then(setInternaciones).catch(() => {});
  }, []);

  // ── Nueva solicitud ────────────────────────────────────────────────────────
  async function onSelectInternacion(id: number) {
    formNueva.setFieldsValue({ items: [] });
    setMedicamentos([]);
    setLoadingMeds(true);
    try {
      const presc = await prescripcionesApi.byInternacion(id);
      const meds: any[] = [];
      presc.forEach((p: any) => {
        if (p.tipo === 'medicamento' && p.estado !== 'suspendida') {
          meds.push({
            id: p.id,
            label: `${p.medicamentoPrescripto?.droga ?? `Prescripción #${p.id}`} – ${p.medicamentoPrescripto?.concentracion ?? ''}`,
          });
        }
      });
      setMedicamentos(meds);
    } catch {
      message.error('Error al cargar medicamentos');
    } finally {
      setLoadingMeds(false);
    }
  }

  async function crearSolicitud(values: any) {
    try {
      await botiquinApi.crear({
        internacionId: values.internacionId,
        items: (values.items ?? []).map((item: any) => ({
          medicamentoPrescriptoId: item.medicamentoPrescriptoId,
          cantidadSolicitada: item.cantidadSolicitada,
        })),
      });
      message.success('Solicitud creada');
      setNuevaOpen(false);
      formNueva.resetFields();
      cargarCola();
    } catch (err) {
      message.error(errorMsg(err, 'Error al crear solicitud'));
    }
  }

  // ── Registrar entrega ──────────────────────────────────────────────────────
  function abrirEntrega(r: any) {
    setSolicitudDetalle(r);
    setEntregaId(r.id);
    // Pre-carga con la cantidad restante por entregar
    const vals: Record<string, number> = {};
    (r.items ?? []).forEach((item: any) => {
      vals[`c_${item.id}`] = Math.max(0, Number(item.cantidadSolicitada) - Number(item.cantidadEntregada));
    });
    formEntrega.setFieldsValue(vals);
  }

  async function registrarEntrega() {
    if (!entregaId || !solicitudDetalle) return;
    setConfirmLoading(true);
    try {
      const vals = formEntrega.getFieldsValue();
      const items = (solicitudDetalle.items ?? []).map((item: any) => ({
        itemId: item.id,
        cantidadEntregada: Number(vals[`c_${item.id}`] ?? 0),
      }));
      await botiquinApi.registrarEntrega(entregaId, items);
      message.success('Entrega registrada');
      setEntregaId(null);
      setSolicitudDetalle(null);
      formEntrega.resetFields();
      cargarCola();
    } catch (err) {
      message.error(errorMsg(err, 'Error al registrar entrega'));
    } finally {
      setConfirmLoading(false);
    }
  }

  // ── Columnas tabla cola ────────────────────────────────────────────────────
  const colsCola = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Fecha', render: (_: any, r: any) => dayjs(r.creadoEn).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Paciente',
      render: (_: any, r: any) =>
        `#${r.internacion?.id ?? '?'} – ${r.internacion?.paciente?.apellido ?? '-'}`,
    },
    { title: 'Ítems', render: (_: any, r: any) => r.items?.length ?? 0 },
    { title: 'Estado', render: (_: any, r: any) => <EstadoTag estado={r.estado} /> },
    {
      title: 'Acciones',
      render: (_: any, r: any) =>
        esBotiquin ? (
          <Button size="small" icon={<CheckOutlined />} onClick={() => abrirEntrega(r)}>
            Registrar Entrega
          </Button>
        ) : null,
    },
  ];

  // Ítems expandibles en la cola (muestra pendiente por entregar)
  const colsItemsCola = [
    { title: 'Medicamento', render: (_: any, r: any) => nombreMed(r) },
    { title: 'Presentación', render: (_: any, r: any) => r.medicamentoPrescripto?.presentacion ?? '-' },
    { title: 'Solicitado',  dataIndex: 'cantidadSolicitada' },
    { title: 'Ya entregado', dataIndex: 'cantidadEntregada' },
  ];

  // ── Columnas tabla historial ───────────────────────────────────────────────
  const colsHistorial = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Fecha', render: (_: any, r: any) => dayjs(r.creadoEn).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Paciente',
      render: (_: any, r: any) =>
        `#${r.internacion?.id ?? '?'} – ${r.internacion?.paciente?.apellido ?? '-'}`,
    },
    { title: 'Ítems', render: (_: any, r: any) => r.items?.length ?? 0 },
    { title: 'Estado', render: (_: any, r: any) => <EstadoTag estado={r.estado} /> },
  ];

  // Ítems expandibles en historial (muestra entrega completa)
  const colsItemsHistorial = [
    { title: 'Medicamento', render: (_: any, r: any) => nombreMed(r) },
    { title: 'Presentación', render: (_: any, r: any) => r.medicamentoPrescripto?.presentacion ?? '-' },
    { title: 'Solicitado',  dataIndex: 'cantidadSolicitada' },
    {
      title: 'Entregado',
      render: (_: any, r: any) => {
        const sol = Number(r.cantidadSolicitada);
        const ent = Number(r.cantidadEntregada);
        const pct = sol > 0 ? Math.round((ent / sol) * 100) : 0;
        return (
          <span style={{ color: ent >= sol ? '#389e0d' : '#d46b08' }}>
            {ent} <span style={{ color: '#999', fontSize: 12 }}>({pct}%)</span>
          </span>
        );
      },
    },
    {
      title: 'Devuelto',
      render: (_: any, r: any) => Number(r.cantidadDevuelta) > 0 ? Number(r.cantidadDevuelta) : '—',
    },
  ];

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'cola',
      label: (
        <span>
          <UnorderedListOutlined /> Cola de trabajo
        </span>
      ),
      children: (
        <Table
          dataSource={cola}
          columns={colsCola}
          rowKey="id"
          loading={loadingCola}
          size="small"
          pagination={{ pageSize: 15 }}
          expandable={{
            expandedRowRender: (r) => (
              <Table
                dataSource={r.items}
                rowKey="id"
                size="small"
                pagination={false}
                columns={colsItemsCola}
              />
            ),
          }}
        />
      ),
    },
    {
      key: 'historial',
      label: (
        <span>
          <HistoryOutlined /> Historial
        </span>
      ),
      children: (
        <>
          <Space style={{ marginBottom: 12 }} wrap>
            <Select
              allowClear
              placeholder="Todos los estados"
              style={{ width: 170 }}
              value={filtroEstado}
              onChange={(v) => setFiltroEstado(v)}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'parcial',   label: 'Parcial'   },
                { value: 'entregada', label: 'Entregada' },
              ]}
            />
            <RangePicker
              showTime
              format="DD/MM HH:mm"
              value={historialRango ?? undefined}
              onChange={(v) => setHistorialRango(v as [Dayjs, Dayjs] | null)}
              placeholder={['Desde (opcional)', 'Hasta (opcional)']}
            />
            <Button
              type="primary"
              onClick={() => cargarHistorial(filtroEstado, historialRango)}
            >
              Consultar
            </Button>
          </Space>
          <Table
            dataSource={historial}
            columns={colsHistorial}
            rowKey="id"
            loading={loadingHistorial}
            size="small"
            pagination={{ pageSize: 15 }}
            expandable={{
              expandedRowRender: (r) => (
                <Table
                  dataSource={r.items}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={colsItemsHistorial}
                />
              ),
            }}
          />
        </>
      ),
    },
  ];

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Botiquín</Typography.Title>}
        extra={
          puedeCrear && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setNuevaOpen(true); formNueva.resetFields(); setMedicamentos([]); }}
            >
              Nueva Solicitud
            </Button>
          )
        }
      >
        <Tabs
          defaultActiveKey="cola"
          items={tabItems}
          onChange={(key) => { if (key === 'historial') cargarHistorial(filtroEstado); }}
        />
      </Card>

      {/* ── Modal Nueva Solicitud ── */}
      <Modal
        title="Nueva Solicitud de Medicamentos"
        open={nuevaOpen}
        onCancel={() => { setNuevaOpen(false); formNueva.resetFields(); }}
        onOk={() => formNueva.submit()}
        okText="Crear Solicitud"
        width={560}
      >
        <Form form={formNueva} layout="vertical" onFinish={crearSolicitud}>
          <Form.Item name="internacionId" label="Internación" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              onChange={onSelectInternacion}
              options={internaciones.map((i) => ({
                value: i.id,
                label: `#${i.id} – ${i.paciente?.apellido ?? ''}, ${i.paciente?.nombre ?? ''}`,
              }))}
            />
          </Form.Item>

          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                    <Form.Item
                      {...rest}
                      name={[name, 'medicamentoPrescriptoId']}
                      label={name === 0 ? 'Prescripción de Medicamento' : ''}
                      rules={[{ required: true }]}
                      style={{ width: 320 }}
                    >
                      <Select
                        loading={loadingMeds}
                        options={medicamentos.map((m) => ({ value: m.id, label: m.label }))}
                        placeholder="Seleccionar medicamento prescripto"
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'cantidadSolicitada']}
                      label={name === 0 ? 'Cantidad' : ''}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} style={{ width: 90 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Form.Item label={name === 0 ? ' ' : undefined} colon={false} style={{ marginBottom: 0 }}>
                        <Button size="small" danger onClick={() => remove(name)}>–</Button>
                      </Form.Item>
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} style={{ marginTop: 4 }}>
                  Agregar ítem
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ── Modal Registrar Entrega ── */}
      <Modal
        title={`Registrar Entrega – Solicitud #${entregaId}`}
        open={entregaId !== null}
        onCancel={() => { setEntregaId(null); setSolicitudDetalle(null); formEntrega.resetFields(); }}
        onOk={registrarEntrega}
        okText="Confirmar Entrega"
        confirmLoading={confirmLoading}
        width={520}
      >
        <p style={{ marginBottom: 12, color: '#555' }}>
          Indicá la cantidad a entregar por ítem:
        </p>
        <Form form={formEntrega} layout="vertical">
          {(solicitudDetalle?.items ?? []).map((item: any) => (
            <Form.Item
              key={item.id}
              name={`c_${item.id}`}
              label={
                <span>
                  {nombreMed(item)}
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                    (solicitado: {Number(item.cantidadSolicitada)} · ya entregado: {Number(item.cantidadEntregada)})
                  </span>
                </span>
              }
            >
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </>
  );
}
