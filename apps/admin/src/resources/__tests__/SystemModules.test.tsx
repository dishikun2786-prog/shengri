import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext, ResourceContextProvider } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import PromptList from '../prompts/PromptList';
import { PromptEdit, PromptCreate } from '../prompts/PromptEdit';
import RuleList from '../rules/RuleList';
import { RuleEdit, RuleCreate } from '../rules/RuleEdit';
import ChartList from '../charts/ChartList';

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

describe('Prompt Module', () => {
  const mockData = [
    { id: 1, promptId: 'PRO001', module: 'wealth', name: '财运提示词', version: 'v2', modelProvider: 'minimax', modelName: 'MiniMax-M2.5', temperature: 0.7, conversionRate: 0.35, abGroup: 'ALL', isActive: true, updatedAt: '2024-06-01', systemPrompt: 'You are...', content: '请分析...', maxTokens: 4000 },
  ];

  it('PromptList calls getList', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/prompts', 'prompts', dp, [
      { path: '/prompts', element: <PromptList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('PromptEdit calls getOne', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/prompts/1', 'prompts', dp, [
      { path: '/prompts/:id', element: <PromptEdit /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });

  it('PromptCreate renders', () => {
    const dp = createMockProvider(mockData);
    const { container } = renderWithRoutes('/prompts/create', 'prompts', dp, [
      { path: '/prompts/create', element: <PromptCreate /> },
    ]);
    expect(container).toBeTruthy();
  });
});

describe('Rule Module', () => {
  const mockData = [
    { id: 1, ruleId: 'R001', name: '财运强旺规则', module: 'wealth', version: 'v1', priority: 100, hitCount: 523, abGroup: 'ALL', isActive: true, updatedAt: '2024-05-01', description: '当日干强旺时...', conditions: { dayMaster: 'strong' }, actions: { output: '财运亨通' }, author: '系统' },
  ];

  it('RuleList calls getList', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/rules', 'rules', dp, [
      { path: '/rules', element: <RuleList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });

  it('RuleEdit calls getOne', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/rules/1', 'rules', dp, [
      { path: '/rules/:id', element: <RuleEdit /> },
    ]);
    await waitFor(() => expect(dp.getOne).toHaveBeenCalled());
  });

  it('RuleCreate renders', () => {
    const dp = createMockProvider(mockData);
    const { container } = renderWithRoutes('/rules/create', 'rules', dp, [
      { path: '/rules/create', element: <RuleCreate /> },
    ]);
    expect(container).toBeTruthy();
  });
});

describe('Chart Module', () => {
  const mockData = [
    { id: 1, uuid: 'chart-001', userId: 1, name: '张三', gender: 1, solarDate: '1990-05-15', solarTime: '14:00', yearGan: '庚', yearZhi: '午', monthGan: '辛', monthZhi: '巳', dayGan: '甲', dayZhi: '子', hourGan: '辛', hourZhi: '未', patternType: '正官格', strengthLevel: '身弱', isPrimary: true, createdAt: '2024-01-01' },
  ];

  it('ChartList calls getList', async () => {
    const dp = createMockProvider(mockData);
    renderWithRoutes('/charts', 'charts', dp, [
      { path: '/charts', element: <ChartList /> },
    ]);
    await waitFor(() => expect(dp.getList).toHaveBeenCalled());
  });
});
