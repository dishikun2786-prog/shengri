import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import InfoIcon from '@mui/icons-material/Info';
import SectionCard from '../SectionCard';

describe('SectionCard', () => {
  it('renders title and children', () => {
    render(
      <SectionCard title="基础信息">
        <div>内容区域</div>
      </SectionCard>,
    );

    expect(screen.getByText('基础信息')).toBeInTheDocument();
    expect(screen.getByText('内容区域')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <SectionCard title="测试" icon={<InfoIcon data-testid="section-icon" />}>
        <div>Body</div>
      </SectionCard>,
    );

    expect(screen.getByTestId('section-icon')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <SectionCard title="测试" action={<button>操作</button>}>
        <div>Body</div>
      </SectionCard>,
    );

    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('renders Card element with Divider', () => {
    const { container } = render(
      <SectionCard title="测试"><div>Body</div></SectionCard>,
    );

    expect(container.querySelector('.MuiCard-root')).toBeInTheDocument();
    expect(container.querySelector('.MuiDivider-root')).toBeInTheDocument();
  });
});
