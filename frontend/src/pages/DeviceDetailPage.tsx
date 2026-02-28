import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import type { Device, Measurement } from '../types';
import { deviceService } from '../services/deviceService';
import { measurementService } from '../services/measurementService';
import { AppNavbar } from '../components/AppNavbar';
import { Seo } from '../components/Seo';

type TimeFilter = '24h' | '7d' | '1m' | '1y' | 'all';

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);
  const [isPhoneChart, setIsPhoneChart] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateChartMode = () => setIsPhoneChart(mediaQuery.matches);

    updateChartMode();
    mediaQuery.addEventListener('change', updateChartMode);

    return () => {
      mediaQuery.removeEventListener('change', updateChartMode);
    };
  }, []);

  const loadDevice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await deviceService.getById(id);
      setDevice(data);
    } catch (err) {
      setError('Failed to load device');
      console.error(err);
    }
  }, [id]);

  const loadMeasurements = useCallback(async () => {
    if (!id) return;
    try {
      const now = new Date();
      let from: Date | undefined = new Date();
      const to: Date | undefined = now;

      if (timeFilter === '24h') {
        from?.setHours(from.getHours() - 24);
      } else if (timeFilter === '7d') {
        from?.setDate(from.getDate() - 7);
      } else if (timeFilter === '1m') {
        from?.setMonth(from.getMonth() - 1);
      } else if (timeFilter === '1y') {
        from?.setFullYear(from.getFullYear() - 1);
      } else if (timeFilter === 'all') {
        from = undefined;
      }

      const data = await measurementService.getByDevice(
        id,
        from?.toISOString(),
        to?.toISOString()
      );
      setMeasurements(data);
    } catch (err) {
      setError('Failed to load measurements');
      console.error(err);
    }
  }, [id, timeFilter]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadDevice();
      await loadMeasurements();
      setLoading(false);
    };
    load();
  }, [loadDevice, loadMeasurements]);

  // SignalR connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    const newConnection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/measurementHub?access_token=${token}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    newConnection.on('ReceiveMeasurement', (measurement: Measurement) => {
      if (measurement.deviceId === id) {
        setMeasurements((prev) => [...prev, measurement].slice(-500)); // Keep last 500
      }
    });

    newConnection
      .start()
      .then(() => {
        console.log('SignalR Connected');
        // Join device group
        newConnection.invoke('JoinDeviceGroup', id);
      })
      .catch((err) => console.error('SignalR Connection Error:', err));

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.invoke('LeaveDeviceGroup', id).catch(() => {});
        newConnection.stop();
      }
    };
  }, [id]);

  const handleSimulate = async () => {
    if (!id) return;
    try {
      setIsSimulating(true);
      await measurementService.simulate(id, 1);
    } catch (err) {
      setError('Failed to simulate measurement');
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleGenerateHistory = async () => {
    if (!id) return;
    if (!confirm('This will generate 7 days of historical data. Continue?')) return;
    
    try {
      setIsGeneratingHistory(true);
      await measurementService.generateHistorical(id, 7);
      await loadMeasurements();
    } catch (err) {
      setError('Failed to generate historical data');
      console.error(err);
    } finally {
      setIsGeneratingHistory(false);
    }
  };

  // Format chart data
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const chartData = sortedMeasurements.map((m) => ({
    timestampMs: new Date(m.timestamp).getTime(),
    temperature: m.temperature,
    humidity: m.humidity,
    energyUsage: m.energyUsage,
  }));

  // Latest measurements for table
  const latestMeasurements = [...measurements].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatXAxisTick = (value: number) => {
    const date = new Date(value);

    if (timeFilter === '24h') {
      return date.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (timeFilter === '1y' || timeFilter === 'all') {
      return date.toLocaleDateString('sv-SE', {
        year: '2-digit',
        month: '2-digit',
      });
    }

    return date.toLocaleDateString('sv-SE', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-100 py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center bg-gray-100 py-16">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Device not found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-800 mt-2 block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100">
      <Seo
        title={`${device.name} | IoT Data Portal`}
        description={`View live and historical measurements for ${device.name}${device.location ? ` in ${device.location}` : ''}.`}
      />
      <AppNavbar
        title={device.name}
        subtitle={device.location ? `📍 ${device.location}` : undefined}
        backTo="/"
        backLabel="Dashboard"
        userEmail={user?.email}
        onLogout={logout}
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-900 cursor-pointer">
              ×
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div className="w-full min-w-0">
              <div className="text-sm text-gray-600 mb-2">Time range:</div>
              <div className="flex gap-2 overflow-x-auto pb-3 lg:pb-1 whitespace-nowrap">
              <button
                onClick={() => setTimeFilter('24h')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  timeFilter === '24h'
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                24 Hours
              </button>
              <button
                onClick={() => setTimeFilter('7d')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  timeFilter === '7d'
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeFilter('1m')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  timeFilter === '1m'
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                1 Month
              </button>
              <button
                onClick={() => setTimeFilter('1y')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  timeFilter === '1y'
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                1 Year
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  timeFilter === 'all'
                    ? 'bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                All Time
              </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm cursor-pointer disabled:cursor-not-allowed w-full"
              >
                {isSimulating ? 'Simulating...' : '⚡ Simulate Measurement'}
              </button>
              <button
                onClick={handleGenerateHistory}
                disabled={isGeneratingHistory}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm cursor-pointer disabled:cursor-not-allowed w-full"
              >
                {isGeneratingHistory ? 'Generating...' : '📊 Generate History'}
              </button>
            </div>
          </div>

        </div>

        {/* Real-time status */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${
              connection?.state === 'Connected' ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {connection?.state === 'Connected' ? 'Real-time updates active' : 'Connecting...'}
          </span>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Measurement History
          </h2>
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No measurements yet. Click "Simulate Measurement" or "Generate History" to add data.
            </div>
          ) : (
            <div className="-mx-2 sm:mx-0">
              <ResponsiveContainer width="100%" height={isPhoneChart ? 280 : 320}>
                <LineChart
                  data={chartData}
                  margin={
                    isPhoneChart
                      ? { top: 8, right: 2, left: 2, bottom: 0 }
                      : { top: 8, right: 12, left: 0, bottom: 0 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    dataKey="timestampMs"
                    tick={{ fontSize: isPhoneChart ? 10 : 11 }}
                    tickFormatter={formatXAxisTick}
                    minTickGap={isPhoneChart ? 56 : 32}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="left"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: isPhoneChart ? 10 : 11 }}
                    tickMargin={isPhoneChart ? 6 : 8}
                    width={isPhoneChart ? 40 : 45}
                  />
                  <YAxis
                    yAxisId="humidity"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    width={45}
                  />
                  <Tooltip
                    labelFormatter={(value) => new Date(Number(value)).toLocaleString('sv-SE')}
                  />
                  {!isPhoneChart && <Legend />}
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temperature"
                    name="Temp (°C)"
                    stroke="#ef4444"
                    strokeWidth={isPhoneChart ? 1.8 : 2}
                    dot={false}
                  />
                  <Line
                    yAxisId="humidity"
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity"
                    stroke="#3b82f6"
                    strokeWidth={isPhoneChart ? 1.8 : 2}
                    dot={false}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="energyUsage"
                    name="Energy (kWh)"
                    stroke="#22c55e"
                    strokeWidth={isPhoneChart ? 1.8 : 2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Latest Measurements Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Latest Measurements
            </h2>
          </div>
          <div className="max-h-150 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Humidity
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Energy Usage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {latestMeasurements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-6 py-4 text-center text-gray-500">
                      No measurements yet
                    </td>
                  </tr>
                ) : (
                  latestMeasurements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(m.timestamp).toLocaleString('sv-SE')}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span className="text-red-600 font-medium">
                          {m.temperature.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span className="text-blue-600 font-medium">
                          {m.humidity.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span className="text-green-600 font-medium">
                          {m.energyUsage.toFixed(2)} kWh
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
