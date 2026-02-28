import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { ThemeProvider } from '../contexts/ThemeContext';

const { getAllMock, deleteMock, logoutMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  deleteMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@example.com' },
    logout: logoutMock,
  }),
}));

vi.mock('../services/deviceService', () => ({
  deviceService: {
    getAll: getAllMock,
    delete: deleteMock,
  },
}));

vi.mock('../components/AddDeviceModal', () => ({
  AddDeviceModal: ({ onDeviceAdded, onClose }: { onDeviceAdded: (device: { id: string; name: string; createdAt: string }) => void; onClose: () => void }) => (
    <div>
      <button
        onClick={() =>
          onDeviceAdded({
            id: 'new-1',
            name: 'New Device',
            createdAt: new Date().toISOString(),
          })
        }
      >
        Mock Add Device
      </button>
      <button onClick={onClose}>Mock Close</button>
    </div>
  ),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('adds a device from add modal callback', async () => {
    getAllMock.mockResolvedValue([]);

    render(
      <ThemeProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText('No devices')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Device' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mock Add Device' }));

    expect(await screen.findByText('New Device')).toBeInTheDocument();
  });

  it('deletes a device after confirmation', async () => {
    getAllMock.mockResolvedValue([
      {
        id: 'device-1',
        name: 'Kitchen Sensor',
        createdAt: new Date().toISOString(),
      },
    ]);
    deleteMock.mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText('Kitchen Sensor')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Delete device'));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('device-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Kitchen Sensor')).not.toBeInTheDocument();
    });
  });
});
