import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReportList from '../reports/ReportList';
import ReportShow from '../reports/ReportShow';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const mockReports = [
  { id: 1, uuid: 'uuid-001', userId: 1, reportType: 'wealth', aiProvider: 'minimax', aiModel: 'MiniMax-M2.5', promptVersion: 'v1', aiTokenUsed: 1500, viewCount: 42, shareCount: 5, isPaid: true, userRating: 5, aiContent: '这是一段AI生成的命理报告内容...', createdAt: '2024-01-01' },
];

const dataProvider = {
  getList: vi.fn().mockResolvedValue({ data: mockReports, total: 1 }),
  getOne: vi.fn().mockResolvedValue({ data: mockReports[0] }),
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
          <ResourceContextProvider value="reports">
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

describe('Report Module', () => {
  it('ReportList calls getList', async () => {
    renderWithRoutes('/reports', [{ path: '/reports', element: <ReportList /> }]);
    await waitFor(() => expect(dataProvider.getList).toHaveBeenCalled());
  });

  it('ReportShow calls getOne', async () => {
    renderWithRoutes('/reports/1/show', [{ path: '/reports/:id/show', element: <ReportShow /> }]);
    await waitFor(() => expect(dataProvider.getOne).toHaveBeenCalled());
  });
});
