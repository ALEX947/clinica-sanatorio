import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Página no encontrada"
      subTitle="La página que buscás no existe o no está disponible."
      extra={
        <Link to="/">
          <Button type="primary">Volver al inicio</Button>
        </Link>
      }
    />
  );
}
