import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OrderList from '../orders/OrderList';
import OrderShow from '../orders/OrderShow';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const mockOrders = [
  {
    id: 1, orderNo: 'ORD20240101001', userId: 1, productId: 1,
    originalAmount: 299, paidAmount: 199, discountAmount: 100,
    couponDiscount: 0, paymentMethod: 'wechat', paymentNo: 'WX123',
    status: 2, commissionL1: 20, commissionL2: 10,
    sourceChannel: 'direct', clientType: 'h5', ipAddress: '127.0.0.1',
    createdAt: '2024-01-01', paidAt: '2024-01-01', refundAt: null, refundReason: null,
    product: { name: '财运报告' }, user: { nickname: '张三', phone: '13800138000' },
  },
];

const dataProvider = {
  getList: vi.fn().mockResolvedValue({ data: mockOrders, total: 1 }),
  getOne: vi.fn().mockResolvedValue({ data: mockOrders[0] }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
};

const authProvider = {
  login: vi.fn(), logout: vi.fn(),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  checkError: vi.fn(),
  getIdentity: vi.fn().mockResolvedValue({ id: 1, fullName: 'Admin' }),
  getPermissions: vi.fn().mockResolvedValue(['admin']),
};

function renderWithRoutes(route: string, routeConfig: { path: string; element: React.ReactElement }[]) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CoreAdminContext dataProvider={dataProvider} authProvider={authProvider}>
        <ThemeProvider theme={theme}>
          <ResourceContextProvider value="orders">
            <Routes>
              {routeConfig.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Routes>
          </ResourceContextProvider>
        </ThemeProvider>
      </CoreAdminContext>
    </MemoryRouter>,
  );
}

describe('Order Module', () => {
  it('OrderList calls getList', async () => {
    renderWithRoutes('/orders', [{ path: '/orders', element: <OrderList /> }]);
    await waitFor(() => expect(dataProvider.getList).toHaveBeenCalled());
  });

  it('OrderShow calls getOne', async () => {
    renderWithRoutes('/orders/1/show', [{ path: '/orders/:id/show', element: <OrderShow /> }]);
    await waitFor(() => expect(dataProvider.getOne).toHaveBeenCalled());
  });
});
