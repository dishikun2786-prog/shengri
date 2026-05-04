import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import StatusField from '../StatusField';
import { renderWithRecord } from '../../__tests__/testUtils';

describe('StatusField', () => {
  describe('order status', () => {
    it.each([
      [0, '待付款'],
      [1, '已付款'],
      [2, '已完成'],
      [3, '退款中'],
      [4, '已退款'],
      [5, '已取消'],
    ])('renders order status %i as "%s"', (status, label) => {
      renderWithRecord(
        <StatusField source="status" type="order" />,
        { id: 1, status },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('user status', () => {
    it.each([
      [0, '禁用'],
      [1, '正常'],
    ])('renders user status %i as "%s"', (status, label) => {
      renderWithRecord(
        <StatusField source="status" type="user" />,
        { id: 1, status },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('vip level', () => {
    it.each([
      [0, '免费'],
      [1, '基础VIP'],
      [2, '高级VIP'],
      [3, '企业VIP'],
    ])('renders vip level %i as "%s"', (level, label) => {
      renderWithRecord(
        <StatusField source="vipLevel" type="vip" />,
        { id: 1, vipLevel: level },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('distributor status', () => {
    it.each([
      [0, '待审核'],
      [1, '正常'],
      [2, '冻结'],
    ])('renders distributor status %i as "%s"', (status, label) => {
      renderWithRecord(
        <StatusField source="status" type="distributor" />,
        { id: 1, status },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('consultation status', () => {
    it.each([
      [0, '待接单'],
      [1, '进行中'],
      [2, '已完成'],
      [3, '已取消'],
    ])('renders consultation status %i as "%s"', (status, label) => {
      renderWithRecord(
        <StatusField source="status" type="consultation" />,
        { id: 1, status },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('master status', () => {
    it.each([
      [0, '待审核'],
      [1, '已上架'],
      [2, '已下架'],
    ])('renders master status %i as "%s"', (status, label) => {
      renderWithRecord(
        <StatusField source="status" type="master" />,
        { id: 1, status },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('boolean type', () => {
    it('renders true as "是"', () => {
      renderWithRecord(
        <StatusField source="isActive" type="boolean" />,
        { id: 1, isActive: true },
      );
      expect(screen.getByText('是')).toBeInTheDocument();
    });

    it('renders false as "否"', () => {
      renderWithRecord(
        <StatusField source="isActive" type="boolean" />,
        { id: 1, isActive: false },
      );
      expect(screen.getByText('否')).toBeInTheDocument();
    });
  });

  it('renders unknown status value as string', () => {
    renderWithRecord(
      <StatusField source="status" type="order" />,
      { id: 1, status: 99 },
    );
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('returns null when no record context', () => {
    const { container } = renderWithRecord(
      <StatusField source="status" type="order" />,
      null as any,
    );
    expect(container.innerHTML).toBe('');
  });
});
