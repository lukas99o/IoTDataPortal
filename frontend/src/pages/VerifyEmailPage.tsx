import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { Seo } from '../components/Seo';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      const userId = searchParams.get('userId');
      const token = searchParams.get('token');

      if (!userId || !token) {
        setError('Invalid verification link');
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await authService.verifyEmail({ userId, token });
        setSuccessMessage(response.message);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          setError(axiosError.response?.data?.message || 'Email verification failed');
        } else {
          setError('Email verification failed');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Seo
        title="Verify Email | IoT Data Portal"
        description="Verify your email address to activate your IoT Data Portal account."
        noindex
      />
      <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Email verification</h1>

        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!isLoading && successMessage && (
          <p className="mt-4 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            {successMessage}
          </p>
        )}

        {!isLoading && error && (
          <p className="mt-4 text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}