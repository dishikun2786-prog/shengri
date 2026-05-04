import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserList from '../users/UserList';
import UserEdit from '../users/UserEdit';
import UserCreate from '../users/UserCreate';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const mockUsers = [
  { id: 1, phone: '13800138000', nickname: '张三', vipLevel: 2, identityType: 0, totalSpent: 580, sourceChannel: 'wechat', status: 1, createdAt: '2024-01-01', lastLoginAt: '2024-06-01' },
  { id: 2, phone: '13900139000', nickname: '李四', vipLevel: 0, identityType: 1, totalSpent: 0, sourceChannel: 'direct', status: 0, createdAt: '2024-02-01', lastLoginAt: null },
];

const dataProvider = {
  getList: vi.fn().mockResolvedValue({ data: mockUsers, total: 2 }),
  getOne: vi.fn().mockResolvedValue({ data: mockUsers[0] }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({ data: { id: 3 } }),
  update: vi.fn().mockResolvedValue({ data: mockUsers[0] }),
  updateMany: vi.fn().mockResolvedValue({ data: [] }),
  delete: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  deleteMany: vi.fn().mockResolvedValue({ data: [] }),
};

const authProvider = {
  login: vi.fn(),
  logout: vi.fn(),
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
          <ResourceContextProvider value="users">
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

describe('User Module', () => {
  describe('UserList', () => {
    it('renders and calls getList', async () => {
      renderWithRoutes('/users', [{ path: '/users', element: <UserList /> }]);
      await waitFor(() => expect(dataProvider.getList).toHaveBeenCalled());
    });

    it('calls getList with users resource', async () => {
      renderWithRoutes('/users', [{ path: '/users', element: <UserList /> }]);
      await waitFor(() => {
        expect(dataProvider.getList.mock.calls[0][0]).toBe('users');
      });
    });
  });

  describe('UserEdit', () => {
    it('renders the edit form and calls getOne', async () => {
      renderWithRoutes('/users/1', [{ path: '/users/:id', element: <UserEdit /> }]);
      await waitFor(() => expect(dataProvider.getOne).toHaveBeenCalled());
    });
  });

  describe('UserCreate', () => {
    it('renders the create form', () => {
      const { container } = renderWithRoutes('/users/create', [{ path: '/users/create', element: <UserCreate /> }]);
      expect(container).toBeTruthy();
    });
  });
});
