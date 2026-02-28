import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppNavbar } from './AppNavbar';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('AppNavbar', () => {
  it('renders title, subtitle and user email', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AppNavbar
            title="SensorScope"
            subtitle="My subtitle"
            userEmail="test@example.com"
            onLogout={() => {}}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { name: 'SensorScope' })).toBeInTheDocument();
    expect(screen.getByText('My subtitle')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <AppNavbar title="SensorScope" onLogout={onLogout} />
        </MemoryRouter>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders back link when backTo is provided', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AppNavbar title="SensorScope" backTo="/" backLabel="Dashboard" onLogout={() => {}} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('link', { name: '← Dashboard' })).toBeInTheDocument();
  });
});
