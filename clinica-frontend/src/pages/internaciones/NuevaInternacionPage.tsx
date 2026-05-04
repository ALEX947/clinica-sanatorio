import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Button, Typography, message, Space, Divider, InputNumber,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { pacientesApi, profesionalesApi, obrasSocialesApi, camasApi, internacionesApi, errorMsg } from '../../api/client';

export default function NuevaInternacionPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [obrasSociales, setObrasSociales] = useState<any[]>([]);
  const [camas, setCamas] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      pacientesApi.list(),
      profesionalesApi.list(),
      obrasSocialesApi.list(),
      camasApi.disponibles(),
    ]).then(([p, prof, os, c]) => {
      setPacientes(p);
      setProfesionales(prof);
      setObrasSociales(os);
      setCamas(c);
    }).catch(() => message.error('Error al cargar datos'));
  }, []);

  async function onFinish(values: any) {
    setLoading(true);
    try {
      const dto: any = {
        tipo: values.tipo,
        pacienteId: values.pacienteId,
        profesionalIntervinienteId: values.profesionalIntervinienteId,
        obraSocialId: values.obraSocialId,
        camaId: values.camaId,
        nroAfiliado: values.nroAfiliado,
        observaciones: values.observaciones,
        diagnosticos: values.diagnosticos ?? [],
      };
      if (values.profesionalPrescriptorId) {
        dto.profesionalPrescriptorId = values.profesionalPrescriptorId;
      }
      if (values.garantiaTipo) {
        dto.garantia = {
          tipo: values.garantiaTipo,
          monto: values.garantiaMonto,
          nroComprobante: values.garantiaComprobante,
        };
      }
      await internacionesApi.iniciar(dto);
      message.success('Internación iniciada correctamente');
      navigate('/internaciones');
    } catch (err) {
      message.error(errorMsg(err, 'Error al iniciar la internación'));
    } finally {
      setLoading(false);
    }
  }

  const profesionalOptions = profesionales.map((p) => ({
    value: p.id,
    label: `${p.apellido}, ${p.nombre} (${p.tipoProfesion?.nombre ?? ''})`,
  }));

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/internaciones')} />
          <Typography.Title level={4} style={{ margin: 0 }}>Nueva Internación</Typography.Title>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 720 }}>
        <Form.Item name="tipo" label="Tipo de Internación" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="programada">Programada</Select.Option>
            <Select.Option value="urgente">Urgente</Select.Option>
            <Select.Option value="emergente">Emergente</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="pacienteId" label="Paciente" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={pacientes.map((p) => ({
              value: p.id,
              label: `${p.apellido}, ${p.nombre} – DNI: ${p.dni}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="profesionalIntervinienteId" label="Profesional Interviniente" rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="label" options={profesionalOptions} />
        </Form.Item>

        <Form.Item name="profesionalPrescriptorId" label="Profesional que prescribe internación (opcional)">
          <Select showSearch optionFilterProp="label" options={profesionalOptions} allowClear />
        </Form.Item>

        <Form.Item name="obraSocialId" label="Obra Social" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={obrasSociales.map((o) => ({ value: o.id, label: o.nombre }))}
            onChange={() => form.validateFields(['nroAfiliado'])}
          />
        </Form.Item>

        <Form.Item
          name="nroAfiliado"
          label="Nro. de Afiliado"
          dependencies={['obraSocialId']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const osId = getFieldValue('obraSocialId');
                const os = obrasSociales.find((o) => o.id === osId);
                const esParticular = !os || os.nombre.toLowerCase().includes('particular');
                if (!esParticular && !value?.trim()) {
                  return Promise.reject(new Error('Obligatorio para esta obra social'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="camaId" label="Cama" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={camas.map((c) => ({
              value: c.id,
              label: `${c.sector?.nombre} – Cama ${c.numero}${c.individual ? ' (Individual)' : ''}`,
            }))}
          />
        </Form.Item>

        <Divider>Diagnósticos</Divider>

        <Form.List name="diagnosticos" initialValue={[{ descripcion: '', prioridad: 1 }]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                  <Form.Item
                    {...rest}
                    name={[name, 'prioridad']}
                    label={name === 0 ? 'Prioridad' : ''}
                    rules={[{ required: true }]}
                    style={{ width: 90 }}
                  >
                    <InputNumber min={1} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    {...rest}
                    name={[name, 'descripcion']}
                    label={name === 0 ? 'Descripción del diagnóstico' : ''}
                    rules={[{ required: true }]}
                    style={{ width: 480 }}
                  >
                    <Input placeholder="Ej: Neumonía bilateral" />
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

        <Divider>Garantía (opcional)</Divider>

        <Space align="baseline" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="garantiaTipo" label="Tipo de garantía">
            <Select style={{ width: 160 }} allowClear>
              <Select.Option value="deposito">Depósito</Select.Option>
              <Select.Option value="pagare">Pagaré</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="garantiaMonto" label="Monto ($)">
            <InputNumber min={0} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="garantiaComprobante" label="Nro. Comprobante">
            <Input style={{ width: 180 }} placeholder="REC-001" />
          </Form.Item>
        </Space>

        <Form.Item name="observaciones" label="Observaciones">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Iniciar Internación
            </Button>
            <Button onClick={() => navigate('/internaciones')}>Cancelar</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
