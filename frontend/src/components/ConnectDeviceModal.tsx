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

export function ConnectDeviceModal({ device, onClose, onDeviceUpdated }: ConnectDeviceModalProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'key' | 'cmd' | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maskedKey = device.apiKey.slice(0, 8) + '••••••••••••••••••••••••' + device.apiKey.slice(-4);

  const agentCommand = `python iot_agent.py --api-url "${INGEST_URL}" --api-key "${device.apiKey}"`;

  const copyToClipboard = async (text: string, type: 'key' | 'cmd') => {
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
    if (!confirm('Regenerating the API key will disconnect any running agents. Continue?')) return;
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
              The agent uses this key to authenticate. Keep it secret — it grants write access to this device.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 font-mono min-w-0">
                {showKey ? device.apiKey : maskedKey}
              </code>
              <button
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? 'Hide key' : 'Show key'}
                className="flex-shrink-0 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                {showKey ? '🙈' : '👁'}
              </button>
              <button
                onClick={() => copyToClipboard(device.apiKey, 'key')}
                title="Copy key"
                className="flex-shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 cursor-pointer whitespace-nowrap"
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
              Agent Setup
            </h4>

            <ol className="space-y-4 text-sm">
              <li>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Download the agent script
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Save <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">iot_agent.py</code> from the project's{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">agent/</code> folder onto the machine you want to monitor.
                    </p>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Install Python dependencies
                    </p>
                    <code className="block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 break-all">
                      pip install psutil requests
                    </code>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      For CPU/GPU temperatures on Windows, also install{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">wmi</code> and run{' '}
                      <a
                        href="https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        LibreHardwareMonitor
                      </a>{' '}
                      in the background.
                    </p>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Run the agent
                    </p>
                    <div className="relative">
                      <code className="block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs font-mono border border-gray-200 dark:border-gray-700 break-all pr-20">
                        {agentCommand}
                      </code>
                      <button
                        onClick={() => copyToClipboard(agentCommand, 'cmd')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer whitespace-nowrap"
                      >
                        {copied === 'cmd' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      Add <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">--interval 10</code> to change the reporting interval (seconds, default: 10).
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-700 dark:text-blue-300">
            <strong>What gets reported:</strong> CPU load %, RAM usage %, and CPU/GPU temperatures when available. Data streams live into the chart above as soon as the agent connects.
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
