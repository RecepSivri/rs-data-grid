import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RsDataGrid } from '../components/rsDataGrid/rsDataGrid';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('debug', () => {
  it('loading', () => {
    render(<RsDataGrid fetchUrl="http://api.test/data" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
