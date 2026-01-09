import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { lazyNamed } from './lazyNamed.js'
import { RouteFallback } from './shared/RouteFallback.jsx'

const PublicLayout = lazyNamed(() => import('./layouts/PublicLayout.jsx'), 'PublicLayout')
const AdminLayout = lazyNamed(() => import('./layouts/AdminLayout.jsx'), 'AdminLayout')
const RequireAdmin = lazyNamed(() => import('./guards/RequireAdmin.jsx'), 'RequireAdmin')

const HomePage = lazyNamed(() => import('../features/home/HomePage.jsx'), 'HomePage')
const NotFoundPage = lazyNamed(() => import('../features/not-found/NotFoundPage.jsx'), 'NotFoundPage')

const AuthLoginPage = lazyNamed(() => import('../pages/AuthLogin.jsx'), 'AuthLoginPage')
const AuthRegisterPage = lazyNamed(() => import('../pages/AuthRegister.jsx'), 'AuthRegisterPage')
const CatalogPage = lazyNamed(() => import('../pages/Catalog.jsx'), 'CatalogPage')
const ProductDetailsPage = lazyNamed(() => import('../pages/ProductDetails.jsx'), 'ProductDetailsPage')
const CartPage = lazyNamed(() => import('../pages/Cart.jsx'), 'CartPage')
const MyOrdersPage = lazyNamed(() => import('../pages/MyOrders.jsx'), 'MyOrdersPage')
const MyOrderDetailsPage = lazyNamed(() => import('../pages/MyOrderDetails.jsx'), 'MyOrderDetailsPage')
const ProfilePage = lazyNamed(() => import('../pages/Profile.jsx'), 'ProfilePage')

const AdminDashboardPage = lazyNamed(() => import('../pages/admin/AdminDashboard.jsx'), 'AdminDashboardPage')
const AdminProductsPage = lazyNamed(() => import('../pages/admin/AdminProducts.jsx'), 'AdminProductsPage')
const AdminOrdersPage = lazyNamed(() => import('../pages/admin/AdminOrders.jsx'), 'AdminOrdersPage')
const AdminOrderDetailsPage = lazyNamed(() => import('../pages/admin/AdminOrderDetails.jsx'), 'AdminOrderDetailsPage')
const AdminCartsPage = lazyNamed(() => import('../pages/admin/AdminCarts.jsx'), 'AdminCartsPage')

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<Navigate to="/" replace />} />

          {/* MVP: pages publiques */}
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:id/:slug" element={<ProductDetailsPage />} />
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
            <Route path="carts" element={<AdminCartsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
