import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppNavbar } from './AppNavbar';

describe('AppNavbar', () => {
  it('renders title, subtitle and user email', () => {
    render(
      <MemoryRouter>
        <AppNavbar
          title="SensorScope"
          subtitle="My subtitle"
          userEmail="test@example.com"
          onLogout={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'SensorScope' })).toBeInTheDocument();
    expect(screen.getByText('My subtitle')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();

    render(
      <MemoryRouter>
        <AppNavbar title="SensorScope" onLogout={onLogout} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders back link when backTo is provided', () => {
    render(
      <MemoryRouter>
        <AppNavbar title="SensorScope" backTo="/" backLabel="Dashboard" onLogout={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '← Dashboard' })).toBeInTheDocument();
  });
});
