import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomLoginPage from '../CustomLoginPage';
import { renderWithAdmin } from '../../__tests__/testUtils';

describe('CustomLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with brand elements', () => {
    renderWithAdmin(<CustomLoginPage />);

    expect(screen.getByText('ShengRi 管理后台')).toBeInTheDocument();
    expect(screen.getByText('专业级八字命理 SaaS 平台')).toBeInTheDocument();
    expect(screen.getByLabelText(/账号/)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/)).toBeInTheDocument();
    expect(screen.getByText('登 录')).toBeInTheDocument();
  });

  it('has required phone and password fields', () => {
    renderWithAdmin(<CustomLoginPage />);

    const phoneInput = screen.getByLabelText(/账号/);
    const passwordInput = screen.getByLabelText(/密码/);

    expect(phoneInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it('allows typing in phone and password fields', async () => {
    renderWithAdmin(<CustomLoginPage />);
    const user = userEvent.setup();

    const phoneInput = screen.getByLabelText(/账号/);
    const passwordInput = screen.getByLabelText(/密码/);

    await user.type(phoneInput, '13800138000');
    await user.type(passwordInput, 'password123');

    expect(phoneInput).toHaveValue('13800138000');
    expect(passwordInput).toHaveValue('password123');
  });

  it('password field has type=password', () => {
    renderWithAdmin(<CustomLoginPage />);
    const passwordInput = screen.getByLabelText(/密码/);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('renders yin-yang symbol', () => {
    renderWithAdmin(<CustomLoginPage />);
    expect(screen.getByText('☯')).toBeInTheDocument();
  });
});
