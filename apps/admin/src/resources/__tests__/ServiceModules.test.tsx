import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import ConsultationList from '../consultations/ConsultationList';
import ConsultationShow from '../consultations/ConsultationShow';
import MasterList from '../masters/MasterList';
import MasterEdit from '../masters/MasterEdit';
import DistributorList from '../distributors/DistributorList';
import DistributorEdit from '../distributors/DistributorEdit';
import DistributorCreate from '../distributors/DistributorCreate';
import CommissionList from '../commissions/CommissionList';
import CustomerList from '../crm/CustomerList';
import { CustomerEdit, CustomerCreate } from '../crm/CustomerEdit';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const createMockProvider = (listData: any[] = []) => ({
  getList: vi.fn().mockResolvedValue({ data: listData, total: listData.length }),
  getOne: vi.fn().mockResolvedValue({ data: listData[0] || { id: 1 } }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({ data: { id: 99 } }),
  update: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
});

const authProvider = {
  login: vi.fn(), logout: vi.fn(),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  checkError: vi.fn(),
  getIdentity: vi.fn().mockResolvedValue({ id: 1, fullName: 'Admin' }),
  getPermissions: vi.fn().mockResolvedValue(['admin']),
};

function renderWithRoutes(
  route: string,
  resource: string,
  dp: any,
  routeConfig: { path: string; element: React.ReactElement }[],
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CoreAdminContext dataProvider={dp} authProvider={authProvider}>
        <ThemeProvider theme={theme}>
          <ResourceContextProvider value={resource}>
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

describe('Consultation Module', () => {
  const mockData = [
    { id: 1, consultationNo: 'CON001', userId: 1, masterId: 1, consultationType: 'text', topic: '事业运势', paidAmount: 299, status: 1, createdAt: '2024-01-01', completedAt: null, question: '我想了解事业运', master: { displayName: '王大师' } },
  ];

  it('ConsultationList renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/consultations', 'consultations', dp, [
      { path: '/consultations', element: <ConsultationList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('ConsultationShow renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/consultations/1/show', 'consultations', dp, [
      { path: '/consultations/:id/show', element: <ConsultationShow /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });
});

describe('Master Module', () => {
  const mockData = [
    { id: 1, displayName: '王大师', title: '高级命理师', experienceYears: 15, totalConsultations: 342, avgRating: 4.8, totalReviews: 120, textPrice: 99, voicePrice: 199, totalEarnings: 50000, isFeatured: true, status: 1, createdAt: '2023-01-01' },
  ];

  it('MasterList renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/masters', 'masters', dp, [
      { path: '/masters', element: <MasterList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('MasterEdit renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/masters/1', 'masters', dp, [
      { path: '/masters/:id', element: <MasterEdit /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });
});

describe('Distributor Module', () => {
  const mockData = [
    { id: 1, userId: 5, level: 2, totalEarnings: 3200, withdrawnAmount: 2000, pendingAmount: 1200, totalOrders: 45, totalTeamSize: 12, status: 1, approvedAt: '2024-01-01', createdAt: '2023-06-01' },
  ];

  it('DistributorList renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/distributors', 'distributors', dp, [
      { path: '/distributors', element: <DistributorList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('DistributorEdit renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/distributors/1', 'distributors', dp, [
      { path: '/distributors/:id', element: <DistributorEdit /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });

  it('DistributorCreate renders', () => {
    const dp = createMockProvider(mockData);
    const { container } = renderWithRoutes('/distributors/create', 'distributors', dp, [
      { path: '/distributors/create', element: <DistributorCreate /> },
    ]);
    expect(container).toBeTruthy();
  });
});

describe('Commission Module', () => {
  const mockData = [
    { id: 1, distributorId: 1, orderId: 10, buyerId: 5, commissionLevel: 1, commissionRate: 0.1, commissionAmount: 30, orderAmount: 299, status: 1, settledAt: '2024-02-01', createdAt: '2024-01-15' },
  ];

  it('CommissionList renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/commission_records', 'commission_records', dp, [
      { path: '/commission_records', element: <CommissionList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });
});

describe('CRM Customer Module', () => {
  const mockData = [
    { id: 1, name: '赵六', phone: '13700137000', company: '科技公司', customerLevel: 'A', customerStage: 'negotiation', customerType: 'business', totalSpent: 5000, orderCount: 3, followCount: 8, lastFollowAt: '2024-06-01', nextFollowAt: '2024-06-15' },
  ];

  it('CustomerList renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/crm_customers', 'crm_customers', dp, [
      { path: '/crm_customers', element: <CustomerList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('CustomerEdit renders', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/crm_customers/1', 'crm_customers', dp, [
      { path: '/crm_customers/:id', element: <CustomerEdit /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });

  it('CustomerCreate renders', () => {
    const dp = createMockProvider(mockData);
    const { container } = renderWithRoutes('/crm_customers/create', 'crm_customers', dp, [
      { path: '/crm_customers/create', element: <CustomerCreate /> },
    ]);
    expect(container).toBeTruthy();
  });
});
