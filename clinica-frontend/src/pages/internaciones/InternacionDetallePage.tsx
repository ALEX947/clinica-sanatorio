import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Table, Typography, message, Spin, Space, Modal, Form, Input, Select,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { internacionesApi, prescripcionesApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const estadoInternacionColor: Record<string, string> = { activa: 'green', alta: 'default' };
const estadoPrescripcionColor: Record<string, string> = {
  prescripta: 'orange', autorizada: 'blue', realizada: 'green', suspendida: 'red',
};

export default function InternacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [internacion, setInternacion] = useState<any>(null);
  const [prescripciones, setPrescripciones] = useState<any[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [loadingPresc, setLoadingPresc] = useState(false);

  const [altaOpen, setAltaOpen] = useState(false);
  const [formAlta] = Form.useForm();
  const [altaLoading, setAltaLoading] = useState(false);

  const esMesaEntradas = ['admin', 'mesa_entradas'].includes(usuario?.rol ?? '');

  useEffect(() => {
    if (!id) return;
    internacionesApi.get(Number(id))
      .then(setInternacion)
      .catch(() => message.error('Error al cargar internación'))
      .finally(() => setLoadingInt(false));

    setLoadingPresc(true);
    prescripcionesApi.byInternacion(Number(id))
      .then(setPrescripciones)
      .catch(() => {})
      .finally(() => setLoadingPresc(false));
  }, [id]);

  async function darAlta(values: any) {
    if (!id) return;
    setAltaLoading(true);
    try {
      await internacionesApi.darAlta(Number(id), values);
      message.success('Alta registrada');
      setAltaOpen(false);
      formAlta.resetFields();
      internacionesApi.get(Number(id)).then(setInternacion);
    } catch {
      message.error('Error al dar el alta');
    } finally {
      setAltaLoading(false);
    }
  }

  if (loadingInt) return <Spin fullscreen />;
  if (!internacion) return <Typography.Text>Internación no encontrada.</Typography.Text>;

  const prescColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Tipo', render: (_: any, r: any) => r.tipo },
    {
      title: 'Fecha',
      render: (_: any, r: any) => dayjs(r.fechaHoraPrescripcion).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Prescriptor',
      render: (_: any, r: any) =>
        r.profesionalPrescriptor
          ? `${r.profesionalPrescriptor.apellido}, ${r.profesionalPrescriptor.nombre}`
          : '-',
    },
    {
      title: 'Estado',
      render: (_: any, r: any) => (
        <Tag color={estadoPrescripcionColor[r.estado]}>{r.estado.toUpperCase()}</Tag>
      ),
    },
    { title: 'Nro. Autorización', dataIndex: 'nroAutorizacion' },
  ];

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/internaciones')}>
            Volver
          </Button>
          {esMesaEntradas && internacion.estado === 'activa' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => setAltaOpen(true)}
            >
              Dar Alta
            </Button>
          )}
        </Space>

        <Card
          title={
            <Space>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Internación #{internacion.id}
              </Typography.Title>
              <Tag color={estadoInternacionColor[internacion.estado]}>
                {internacion.estado.toUpperCase()}
              </Tag>
            </Space>
          }
        >
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Paciente">
              {internacion.paciente?.apellido}, {internacion.paciente?.nombre}
            </Descriptions.Item>
            <Descriptions.Item label="DNI">{internacion.paciente?.dni}</Descriptions.Item>
            <Descriptions.Item label="Tipo">{internacion.tipo}</Descriptions.Item>
            <Descriptions.Item label="Obra Social">{internacion.obraSocial?.nombre}</Descriptions.Item>
            <Descriptions.Item label="Nro. Afiliado">{internacion.nroAfiliado ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Cama">
              {internacion.cama?.sector?.nombre} – Cama {internacion.cama?.numero}
            </Descriptions.Item>
            <Descriptions.Item label="Médico Interviniente">
              {internacion.profesionalInterviniente?.apellido},{' '}
              {internacion.profesionalInterviniente?.nombre}
            </Descriptions.Item>
            <Descriptions.Item label="Médico Prescriptor">
              {internacion.profesionalPrescriptor
                ? `${internacion.profesionalPrescriptor.apellido}, ${internacion.profesionalPrescriptor.nombre}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ingreso">
              {dayjs(internacion.fechaHoraIngreso).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Alta">
              {internacion.fechaHoraAlta
                ? dayjs(internacion.fechaHoraAlta).format('DD/MM/YYYY HH:mm')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Diagnósticos" span={2}>
              {internacion.diagnosticos
                ?.sort((a: any, b: any) => a.prioridad - b.prioridad)
                .map((d: any) => `[${d.prioridad}] ${d.descripcion}`)
                .join(' | ') ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Observaciones" span={2}>
              {internacion.observaciones ?? '-'}
            </Descriptions.Item>
          </Descriptions>

          {internacion.garantias?.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>Garantías</Typography.Title>
              <Table
                dataSource={internacion.garantias}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Tipo', dataIndex: 'tipo' },
                  { title: 'Monto', render: (_: any, r: any) => `$${Number(r.monto).toLocaleString('es-AR')}` },
                  { title: 'Comprobante', dataIndex: 'nroComprobante' },
                  { title: 'Estado', dataIndex: 'estado' },
                ]}
              />
            </>
          )}
        </Card>

        <Card title="Prescripciones">
          <Table
            dataSource={prescripciones}
            columns={prescColumns}
            rowKey="id"
            loading={loadingPresc}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>

      <Modal
        title="Dar Alta al Paciente"
        open={altaOpen}
        onCancel={() => { setAltaOpen(false); formAlta.resetFields(); }}
        onOk={() => formAlta.submit()}
        okText="Confirmar Alta"
        confirmLoading={altaLoading}
      >
        <Form form={formAlta} layout="vertical" onFinish={darAlta}>
          <Form.Item name="motivo" label="Motivo del Alta" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="curacion">Curación</Select.Option>
              <Select.Option value="mejoria">Mejoría</Select.Option>
              <Select.Option value="traslado">Traslado</Select.Option>
              <Select.Option value="fallecimiento">Fallecimiento</Select.Option>
              <Select.Option value="voluntaria">Voluntaria</Select.Option>
              <Select.Option value="otro">Otro</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
