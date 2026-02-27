import type { AxiosRequestConfig } from 'axios';

const { createMock, requestUseMock, responseUseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  requestUseMock: vi.fn(),
  responseUseMock: vi.fn(),
}));

vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: {
        use: requestUseMock,
      },
      response: {
        use: responseUseMock,
      },
    },
  };

  createMock.mockReturnValue(instance);

  return {
    default: {
      create: createMock,
    },
  };
});

describe('api interceptors', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();

    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = { href: 'http://localhost:3000/' };

    await import('./api');
  });

  it('adds bearer token from localStorage to outgoing requests', async () => {
    localStorage.setItem('token', 'stored-token');

    await import('./api');

    const requestInterceptor = requestUseMock.mock.calls.at(-1)?.[0] as (config: AxiosRequestConfig) => AxiosRequestConfig;

    const config = requestInterceptor({ headers: {} });

    expect(config.headers).toMatchObject({ Authorization: 'Bearer stored-token' });
  });

  it('clears auth data and redirects on non-auth 401 responses', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('userEmail', 'user@example.com');

    const responseRejected = responseUseMock.mock.calls[0][1] as (error: unknown) => Promise<unknown>;
    const error = {
      response: { status: 401 },
      config: { url: '/devices' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userEmail')).toBeNull();
    expect(window.location.href).toContain('/login');
  });

  it('does not clear auth data for 401 on auth endpoints', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('userEmail', 'user@example.com');

    const responseRejected = responseUseMock.mock.calls[0][1] as (error: unknown) => Promise<unknown>;
    const error = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(localStorage.getItem('token')).toBe('stored-token');
    expect(localStorage.getItem('userEmail')).toBe('user@example.com');
  });
});
