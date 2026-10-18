import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MdiIcon } from './Icon';

describe('MdiIcon', () => {
  it('renders an SVG element without an external React wrapper', () => {
    const markup = renderToStaticMarkup(<MdiIcon name="settings" size={24} />);

    expect(markup).toContain('<svg');
    expect(markup).toContain('<path');
    expect(markup).toContain('width="24"');
    expect(markup).toContain('height="24"');
    expect(markup).toContain('fill="currentColor"');
  });

  it('preserves custom size, color, and CSS classes', () => {
    const markup = renderToStaticMarkup(
      <MdiIcon name="refresh" size="2rem" color="#123456" className="animate-spin" />,
    );

    expect(markup).toContain('width="2rem"');
    expect(markup).toContain('height="2rem"');
    expect(markup).toContain('fill="#123456"');
    expect(markup).toContain('class="animate-spin"');
  });
});
