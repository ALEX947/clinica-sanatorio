import { useEffect, useState } from 'react';
import {
  Table, Card, Select, Tag, Typography, Tabs, Button, Modal, Form, Input,
  message, Space, DatePicker, InputNumber, Divider,
} from 'antd';
import { CheckOutlined, StopOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { internacionesApi, prescripcionesApi, profesionalesApi, nomencladorApi, errorMsg } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const estadoColor: Record<string, string> = {
  prescripta: 'orange',
  autorizada: 'blue',
  realizada: 'green',
  suspendida: 'red',
};

const PRESENTACIONES = ['comprimido', 'grajea', 'jarabe', 'suspension', 'inyectable', 'capsula', 'crema', 'otro'];

export default function PrescripcionesPage() {
  const { usuario } = useAuth();
  const [internaciones, setInternaciones] = useState<any[]>([]);
  const [internacionId, setInternacionId] = useState<number | null>(null);
  const [prescripciones, setPrescripciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [practicas, setPracticas] = useState<any[]>([]);

  const [autorizarId, setAutorizarId] = useState<number | null>(null);
  const [suspenderId, setSuspenderId] = useState<number | null>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [tipoPrescripcion, setTipoPrescripcion] = useState<string>('practica');

  const [formAutorizar] = Form.useForm();
  const [formSuspender] = Form.useForm();
  const [formNueva] = Form.useForm();

  const esMedico = ['admin', 'medico'].includes(usuario?.rol ?? '');
  const esMesaEntradas = ['admin', 'mesa_entradas'].includes(usuario?.rol ?? '');

  useEffect(() => {
    internacionesApi.list(true).then(setInternaciones).catch(() => {});
    profesionalesApi.list().then(setProfesionales).catch(() => {});
    nomencladorApi.search().then(setPracticas).catch(() => {});
  }, []);

  function cargarPrescripciones(id: number) {
    setLoading(true);
    prescripcionesApi.byInternacion(id)
      .then(setPrescripciones)
      .catch(() => message.error('Error al cargar prescripciones'))
      .finally(() => setLoading(false));
  }

  function onSelectInternacion(id: number) {
    setInternacionId(id);
    cargarPrescripciones(id);
  }

  async function autorizar(values: any) {
    if (!autorizarId) return;
    try {
      await prescripcionesApi.autorizar(autorizarId, values);
      message.success('Prescripción autorizada');
      setAutorizarId(null);
      formAutorizar.resetFields();
      if (internacionId) cargarPrescripciones(internacionId);
    } catch (err) {
      message.error(errorMsg(err, 'Error al autorizar'));
    }
  }

  async function suspender(values: any) {
    if (!suspenderId) return;
    try {
      await prescripcionesApi.suspender(suspenderId, values);
      message.success('Medicamento suspendido');
      setSuspenderId(null);
      formSuspender.resetFields();
      if (internacionId) cargarPrescripciones(internacionId);
    } catch (err) {
      message.error(errorMsg(err, 'Error al suspender'));
    }
  }

  async function prescribir(values: any) {
    if (!internacionId) return;
    try {
      const diagnosticos = (values.diagnosticos ?? []).filter((d: any) => d?.descripcion);
      if (tipoPrescripcion === 'practica') {
        await prescripcionesApi.prescribirPractica({
          internacionId,
          profesionalPrescriptorId: values.profesionalPrescriptorId,
          practicaId: values.practicaId,
          indicaciones: values.indicaciones,
          diagnosticos,
        });
      } else if (tipoPrescripcion === 'medicamento') {
        await prescripcionesApi.prescribirMedicamento({
          internacionId,
          profesionalPrescriptorId: values.profesionalPrescriptorId,
          droga: values.droga,
          concentracion: values.concentracion,
          presentacion: values.presentacion,
          inicioTratamiento: values.inicioTratamiento.toISOString(),
          finTratamiento: values.finTratamiento.toISOString(),
          periodicidadHoras: values.periodicidadHoras,
          cantidad: values.cantidad,
          diagnosticos,
        });
      } else {
        await prescripcionesApi.prescribirControl({
          internacionId,
          profesionalPrescriptorId: values.profesionalPrescriptorId,
          tipoControl: values.tipoControl,
          inicioControl: values.inicioControl.toISOString(),
          finControl: values.finControl.toISOString(),
          periodicidadHoras: values.periodicidadHoras,
          diagnosticos,
        });
      }
      message.success('Prescripción registrada');
      setNuevaOpen(false);
      formNueva.resetFields();
      cargarPrescripciones(internacionId);
    } catch (err) {
      message.error(errorMsg(err, 'Error al prescribir'));
    }
  }

  function filtradas(tipo: string) {
    return prescripciones.filter((p) => p.tipo === tipo);
  }

  function columnas(tipo: string) {
    return [
      { title: 'ID', dataIndex: 'id', width: 60 },
      { title: 'Fecha', render: (_: any, r: any) => dayjs(r.fechaHoraPrescripcion).format('DD/MM/YYYY HH:mm') },
      {
        title: 'Prescriptor',
        render: (_: any, r: any) =>
          r.profesionalPrescriptor
            ? `${r.profesionalPrescriptor.apellido}, ${r.profesionalPrescriptor.nombre}`
            : '-',
      },
      {
        title: 'Diagnósticos',
        render: (_: any, r: any) => r.diagnosticos?.map((d: any) => d.descripcion).join(', ') || '-',
      },
      {
        title: 'Estado',
        render: (_: any, r: any) => (
          <Tag color={estadoColor[r.estado]}>{r.estado.toUpperCase()}</Tag>
        ),
      },
      { title: 'Nro. Autorización', dataIndex: 'nroAutorizacion' },
      {
        title: 'Acciones',
        render: (_: any, r: any) => (
          <Space>
            {esMesaEntradas && r.estado === 'prescripta' && (
              <Button size="small" icon={<CheckOutlined />} onClick={() => setAutorizarId(r.id)}>
                Autorizar
              </Button>
            )}
            {esMedico && tipo === 'medicamento' && r.estado === 'autorizada' && (
              <Button size="small" danger icon={<StopOutlined />} onClick={() => setSuspenderId(r.id)}>
                Suspender
              </Button>
            )}
          </Space>
        ),
      },
    ];
  }

  const profesionalOptions = profesionales.map((p) => ({
    value: p.id,
    label: `${p.apellido}, ${p.nombre}`,
  }));

  return (
    <>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>Prescripciones</Typography.Title>}
        extra={
          esMedico && internacionId !== null && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNuevaOpen(true); setTipoPrescripcion('practica'); formNueva.resetFields(); }}>
              Nueva Prescripción
            </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            placeholder="Seleccionar internación activa..."
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            onChange={onSelectInternacion}
            options={internaciones.map((i) => ({
              value: i.id,
              label: `#${i.id} – ${i.paciente?.apellido ?? ''}, ${i.paciente?.nombre ?? ''} (${i.cama?.sector?.nombre ?? ''} – Cama ${i.cama?.numero ?? ''})`,
            }))}
          />

          {internacionId !== null && (
            <Tabs
              items={[
                {
                  key: 'practica',
                  label: 'Prácticas',
                  children: (
                    <Table dataSource={filtradas('practica')} columns={columnas('practica')} rowKey="id" loading={loading} size="small" />
                  ),
                },
                {
                  key: 'medicamento',
                  label: 'Medicamentos',
                  children: (
                    <Table dataSource={filtradas('medicamento')} columns={columnas('medicamento')} rowKey="id" loading={loading} size="small" />
                  ),
                },
                {
                  key: 'control_especial',
                  label: 'Controles Especiales',
                  children: (
                    <Table dataSource={filtradas('control_especial')} columns={columnas('control_especial')} rowKey="id" loading={loading} size="small" />
                  ),
                },
              ]}
            />
          )}
        </Space>
      </Card>

      {/* Modal Nueva Prescripción */}
      <Modal
        title="Nueva Prescripción"
        open={nuevaOpen}
        onCancel={() => { setNuevaOpen(false); formNueva.resetFields(); }}
        onOk={() => formNueva.submit()}
        okText="Prescribir"
        width={620}
      >
        <Form form={formNueva} layout="vertical" onFinish={prescribir}>
          <Form.Item label="Tipo de prescripción" required>
            <Select
              value={tipoPrescripcion}
              onChange={(v) => { setTipoPrescripcion(v); formNueva.resetFields(['practicaId','droga','concentracion','presentacion','inicioTratamiento','finTratamiento','periodicidadHoras','cantidad','tipoControl','inicioControl','finControl']); }}
              options={[
                { value: 'practica', label: 'Práctica / Estudio' },
                { value: 'medicamento', label: 'Medicamento' },
                { value: 'control_especial', label: 'Control Especial' },
              ]}
            />
          </Form.Item>

          <Form.Item name="profesionalPrescriptorId" label="Profesional que prescribe" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={profesionalOptions} />
          </Form.Item>

          {tipoPrescripcion === 'practica' && (
            <>
              <Form.Item name="practicaId" label="Práctica INOS" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={practicas.map((p) => ({ value: p.id, label: `[${p.codigo}] ${p.descripcion}` }))} />
              </Form.Item>
              <Form.Item name="indicaciones" label="Indicaciones">
                <Input.TextArea rows={2} />
              </Form.Item>
            </>
          )}

          {tipoPrescripcion === 'medicamento' && (
            <>
              <Space style={{ width: '100%' }} direction="vertical">
                <Space style={{ width: '100%' }}>
                  <Form.Item name="droga" label="Droga" rules={[{ required: true }]} style={{ flex: 2 }}>
                    <Input placeholder="Amoxicilina" />
                  </Form.Item>
                  <Form.Item name="concentracion" label="Concentración" rules={[{ required: true }]} style={{ flex: 1 }}>
                    <Input placeholder="500 mg" />
                  </Form.Item>
                </Space>
                <Space style={{ width: '100%' }}>
                  <Form.Item name="presentacion" label="Presentación" rules={[{ required: true }]}>
                    <Select style={{ width: 160 }} options={PRESENTACIONES.map((p) => ({ value: p, label: p }))} />
                  </Form.Item>
                  <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name="periodicidadHoras" label="Cada (hs)" rules={[{ required: true }]}>
                    <InputNumber min={1} max={72} style={{ width: 90 }} />
                  </Form.Item>
                </Space>
                <Space style={{ width: '100%' }}>
                  <Form.Item name="inicioTratamiento" label="Inicio" rules={[{ required: true }]}>
                    <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                  </Form.Item>
                  <Form.Item name="finTratamiento" label="Fin" rules={[{ required: true }]}>
                    <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                  </Form.Item>
                </Space>
              </Space>
            </>
          )}

          {tipoPrescripcion === 'control_especial' && (
            <>
              <Form.Item name="tipoControl" label="Tipo de Control" rules={[{ required: true }]}>
                <Input placeholder="ej: Temperatura, Presión arterial, Glucemia" />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Form.Item name="inicioControl" label="Inicio" rules={[{ required: true }]}>
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                </Form.Item>
                <Form.Item name="finControl" label="Fin" rules={[{ required: true }]}>
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" />
                </Form.Item>
                <Form.Item name="periodicidadHoras" label="Cada (hs)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={72} style={{ width: 90 }} />
                </Form.Item>
              </Space>
            </>
          )}

          <Divider>Diagnósticos</Divider>
          <Form.List name="diagnosticos" initialValue={[{ descripcion: '', prioridad: 1 }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                    <Form.Item {...rest} name={[name, 'prioridad']} label={name === 0 ? 'P.' : ''} rules={[{ required: true }]} style={{ width: 70 }}>
                      <InputNumber min={1} max={9} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'descripcion']} label={name === 0 ? 'Descripción' : ''} rules={[{ required: true }]} style={{ width: 380 }}>
                      <Input />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Form.Item label={name === 0 ? ' ' : undefined} colon={false} style={{ marginBottom: 0 }}>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Form.Item>
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ descripcion: '', prioridad: fields.length + 1 })} icon={<PlusOutlined />}>
                  Agregar diagnóstico
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Modal Autorizar */}
      <Modal
        title="Registrar Autorización OS"
        open={autorizarId !== null}
        onCancel={() => { setAutorizarId(null); formAutorizar.resetFields(); }}
        onOk={() => formAutorizar.submit()}
        okText="Confirmar"
      >
        <Form form={formAutorizar} layout="vertical" onFinish={autorizar}>
          <Form.Item name="nroAutorizacion" label="Nro. Autorización OS" rules={[{ required: true }]}>
            <Input placeholder="AUTH-2026-00123" />
          </Form.Item>
          <Form.Item name="coseguroCobrado" label="Coseguro cobrado ($)">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="nroComprobanteCoseguro" label="Nro. Comprobante Coseguro">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Suspender */}
      <Modal
        title="Suspender Medicamento"
        open={suspenderId !== null}
        onCancel={() => { setSuspenderId(null); formSuspender.resetFields(); }}
        onOk={() => formSuspender.submit()}
        okText="Confirmar"
        okButtonProps={{ danger: true }}
      >
        <Form form={formSuspender} layout="vertical" onFinish={suspender}>
          <Form.Item name="profesionalSuspensorId" label="Profesional que suspende" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={profesionalOptions} />
          </Form.Item>
          <Form.Item name="motivoSuspension" label="Motivo" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
