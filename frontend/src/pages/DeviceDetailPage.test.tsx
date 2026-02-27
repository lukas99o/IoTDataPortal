import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const {
  getByIdMock,
  deleteMock,
  getByDeviceMock,
  simulateMock,
  generateHistoricalMock,
  navigateMock,
  connectionOnMock,
  connectionInvokeMock,
  connectionStartMock,
  connectionStopMock,
} = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  deleteMock: vi.fn(),
  getByDeviceMock: vi.fn(),
  simulateMock: vi.fn(),
  generateHistoricalMock: vi.fn(),
  navigateMock: vi.fn(),
  connectionOnMock: vi.fn(),
  connectionInvokeMock: vi.fn(),
  connectionStartMock: vi.fn(),
  connectionStopMock: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('../services/deviceService', () => ({
  deviceService: {
    getById: getByIdMock,
    delete: deleteMock,
  },
}));

vi.mock('../services/measurementService', () => ({
  measurementService: {
    getByDevice: getByDeviceMock,
    simulate: simulateMock,
    generateHistorical: generateHistoricalMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@microsoft/signalr', () => {
  class HubConnectionBuilder {
    withUrl() {
      return this;
    }

    withAutomaticReconnect() {
      return this;
    }

    configureLogging() {
      return this;
    }

    build() {
      return {
        on: connectionOnMock,
        start: connectionStartMock,
        invoke: connectionInvokeMock,
        stop: connectionStopMock,
        state: 'Connected',
      };
    }
  }

  return {
    HubConnectionBuilder,
    LogLevel: { Information: 1 },
  };
});

vi.mock('recharts', () => {
  const Div = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Div,
    LineChart: Div,
    Line: Div,
    XAxis: Div,
    YAxis: Div,
    CartesianGrid: Div,
    Tooltip: Div,
    Legend: Div,
  };
});

import { DeviceDetailPage } from './DeviceDetailPage';

describe('DeviceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    localStorage.setItem('token', 'test-token');

    connectionStartMock.mockResolvedValue(undefined);
    connectionInvokeMock.mockResolvedValue(undefined);
    connectionStopMock.mockResolvedValue(undefined);

    getByIdMock.mockResolvedValue({
      id: 'device-1',
      name: 'Kitchen Sensor',
      location: 'Home',
      createdAt: new Date().toISOString(),
    });
    getByDeviceMock.mockResolvedValue([]);
    simulateMock.mockResolvedValue([]);
    generateHistoricalMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/devices/device-1']}>
        <Routes>
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('simulates a measurement', async () => {
    renderPage();

    expect(await screen.findByText('Kitchen Sensor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '⚡ Simulate Measurement' }));

    await waitFor(() => {
      expect(simulateMock).toHaveBeenCalledWith('device-1', 1);
    });
  });

  it('generates historical data and reloads measurements', async () => {
    renderPage();

    expect(await screen.findByText('Kitchen Sensor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '📊 Generate History' }));

    await waitFor(() => {
      expect(generateHistoricalMock).toHaveBeenCalledWith('device-1', 7);
    });

    await waitFor(() => {
      expect(getByDeviceMock).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes device and navigates back to dashboard', async () => {
    renderPage();

    expect(await screen.findByText('Kitchen Sensor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Device' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('device-1');
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });
});
