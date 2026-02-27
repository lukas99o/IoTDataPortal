import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [lastLoginEmail, setLastLoginEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    const wakeUpApi = async () => {
      try {
        await authService.wakeUp();
      } catch {
        // Silent fail; page remains usable while API is waking up.
      }
    };

    wakeUpApi();
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      setResendMessage(null);
      setShowResendVerification(false);
      setLastLoginEmail(data.email);
      setIsSubmitting(true);
      await login(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const message = axiosError.response?.data?.message || 'Login failed';
        setError(message);
        setShowResendVerification(message.toLowerCase().includes('verify your email'));
      } else {
        setError('Login failed');
        setShowResendVerification(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!lastLoginEmail) {
      setResendMessage('Please enter your email and try signing in again first.');
      return;
    }

    try {
      setIsResendingVerification(true);
      const response = await authService.resendVerificationEmail({ email: lastLoginEmail });
      setResendMessage(response.message);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setResendMessage(axiosError.response?.data?.message || 'Failed to resend verification email');
      } else {
        setResendMessage('Failed to resend verification email');
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            IoT Data Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">
          Heads up: the API is hosted on Azure free tier. If it has been in standby, startup can take around 1 minute.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            {showResendVerification && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingVerification}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isResendingVerification ? 'Sending verification email...' : 'Resend verification email'}
                </button>
              </div>
            )}
            {resendMessage && <p className="mt-2 text-sm text-blue-700">{resendMessage}</p>}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
