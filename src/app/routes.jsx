import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from './layouts/AdminLayout.jsx'
import { PublicLayout } from './layouts/PublicLayout.jsx'
import { RequireAdmin } from './guards/RequireAdmin.jsx'

import { HomePage } from '../features/home/HomePage.jsx'
import { NotFoundPage } from '../features/not-found/NotFoundPage.jsx'

import { AdminDashboardPage } from '../pages/admin/AdminDashboard.jsx'
import { AdminOrderDetailsPage } from '../pages/admin/AdminOrderDetails.jsx'
import { AdminOrdersPage } from '../pages/admin/AdminOrders.jsx'
import { AdminProductsPage } from '../pages/admin/AdminProducts.jsx'
import { AuthLoginPage } from '../pages/AuthLogin.jsx'
import { AuthRegisterPage } from '../pages/AuthRegister.jsx'
import { CartPage } from '../pages/Cart.jsx'
import { CatalogPage } from '../pages/Catalog.jsx'
import { MyOrderDetailsPage } from '../pages/MyOrderDetails.jsx'
import { MyOrdersPage } from '../pages/MyOrders.jsx'
import { ProfilePage } from '../pages/Profile.jsx'
import { ProductDetailsPage } from '../pages/ProductDetails.jsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="home" element={<Navigate to="/" replace />} />

        {/* MVP: pages publiques */}
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="product/:id" element={<ProductDetailsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="my-orders/:id" element={<MyOrderDetailsPage />} />
        <Route path="my-orders" element={<MyOrdersPage />} />
        <Route path="login" element={<AuthLoginPage />} />
        <Route path="register" element={<AuthRegisterPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* MVP: admin */}
      <Route element={<RequireAdmin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
