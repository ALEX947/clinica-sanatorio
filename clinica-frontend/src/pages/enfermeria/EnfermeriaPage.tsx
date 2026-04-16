import { useEffect, useState } from 'react';
import { Table, Button, Card, Tabs, DatePicker, Tag, message, Modal, Form, Input, Select, Typography, Space } from 'antd';
import { CheckOutlined, HistoryOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { enfermeriaApi, profesionalesApi } from '../../api/client';

const { RangePicker } = DatePicker;

const ESTADO_SUMINISTRO: Record<string, { color: string; label: string }> = {
  pendiente:    { color: 'orange', label: 'Pendiente'    },
  suministrado: { color: 'green',  label: 'Suministrado' },
  omitido:      { color: 'red',    label: 'Omitido'      },
  cancelado:    { color: 'default', label: 'Cancelado'   },
};

const ESTADO_CONTROL: Record<string, { color: string; label: string }> = {
  pendiente: { color: 'orange', label: 'Pendiente' },
  realizado: { color: 'green',  label: 'Realizado' },
  omitido:   { color: 'red',    label: 'Omitido'   },
  cancelado: { color: 'default', label: 'Cancelado' },
};

function TagEstado({ estado, map }: { estado: string; map: Record<string, { color: string; label: string }> }) {
  const cfg = map[estado] ?? { color: 'default', label: estado };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

export default function EnfermeriaPage() {
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [modalId, setModalId]             = useState<number | null>(null);
  const [modalTipo, setModalTipo]         = useState<'suministros' | 'controles'>('suministros');
  const [form]                            = Form.useForm();

  // ── Agenda ────────────────────────────────────────────────────────────────
  const [agendaTab, setAgendaTab]     = useState<'suministros' | 'controles'>('suministros');
  const [rango, setRango]             = useState<[Dayjs, Dayjs]>([dayjs(), dayjs().add(8, 'hour')]);
  const [agenda, setAgenda]           = useState<any[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  // ── Historial ─────────────────────────────────────────────────────────────
  const [historialTab, setHistorialTab]       = useState<'suministros' | 'controles'>('suministros');
  const [historialRango, setHistorialRango]   = useState<[Dayjs, Dayjs] | null>(null);
  const [historial, setHistorial]             = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    profesionalesApi.list().then(setProfesionales).catch(() => {});
  }, []);

  // ── Carga agenda ──────────────────────────────────────────────────────────
  function cargarAgenda() {
    setLoadingAgenda(true);
    const fn = agendaTab === 'suministros'
      ? enfermeriaApi.agendaSuministros
      : enfermeriaApi.cronogramaControles;
    fn(rango[0].toISOString(), rango[1].toISOString())
      .then(setAgenda)
      .catch(() => message.error('Error al cargar agenda'))
      .finally(() => setLoadingAgenda(false));
  }

  useEffect(() => { cargarAgenda(); }, [agendaTab, rango]);

  // ── Carga historial ───────────────────────────────────────────────────────
  function cargarHistorial() {
    setLoadingHistorial(true);
    const desde = historialRango?.[0].toISOString();
    const hasta  = historialRango?.[1].toISOString();
    const fn = historialTab === 'suministros'
      ? enfermeriaApi.historialSuministros
      : enfermeriaApi.historialControles;
    fn(desde, hasta)
      .then(setHistorial)
      .catch(() => message.error('Error al cargar historial'))
      .finally(() => setLoadingHistorial(false));
  }

  // ── Modal registrar ───────────────────────────────────────────────────────
  function abrirModal(id: number, tipo: 'suministros' | 'controles') {
    setModalId(id);
    setModalTipo(tipo);
    form.resetFields();
  }

  async function registrar(values: any) {
    if (!modalId) return;
    try {
      if (modalTipo === 'suministros') {
        await enfermeriaApi.registrarSuministro(modalId, values);
      } else {
        await enfermeriaApi.registrarControl(modalId, values);
      }
      message.success('Registrado correctamente');
      setModalId(null);
      form.resetFields();
      cargarAgenda();
    } catch {
      message.error('Error al registrar');
    }
  }

  // ── Columnas agenda suministros ───────────────────────────────────────────
  const colsAgendaSuministros = [
    { title: 'Planificado', render: (_: any, r: any) => dayjs(r.fechaHoraPlanificada).format('DD/MM HH:mm') },
    { title: 'Paciente',     render: (_: any, r: any) => r.medicamentoPrescripto?.prescripcion?.internacion?.paciente?.apellido ?? '-' },
    { title: 'Medicamento',  render: (_: any, r: any) => r.medicamentoPrescripto?.droga },
    { title: 'Concentración',render: (_: any, r: any) => r.medicamentoPrescripto?.concentracion },
    { title: 'Estado',       render: (_: any, r: any) => <TagEstado estado={r.estado} map={ESTADO_SUMINISTRO} /> },
    {
      title: '',
      render: (_: any, r: any) => r.estado === 'pendiente' && (
        <Button size="small" icon={<CheckOutlined />} onClick={() => abrirModal(r.id, 'suministros')}>
          Registrar
        </Button>
      ),
    },
  ];

  // ── Columnas agenda controles ─────────────────────────────────────────────
  const colsAgendaControles = [
    { title: 'Planificado', render: (_: any, r: any) => dayjs(r.fechaHoraPlanificada).format('DD/MM HH:mm') },
    { title: 'Tipo Control', render: (_: any, r: any) => r.controlEspecialPrescripto?.tipoControl },
    { title: 'Estado',       render: (_: any, r: any) => <TagEstado estado={r.estado} map={ESTADO_CONTROL} /> },
    { title: 'Resultado',    dataIndex: 'resultado' },
    {
      title: '',
      render: (_: any, r: any) => r.estado === 'pendiente' && (
        <Button size="small" icon={<CheckOutlined />} onClick={() => abrirModal(r.id, 'controles')}>
          Registrar
        </Button>
      ),
    },
  ];

  // ── Columnas historial suministros ────────────────────────────────────────
  const colsHistorialSuministros = [
    { title: 'Planificado',  render: (_: any, r: any) => dayjs(r.fechaHoraPlanificada).format('DD/MM/YYYY HH:mm') },
    { title: 'Realizado',    render: (_: any, r: any) => r.fechaHoraRealizada ? dayjs(r.fechaHoraRealizada).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Paciente',     render: (_: any, r: any) => r.medicamentoPrescripto?.prescripcion?.internacion?.paciente?.apellido ?? '-' },
    { title: 'Medicamento',  render: (_: any, r: any) => r.medicamentoPrescripto?.droga },
    { title: 'Concentración',render: (_: any, r: any) => r.medicamentoPrescripto?.concentracion },
    { title: 'Estado',       render: (_: any, r: any) => <TagEstado estado={r.estado} map={ESTADO_SUMINISTRO} /> },
    { title: 'Personal',     render: (_: any, r: any) => r.personalEnfermeria ? `${r.personalEnfermeria.apellido}, ${r.personalEnfermeria.nombre}` : '—' },
    { title: 'Observaciones',dataIndex: 'observaciones', render: (v: any) => v ?? '—' },
  ];

  // ── Columnas historial controles ──────────────────────────────────────────
  const colsHistorialControles = [
    { title: 'Planificado',  render: (_: any, r: any) => dayjs(r.fechaHoraPlanificada).format('DD/MM/YYYY HH:mm') },
    { title: 'Realizado',    render: (_: any, r: any) => r.fechaHoraRealizada ? dayjs(r.fechaHoraRealizada).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Tipo Control', render: (_: any, r: any) => r.controlEspecialPrescripto?.tipoControl },
    { title: 'Estado',       render: (_: any, r: any) => <TagEstado estado={r.estado} map={ESTADO_CONTROL} /> },
    { title: 'Resultado',    dataIndex: 'resultado', render: (v: any) => v ?? '—' },
    { title: 'Personal',     render: (_: any, r: any) => r.personalEnfermeria ? `${r.personalEnfermeria.apellido}, ${r.personalEnfermeria.nombre}` : '—' },
    { title: 'Observaciones',dataIndex: 'observaciones', render: (v: any) => v ?? '—' },
  ];

  // ── Tabs de agenda ────────────────────────────────────────────────────────
  const agendaTabItems = [
    {
      key: 'suministros',
      label: 'Agenda de Suministros',
      children: (
        <Table
          dataSource={agenda}
          columns={colsAgendaSuministros}
          rowKey="id"
          loading={loadingAgenda}
          size="small"
        />
      ),
    },
    {
      key: 'controles',
      label: 'Cronograma de Controles',
      children: (
        <Table
          dataSource={agenda}
          columns={colsAgendaControles}
          rowKey="id"
          loading={loadingAgenda}
          size="small"
        />
      ),
    },
  ];

  // ── Tabs de historial ─────────────────────────────────────────────────────
  const historialTabItems = [
    {
      key: 'suministros',
      label: 'Historial Suministros',
      children: (
        <Table
          dataSource={historial}
          columns={colsHistorialSuministros}
          rowKey="id"
          loading={loadingHistorial}
          size="small"
          pagination={{ pageSize: 15 }}
        />
      ),
    },
    {
      key: 'controles',
      label: 'Historial Controles',
      children: (
        <Table
          dataSource={historial}
          columns={colsHistorialControles}
          rowKey="id"
          loading={loadingHistorial}
          size="small"
          pagination={{ pageSize: 15 }}
        />
      ),
    },
  ];

  return (
    <>
      {/* ── Agenda ── */}
      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <CalendarOutlined />
            <Typography.Title level={4} style={{ margin: 0 }}>Agenda</Typography.Title>
          </Space>
        }
        extra={
          <RangePicker
            showTime
            format="DD/MM HH:mm"
            value={rango}
            onChange={(v) => v && setRango(v as [Dayjs, Dayjs])}
          />
        }
      >
        <Tabs
          activeKey={agendaTab}
          onChange={(k) => setAgendaTab(k as 'suministros' | 'controles')}
          items={agendaTabItems}
        />
      </Card>

      {/* ── Historial ── */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <Typography.Title level={4} style={{ margin: 0 }}>Historial</Typography.Title>
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              showTime
              format="DD/MM HH:mm"
              value={historialRango ?? undefined}
              onChange={(v) => setHistorialRango(v as [Dayjs, Dayjs] | null)}
              placeholder={['Desde (opcional)', 'Hasta (opcional)']}
            />
            <Button onClick={cargarHistorial}>Consultar</Button>
          </Space>
        }
      >
        <Tabs
          activeKey={historialTab}
          onChange={(k) => setHistorialTab(k as 'suministros' | 'controles')}
          items={historialTabItems}
        />
      </Card>

      {/* ── Modal Registrar ── */}
      <Modal
        title={modalTipo === 'suministros' ? 'Registrar Suministro' : 'Registrar Control'}
        open={modalId !== null}
        onCancel={() => { setModalId(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Confirmar"
      >
        <Form form={form} layout="vertical" onFinish={registrar}>
          <Form.Item name="personalEnfermeriaId" label="Personal de Enfermería" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={profesionales.map((p) => ({
                value: p.id,
                label: `${p.apellido}, ${p.nombre}`,
              }))}
            />
          </Form.Item>
          {modalTipo === 'controles' && (
            <Form.Item name="resultado" label="Resultado" rules={[{ required: true }]}>
              <Input placeholder="ej: Temperatura 37.5°C, Presión 12/8" />
            </Form.Item>
          )}
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
