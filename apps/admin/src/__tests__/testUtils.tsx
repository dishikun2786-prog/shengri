import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CoreAdminContext, RecordContextProvider, ResourceContextProvider } from 'ra-core';
import { MemoryRouter } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: { main: '#c44520' },
    secondary: { main: '#dca310' },
    background: { default: '#fdf8f4', paper: '#ffffff' },
  },
});

export const mockDataProvider = {
  getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getOne: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  update: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  updateMany: vi.fn().mockResolvedValue({ data: [] }),
  delete: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  deleteMany: vi.fn().mockResolvedValue({ data: [] }),
};

export const mockAuthProvider = {
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  checkError: vi.fn().mockResolvedValue(undefined),
  getIdentity: vi.fn().mockResolvedValue({ id: 1, fullName: '管理员' }),
  getPermissions: vi.fn().mockResolvedValue(['admin']),
};

interface WrapperProps {
  children: ReactNode;
}

export function createAdminWrapper(initialRoute = '/') {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <CoreAdminContext dataProvider={mockDataProvider} authProvider={mockAuthProvider}>
          <ThemeProvider theme={theme}>
            {children}
          </ThemeProvider>
        </CoreAdminContext>
      </MemoryRouter>
    );
  };
}

export function renderWithAdmin(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { route?: string },
) {
  const { route = '/', ...renderOptions } = options || {};
  return render(ui, {
    wrapper: createAdminWrapper(route),
    ...renderOptions,
  });
}

export function renderWithTheme(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }: WrapperProps) => (
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    ),
    ...options,
  });
}

export function renderWithRecord(
  ui: React.ReactElement,
  record: Record<string, any>,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }: WrapperProps) => (
      <CoreAdminContext dataProvider={mockDataProvider}>
        <ThemeProvider theme={theme}>
          <RecordContextProvider value={record}>
            {children}
          </RecordContextProvider>
        </ThemeProvider>
      </CoreAdminContext>
    ),
    ...options,
  });
}

export function createResourceWrapper(
  dataProvider: any,
  authProvider: any,
  resource: string,
  route: string,
) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <CoreAdminContext dataProvider={dataProvider} authProvider={authProvider}>
          <ThemeProvider theme={theme}>
            <ResourceContextProvider value={resource}>
              {children}
            </ResourceContextProvider>
          </ThemeProvider>
        </CoreAdminContext>
      </MemoryRouter>
    );
  };
}

export function setMobileViewport() {
  (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
    (query: string) => ({
      matches: query.includes('max-width') || query.includes('down'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

export function setDesktopViewport() {
  (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
    (query: string) => ({
      matches: query.includes('min-width') || query.includes('up'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

export function mockFetchSuccess(data: any, headers?: Record<string, string>) {
  const mockHeaders = new Map(Object.entries(headers || {}));
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    headers: { get: (k: string) => mockHeaders.get(k) ?? null },
  });
}

export function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  });
}
