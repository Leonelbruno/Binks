export interface NavItem {
  label: string
  path: string
}

// Secciones del menú principal, en el orden en que se muestran.
export const navItems: NavItem[] = [
  { label: 'Caja', path: '/caja' },
  { label: 'Pedidos', path: '/pedidos' },
  { label: 'Repartidores', path: '/repartidores' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Productos', path: '/productos' },
  { label: 'Facturación', path: '/facturacion' },
  { label: 'Configuración', path: '/configuracion' },
]
