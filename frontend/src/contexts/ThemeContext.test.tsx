import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeConsumer() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="is-dark">{String(isDark)}</div>
      <button onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
}

describe('ThemeContext', () => {
  const originalMatchMedia = window.matchMedia;

  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('hydrates light theme from localStorage', async () => {
    localStorage.setItem('iot-data-portal-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('iot-data-portal-theme')).toBe('light');
  });

  it('hydrates dark theme from localStorage', async () => {
    localStorage.setItem('iot-data-portal-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('iot-data-portal-theme')).toBe('dark');
  });

  it('uses system preference when no stored theme exists', async () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('iot-data-portal-theme')).toBe('dark');
  });

  it('toggles theme and persists the selected value', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('iot-data-portal-theme')).toBe('dark');
  });
});
