import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La dirección que buscás no existe.</p>
      <Link to="/caja">Volver a Caja</Link>
    </section>
  )
}

export default NotFoundPage
