import { describe, it, expect } from 'vitest';
import theme from '../theme';

describe('theme', () => {
  it('has correct primary color', () => {
    expect(theme.palette.primary.main).toBe('#c44520');
    expect(theme.palette.primary.light).toBe('#d86a4a');
    expect(theme.palette.primary.dark).toBe('#8a3016');
  });

  it('has correct secondary color', () => {
    expect(theme.palette.secondary.main).toBe('#dca310');
  });

  it('has warm paper background', () => {
    expect(theme.palette.background.default).toBe('#fdf8f4');
    expect(theme.palette.background.paper).toBe('#ffffff');
  });

  it('uses KaiTi font family', () => {
    expect(theme.typography.fontFamily).toContain('KaiTi');
    expect(theme.typography.fontFamily).toContain('楷体');
  });

  it('has border radius set', () => {
    expect(theme.shape.borderRadius).toBe(8);
  });

  it('has component overrides', () => {
    expect(theme.components).toBeDefined();
    expect(theme.components!.MuiAppBar).toBeDefined();
    expect(theme.components!.MuiButton).toBeDefined();
    expect(theme.components!.MuiCard).toBeDefined();
    expect(theme.components!.MuiTableCell).toBeDefined();
  });

  it('has semantic colors defined', () => {
    expect(theme.palette.error.main).toBe('#d32f2f');
    expect(theme.palette.warning.main).toBe('#ed6c02');
    expect(theme.palette.info.main).toBe('#0288d1');
    expect(theme.palette.success.main).toBe('#2e7d32');
  });

  it('has bold heading styles', () => {
    expect(theme.typography.h5.fontWeight).toBe(700);
    expect(theme.typography.h6.fontWeight).toBe(600);
  });
});
