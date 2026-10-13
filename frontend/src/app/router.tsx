import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout/AppLayout'
import SalesPage from '../features/sales/pages/SalesPage'
import OrdersPage from '../features/orders/pages/OrdersPage'
import DeliveryPage from '../features/delivery/pages/DeliveryPage'
import CustomersPage from '../features/customers/pages/CustomersPage'
import ProductsPage from '../features/products/pages/ProductsPage'
import BillingPage from '../features/billing/pages/BillingPage'
import SettingsPage from '../features/settings/pages/SettingsPage'
import NotFoundPage from './NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/caja" replace /> },
      { path: 'caja', element: <SalesPage /> },
      { path: 'pedidos', element: <OrdersPage /> },
      { path: 'repartidores', element: <DeliveryPage /> },
      { path: 'clientes', element: <CustomersPage /> },
      { path: 'productos', element: <ProductsPage /> },
      { path: 'facturacion', element: <BillingPage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
