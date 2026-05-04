import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductList from '../products/ProductList';
import { ProductEdit, ProductCreate } from '../products/ProductEdit';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const mockProducts = [
  { id: 1, productCode: 'P001', name: '财运报告', category: 'standard', reportType: 'wealth', originalPrice: 299, currentPrice: 199, commissionRateL1: 0.1, commissionRateL2: 0.05, isActive: true, sortOrder: 1 },
];

const dataProvider = {
  getList: vi.fn().mockResolvedValue({ data: mockProducts, total: 1 }),
  getOne: vi.fn().mockResolvedValue({ data: mockProducts[0] }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({ data: { id: 2 } }),
  update: vi.fn().mockResolvedValue({ data: mockProducts[0] }),
  updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
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
          <ResourceContextProvider value="products">
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

describe('Product Module', () => {
  it('ProductList calls getList', async () => {
    renderWithRoutes('/products', [{ path: '/products', element: <ProductList /> }]);
    await waitFor(() => expect(dataProvider.getList).toHaveBeenCalled());
  });

  it('ProductEdit calls getOne', async () => {
    renderWithRoutes('/products/1', [{ path: '/products/:id', element: <ProductEdit /> }]);
    await waitFor(() => expect(dataProvider.getOne).toHaveBeenCalled());
  });

  it('ProductCreate renders', () => {
    const { container } = renderWithRoutes('/products/create', [{ path: '/products/create', element: <ProductCreate /> }]);
    expect(container).toBeTruthy();
  });
});
