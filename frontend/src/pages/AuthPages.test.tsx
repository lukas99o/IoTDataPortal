import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';

const { loginMock, registerMock, forgotPasswordMock, resetPasswordMock, navigateMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  forgotPasswordMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    register: registerMock,
  }),
}));

vi.mock('../services/authService', () => ({
  authService: {
    forgotPassword: forgotPasswordMock,
    resetPassword: resetPasswordMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Auth pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation errors on login submit with empty fields', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('submits login successfully and navigates to dashboard', async () => {
    loginMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'Password1' });
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows API error message on failed login', async () => {
    loginMock.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('submits register successfully and shows success message', async () => {
    registerMock.mockResolvedValue({ message: 'Registration successful. Please verify your email before signing in.' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('Registration successful. Please verify your email before signing in.')).toBeInTheDocument();
  });

  it('shows forgot-password success message when request succeeds', async () => {
    forgotPasswordMock.mockResolvedValue({ message: 'If an account with that email exists, a reset link has been sent.' });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByText('If an account with that email exists, a reset link has been sent.')).toBeInTheDocument();
  });

  it('shows forgot-password API error when request fails', async () => {
    forgotPasswordMock.mockRejectedValue({ response: { data: { message: 'Rate limit exceeded' } } });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('keeps reset form disabled with invalid query string', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Invalid or expired reset link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeDisabled();
  });

  it('submits reset password and shows success message', async () => {
    resetPasswordMock.mockResolvedValue({ message: 'Password has been reset successfully' });

    render(
      <MemoryRouter initialEntries={['/reset-password?email=user%40example.com&token=abc123']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'Password1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: 'abc123',
        newPassword: 'Password1',
        confirmPassword: 'Password1',
      });
    });

    expect(await screen.findByText('Password has been reset successfully')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
      },
      { timeout: 3000 }
    );
  });
});
