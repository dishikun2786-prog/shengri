import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomMenu from '../CustomMenu';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: { main: '#c44520' },
    secondary: { main: '#dca310' },
  },
});

function renderWithRouter(ui: React.ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );
}

describe('CustomMenu', () => {
  it('renders all 5 menu groups', () => {
    renderWithRouter(<CustomMenu />);

    expect(screen.getByText('核心业务')).toBeInTheDocument();
    expect(screen.getByText('内容管理')).toBeInTheDocument();
    expect(screen.getByText('服务管理')).toBeInTheDocument();
    expect(screen.getByText('营销分销')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  it('shows core group items when at root path', () => {
    renderWithRouter(<CustomMenu />, '/');

    expect(screen.getByText('数据大屏')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('订单管理')).toBeInTheDocument();
  });

  it('toggles group collapse on click', async () => {
    renderWithRouter(<CustomMenu />);
    const user = userEvent.setup();

    const contentHeader = screen.getByText('内容管理');
    await user.click(contentHeader);

    expect(screen.getByText('产品管理')).toBeInTheDocument();
    expect(screen.getByText('报告管理')).toBeInTheDocument();
    expect(screen.getByText('命盘管理')).toBeInTheDocument();
    expect(screen.getByText('Prompt管理')).toBeInTheDocument();
    expect(screen.getByText('规则引擎')).toBeInTheDocument();
  });

  it('calls onItemClick when a menu item is clicked', async () => {
    const onItemClick = vi.fn();
    renderWithRouter(<CustomMenu onItemClick={onItemClick} />);
    const user = userEvent.setup();

    const dashboardItem = screen.getByText('数据大屏');
    await user.click(dashboardItem);

    expect(onItemClick).toHaveBeenCalledOnce();
  });

  it('renders 14 total menu items across all groups', async () => {
    renderWithRouter(<CustomMenu />);
    const user = userEvent.setup();

    const groups = ['内容管理', '服务管理', '营销分销', '系统设置'];
    for (const group of groups) {
      await user.click(screen.getByText(group));
    }

    const expectedLabels = [
      '数据大屏', '用户管理', '订单管理',
      '产品管理', '报告管理', '命盘管理', 'Prompt管理', '规则引擎',
      '命理师', '咨询管理',
      '分销管理', '佣金记录', 'CRM客户',
      'AI模型配置',
    ];

    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('opens group containing current route', () => {
    renderWithRouter(<CustomMenu />, '/products');

    expect(screen.getByText('产品管理')).toBeInTheDocument();
  });
});
