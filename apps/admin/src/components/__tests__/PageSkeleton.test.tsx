import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageSkeleton from '../PageSkeleton';

describe('PageSkeleton', () => {
  it('renders list skeleton by default', () => {
    const { container } = render(<PageSkeleton />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders detail skeleton', () => {
    const { container } = render(<PageSkeleton type="detail" />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders form skeleton', () => {
    const { container } = render(<PageSkeleton type="form" />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
