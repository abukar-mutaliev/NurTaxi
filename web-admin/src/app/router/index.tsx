import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/widgets/app-layout';
import { ProtectedRoute } from './protected-route';
import { RoleRoute } from './role-route';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { RegionsPage, RegionDetailPage } from '@/pages/regions';
import { TariffsPage } from '@/pages/tariffs';
import { ProvidersPage } from '@/pages/providers';
import { StaffPage } from '@/pages/staff';
import { DriversPage, DriverDetailPage } from '@/pages/drivers';
import { AppealsPage } from '@/pages/appeals';
import { AuditPage } from '@/pages/audit';
import { OrdersPage, OrderDetailPage } from '@/pages/orders';
import { CarriersPage } from '@/pages/carriers';
import { PlacementPage } from '@/pages/placement';
import { ExportsPage } from '@/pages/exports';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route
              path="regions"
              element={
                <RoleRoute permission="regions.manage">
                  <RegionsPage />
                </RoleRoute>
              }
            />
            <Route
              path="regions/:id"
              element={
                <RoleRoute permission="regions.manage">
                  <RegionDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="tariffs"
              element={
                <RoleRoute permission="tariffs.manage">
                  <TariffsPage />
                </RoleRoute>
              }
            />
            <Route
              path="providers"
              element={
                <RoleRoute permission="providers.manage">
                  <ProvidersPage />
                </RoleRoute>
              }
            />
            <Route
              path="staff"
              element={
                <RoleRoute permission="staff.manage">
                  <StaffPage />
                </RoleRoute>
              }
            />
            <Route
              path="audit"
              element={
                <RoleRoute permission="audit.view">
                  <AuditPage />
                </RoleRoute>
              }
            />
            <Route
              path="drivers"
              element={
                <RoleRoute permission="drivers.moderate">
                  <DriversPage />
                </RoleRoute>
              }
            />
            <Route
              path="drivers/:id"
              element={
                <RoleRoute permission="drivers.moderate">
                  <DriverDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="appeals"
              element={
                <RoleRoute permission="appeals.manage">
                  <AppealsPage />
                </RoleRoute>
              }
            />
            <Route
              path="orders"
              element={
                <RoleRoute permission="orders.manage">
                  <OrdersPage />
                </RoleRoute>
              }
            />
            <Route
              path="orders/:id"
              element={
                <RoleRoute permission="orders.manage">
                  <OrderDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="carriers"
              element={
                <RoleRoute permission="carriers.manage">
                  <CarriersPage />
                </RoleRoute>
              }
            />
            <Route
              path="placement"
              element={
                <RoleRoute permission="sites.manage">
                  <PlacementPage />
                </RoleRoute>
              }
            />
            <Route
              path="exports"
              element={
                <RoleRoute permission="orders.export">
                  <ExportsPage />
                </RoleRoute>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
