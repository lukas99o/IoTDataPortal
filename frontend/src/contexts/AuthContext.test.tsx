import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const { loginMock, registerMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: {
    login: loginMock,
    register: registerMock,
  },
}));

function AuthConsumer({ onLoginError }: { onLoginError?: (err: unknown) => void }) {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email ?? ''}</div>

      <button
        onClick={async () => {
          try {
            await login({ email: 'test@example.com', password: 'Secret123' });
          } catch (err) {
            onLoginError?.(err);
          }
        }}
      >
        Login
      </button>

      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts unauthenticated when no token exists', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('');
  });

  it('hydrates authenticated state from localStorage on mount', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('userEmail', 'stored@example.com');

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('stored@example.com');
  });

  it('stores token/email and authenticates user on successful login', async () => {
    loginMock.mockResolvedValue({
      token: 'new-token',
      email: 'test@example.com',
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(localStorage.getItem('userEmail')).toBe('test@example.com');
    expect(loginMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Secret123',
    });
  });

  it('keeps user logged out and does not persist data on failed login', async () => {
    const loginError = new Error('Invalid credentials');
    const onLoginError = vi.fn();
    loginMock.mockRejectedValue(loginError);

    render(
      <AuthProvider>
        <AuthConsumer onLoginError={onLoginError} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(onLoginError).toHaveBeenCalledWith(loginError);
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userEmail')).toBeNull();
  });

  it('clears auth state and localStorage on logout', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('userEmail', 'stored@example.com');

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userEmail')).toBeNull();
  });
});
