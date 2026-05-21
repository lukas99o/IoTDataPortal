import { useState } from 'react';
import type { Device } from '../types';
import { deviceService } from '../services/deviceService';

interface ConnectDeviceModalProps {
  device: Device;
  onClose: () => void;
  onDeviceUpdated: (device: Device) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const INGEST_URL = `${API_URL}/api/measurements/ingest`;

const EXAMPLE_PAYLOAD = `POST ${INGEST_URL}
X-Api-Key: YOUR_DEVICE_API_KEY
Content-Type: application/json

{
  "measurements": [
    { "metricType": "temperature", "value": 24.3, "unit": "°C" },
    { "metricType": "humidity",    "value": 58.1, "unit": "%" }
  ]
}`;

export function ConnectDeviceModal({ device, onClose, onDeviceUpdated }: ConnectDeviceModalProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'key' | 'payload' | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maskedKey = device.apiKey.slice(0, 8) + '••••••••••••••••••••••••' + device.apiKey.slice(-4);

  const copyToClipboard = async (text: string, type: 'key' | 'payload') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerating the API key will invalidate the key currently flashed to your device. Continue?')) return;
    try {
      setError(null);
      setIsRegenerating(true);
      const updated = await deviceService.regenerateApiKey(device.id);
      onDeviceUpdated(updated);
      setShowKey(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to regenerate API key');
      } else {
        setError('Failed to regenerate API key');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600/50 dark:bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Connect a Real Device
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* API Key section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Device API Key
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Your firmware uses this key to authenticate. Keep it secret — it grants write access to this device.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 font-mono min-w-0">
                {showKey ? device.apiKey : maskedKey}
              </code>
              <button
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? 'Hide key' : 'Show key'}
                className="shrink-0 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                {showKey ? '🙈' : '👁'}
              </button>
              <button
                onClick={() => copyToClipboard(device.apiKey, 'key')}
                title="Copy key"
                className="shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 cursor-pointer whitespace-nowrap"
              >
                {copied === 'key' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? 'Regenerating...' : '↺ Regenerate key'}
            </button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Setup instructions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Firmware Setup
            </h4>

            <ol className="space-y-4 text-sm">
              <li>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Add an HTTP client to your firmware
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Any device that can send HTTPS POST requests works — ESP32, Raspberry Pi, Arduino with WiFi shield, or a custom gateway. Use your platform's preferred HTTP library (e.g.{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">HTTPClient</code> for Arduino/ESP32,{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">requests</code> for MicroPython).
                    </p>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Flash the API key into your device
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Store the key above in your firmware (e.g. a{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">#define</code>,{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">secrets.h</code>, or environment variable). Send it on every request as the{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">X-Api-Key</code> header.
                    </p>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                      POST sensor readings to the ingest endpoint
                    </p>
                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 overflow-x-auto pr-16 whitespace-pre">
                        {EXAMPLE_PAYLOAD}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(EXAMPLE_PAYLOAD, 'payload')}
                        className="absolute right-2 top-2 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer whitespace-nowrap"
                      >
                        {copied === 'payload' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      Replace <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">YOUR_DEVICE_API_KEY</code> with the key above. You can send multiple metrics in a single request.
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-700 dark:text-blue-300">
            <strong>Supported metrics:</strong> Any string up to 100 characters (e.g.{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">temperature</code>,{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">humidity</code>,{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">pressure</code>,{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">light</code>,{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">soil_moisture</code>,{' '}
            <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">battery</code>
            ). Unit is optional. Data streams live into the chart as soon as the first request arrives.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
