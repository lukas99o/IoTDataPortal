import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectDeviceModal } from './ConnectDeviceModal';
import type { Device } from '../types';

const { regenerateApiKeyMock } = vi.hoisted(() => ({
  regenerateApiKeyMock: vi.fn(),
}));

vi.mock('../services/deviceService', () => ({
  deviceService: {
    regenerateApiKey: regenerateApiKeyMock,
  },
}));

const mockDevice: Device = {
  id: 'device-abc',
  name: 'Lab Sensor',
  location: 'Server Room',
  createdAt: '2026-01-01T00:00:00Z',
  apiKey: 'abcd1234efgh5678ijkl9012mnop3456',
};

function renderModal(overrides?: Partial<Device>) {
  const onClose = vi.fn();
  const onDeviceUpdated = vi.fn();
  const device = { ...mockDevice, ...overrides };
  render(
    <ConnectDeviceModal
      device={device}
      onClose={onClose}
      onDeviceUpdated={onDeviceUpdated}
    />
  );
  return { onClose, onDeviceUpdated, device };
}

describe('ConnectDeviceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Connect a Real Device')).toBeInTheDocument();
  });

  it('renders all three setup steps', () => {
    renderModal();
    expect(screen.getByText('Add an HTTP client to your firmware')).toBeInTheDocument();
    expect(screen.getByText('Flash the API key into your device')).toBeInTheDocument();
    expect(screen.getByText('POST sensor readings to the ingest endpoint')).toBeInTheDocument();
  });

  it('includes the example payload in the modal', () => {
    renderModal();
    expect(screen.getByText((_, el) =>
      el?.tagName === 'PRE' && (el.textContent ?? '').includes('measurements')
    )).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // API key masking / reveal
  // -----------------------------------------------------------------------

  it('masks the API key by default', () => {
    renderModal();
    expect(screen.queryByText(mockDevice.apiKey)).not.toBeInTheDocument();
  });

  it('reveals the API key when the show button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTitle('Show key'));
    expect(screen.getByText(mockDevice.apiKey)).toBeInTheDocument();
  });

  it('re-masks the API key when the hide button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTitle('Show key'));
    fireEvent.click(screen.getByTitle('Hide key'));
    expect(screen.queryByText(mockDevice.apiKey)).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Clipboard copy
  // -----------------------------------------------------------------------

  it('copies the API key to the clipboard', async () => {
    renderModal();
    fireEvent.click(screen.getByTitle('Copy key'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDevice.apiKey)
    );
  });

  it('shows "✓ Copied" after copying the key', async () => {
    renderModal();
    fireEvent.click(screen.getByTitle('Copy key'));
    await waitFor(() =>
      expect(screen.getByTitle('Copy key')).toHaveTextContent('✓ Copied')
    );
  });

  it('copies the example payload to the clipboard', async () => {
    renderModal();
    // Two "Copy" buttons: first is the key, second is the payload
    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    fireEvent.click(copyButtons[1]);
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('measurements')
      )
    );
  });

  it('shows "✓ Copied" after copying the payload', async () => {
    renderModal();
    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    fireEvent.click(copyButtons[1]);
    await waitFor(() =>
      expect(copyButtons[1]).toHaveTextContent('✓ Copied')
    );
  });

  // -----------------------------------------------------------------------
  // Close
  // -----------------------------------------------------------------------

  it('calls onClose when the × button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the Close button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // Regenerate API key
  // -----------------------------------------------------------------------

  it('prompts for confirmation before regenerating', async () => {
    regenerateApiKeyMock.mockResolvedValue({ ...mockDevice, apiKey: 'newkey' });
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    expect(window.confirm).toHaveBeenCalledOnce();
  });

  it('does not call regenerateApiKey when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    expect(regenerateApiKeyMock).not.toHaveBeenCalled();
  });

  it('calls regenerateApiKey with the device id', async () => {
    const updated = { ...mockDevice, apiKey: 'newkey1234newkey1234newkey123456' };
    regenerateApiKeyMock.mockResolvedValue(updated);
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    await waitFor(() => expect(regenerateApiKeyMock).toHaveBeenCalledWith(mockDevice.id));
  });

  it('calls onDeviceUpdated with the new device after successful regeneration', async () => {
    const updated = { ...mockDevice, apiKey: 'newkey1234newkey1234newkey123456' };
    regenerateApiKeyMock.mockResolvedValue(updated);
    const { onDeviceUpdated } = renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    await waitFor(() => expect(onDeviceUpdated).toHaveBeenCalledWith(updated));
  });

  it('shows the server error message when regeneration fails', async () => {
    regenerateApiKeyMock.mockRejectedValue({
      response: { data: { message: 'Internal server error' } },
    });
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    await waitFor(() =>
      expect(screen.getByText('Internal server error')).toBeInTheDocument()
    );
  });

  it('shows a fallback error message when no server message is present', async () => {
    regenerateApiKeyMock.mockRejectedValue(new Error('Network Error'));
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    await waitFor(() =>
      expect(screen.getByText('Failed to regenerate API key')).toBeInTheDocument()
    );
  });

  it('shows "Regenerating..." while the request is in flight', async () => {
    let resolve!: (v: Device) => void;
    regenerateApiKeyMock.mockReturnValue(new Promise<Device>((r) => { resolve = r; }));
    renderModal();
    fireEvent.click(screen.getByText('↺ Regenerate key'));
    await waitFor(() =>
      expect(screen.getByText('Regenerating...')).toBeInTheDocument()
    );
    resolve({ ...mockDevice, apiKey: 'done' });
  });
});
