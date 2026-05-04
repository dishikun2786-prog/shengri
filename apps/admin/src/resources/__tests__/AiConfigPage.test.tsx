import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { CoreAdminContext } from 'ra-core';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import AiConfigPage from '../ai-config/AiConfigPage';

const theme = createTheme({ palette: { primary: { main: '#c44520' } } });

const mockConfig = {
  defaultProvider: 'minimax',
  providers: [
    { provider: 'minimax', name: 'MiniMax', baseURL: 'https://api.minimax.chat', defaultModel: 'MiniMax-M2.5', hasKey: true, keyPreview: 'sk-***abc', isDefault: true, isActive: true, priority: 100 },
    { provider: 'openai', name: 'OpenAI', baseURL: 'https://api.openai.com', defaultModel: 'gpt-4', hasKey: true, keyPreview: 'sk-***xyz', isDefault: false, isActive: true, priority: 90 },
    { provider: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', hasKey: false, keyPreview: '', isDefault: false, isActive: true, priority: 80 },
  ],
};

const authProvider = {
  login: vi.fn(), logout: vi.fn().mockResolvedValue(undefined),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  checkError: vi.fn(),
  getIdentity: vi.fn().mockResolvedValue({ id: 1, fullName: 'Admin' }),
  getPermissions: vi.fn().mockResolvedValue(['admin']),
};

const dataProvider = {
  getList: vi.fn(), getOne: vi.fn(), getMany: vi.fn(),
  getManyReference: vi.fn(), create: vi.fn(), update: vi.fn(),
  updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ai-config']}>
      <CoreAdminContext dataProvider={dataProvider} authProvider={authProvider}>
        <ThemeProvider theme={theme}>
          <AiConfigPage />
        </ThemeProvider>
      </CoreAdminContext>
    </MemoryRouter>,
  );
}

describe('AiConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('shows loading skeleton initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders provider cards after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(mockConfig),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('MiniMax').length).toBeGreaterThan(0);
      expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DeepSeek').length).toBeGreaterThan(0);
    });
  });

  it('shows default provider badge', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(mockConfig),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('默认')).toBeInTheDocument();
    });
  });

  it('shows API key status for each provider', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(mockConfig),
    });

    renderPage();

    await waitFor(() => {
      const configuredChips = screen.getAllByText('已配置');
      expect(configuredChips.length).toBe(2);
      expect(screen.getByText('未配置')).toBeInTheDocument();
    });
  });

  it('disables test button for provider without API key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(mockConfig),
    });

    renderPage();

    await waitFor(() => {
      const testButtons = screen.getAllByText('测试连接');
      const deepseekButton = testButtons[2];
      expect(deepseekButton.closest('button')).toBeDisabled();
    });
  });

  it('shows error alert when config load fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500,
      json: () => Promise.resolve({}),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('AI 配置加载失败')).toBeInTheDocument();
    });
  });

  it('renders test prompt textarea', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(mockConfig),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('测试 Prompt')).toBeInTheDocument();
    });
  });
});
