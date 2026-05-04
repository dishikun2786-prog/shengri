import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前列表为空，请添加新的记录。')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <EmptyState title="没有订单" description="当前没有订单数据" />,
    );

    expect(screen.getByText('没有订单')).toBeInTheDocument();
    expect(screen.getByText('当前没有订单数据')).toBeInTheDocument();
  });

  it('renders action button when provided', async () => {
    const onAction = vi.fn();
    render(
      <EmptyState actionLabel="新建记录" onAction={onAction} />,
    );

    const button = screen.getByText('新建记录');
    expect(button).toBeInTheDocument();
    await userEvent.click(button);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('does not render action button when label/handler missing', () => {
    render(<EmptyState actionLabel="新建" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
