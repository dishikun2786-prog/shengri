import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StatCard from '../StatCard';
import { renderWithTheme } from '../../__tests__/testUtils';

describe('StatCard', () => {
  it('renders title, value, and subtitle', () => {
    renderWithTheme(
      <StatCard
        title="今日收入"
        value="¥128.00"
        icon={<AttachMoneyIcon />}
        color="#c44520"
        subtitle="本月: ¥3,200.00"
      />,
    );

    expect(screen.getByText('今日收入')).toBeInTheDocument();
    expect(screen.getByText('¥128.00')).toBeInTheDocument();
    expect(screen.getByText('本月: ¥3,200.00')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    renderWithTheme(
      <StatCard title="今日订单" value={42} icon={<AttachMoneyIcon />} />,
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders without subtitle', () => {
    renderWithTheme(
      <StatCard title="转化率" value="12.5%" icon={<AttachMoneyIcon />} />,
    );

    expect(screen.getByText('转化率')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('uses default color when not provided', () => {
    const { container } = renderWithTheme(
      <StatCard title="Test" value="100" icon={<AttachMoneyIcon />} />,
    );

    expect(container.querySelector('.MuiCard-root')).toBeInTheDocument();
  });

  it('renders the icon element', () => {
    renderWithTheme(
      <StatCard title="Test" value="100" icon={<AttachMoneyIcon data-testid="stat-icon" />} />,
    );

    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });
});
