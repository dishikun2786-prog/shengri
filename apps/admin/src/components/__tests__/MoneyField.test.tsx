import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import MoneyField from '../MoneyField';
import { renderWithRecord } from '../../__tests__/testUtils';

describe('MoneyField', () => {
  it('renders money value with default prefix', () => {
    renderWithRecord(
      <MoneyField source="amount" />,
      { id: 1, amount: 128.5 },
    );
    expect(screen.getByText('¥128.50')).toBeInTheDocument();
  });

  it('renders with custom prefix', () => {
    renderWithRecord(
      <MoneyField source="amount" prefix="$" />,
      { id: 1, amount: 99.99 },
    );
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('renders zero value', () => {
    renderWithRecord(
      <MoneyField source="amount" />,
      { id: 1, amount: 0 },
    );
    expect(screen.getByText('¥0.00')).toBeInTheDocument();
  });

  it('handles null/undefined value as 0', () => {
    renderWithRecord(
      <MoneyField source="amount" />,
      { id: 1, amount: null },
    );
    expect(screen.getByText('¥0.00')).toBeInTheDocument();
  });

  it('compact mode shows 万 for values >= 10000', () => {
    renderWithRecord(
      <MoneyField source="amount" compact />,
      { id: 1, amount: 15000 },
    );
    expect(screen.getByText('¥1.5万')).toBeInTheDocument();
  });

  it('compact mode shows normal format for values < 10000', () => {
    renderWithRecord(
      <MoneyField source="amount" compact />,
      { id: 1, amount: 9999 },
    );
    expect(screen.getByText('¥9999.00')).toBeInTheDocument();
  });

  it('returns null when no record context', () => {
    const { container } = renderWithRecord(
      <MoneyField source="amount" />,
      null as any,
    );
    expect(container.innerHTML).toBe('');
  });
});
