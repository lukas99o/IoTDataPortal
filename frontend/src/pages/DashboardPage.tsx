import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Device } from '../types';
import { deviceService } from '../services/deviceService';
import { AddDeviceModal } from '../components/AddDeviceModal';
import { AppNavbar } from '../components/AppNavbar';
import { Seo } from '../components/Seo';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await deviceService.getAll();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError('Failed to load devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      await deviceService.delete(id);
      setDevices(devices.filter(d => d.id !== id));
    } catch (err) {
      setError('Failed to delete device');
      console.error(err);
    }
  };

  const handleDeviceAdded = (device: Device) => {
    setDevices([...devices, device]);
    setShowAddModal(false);
  };

  const devicesWithLocation = devices.filter((device) => Boolean(device.location?.trim()));
  const uniqueLocations = new Set(devicesWithLocation.map((device) => device.location!.trim()));
  const latestDevice = devices.length
    ? [...devices].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  return (
    <div className="bg-gray-100 dark:bg-gray-950">
      <Seo
        title="Dashboard | IoT Data Portal"
        description="Monitor your connected IoT devices, view locations, and manage device details from one dashboard."
      />
      <AppNavbar
        title="Data Portal"
        logoSrc="/IoT.png"
        logoAlt="IoT"
        userEmail={user?.email}
        onLogout={logout}
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total devices</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{devices.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Locations</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{uniqueLocations.size}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Latest added</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {latestDevice
                ? new Date(latestDevice.createdAt).toLocaleDateString()
                : 'No devices yet'}
            </p>
          </div>
          </div>
        </section>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Devices</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and monitor your connected IoT devices.</p>
          </div>
          {devices.length != 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer w-full sm:w-auto"
            >
              Add Device
            </button>
          )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No devices</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first IoT device.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Add Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {device.name}
                      </h3>
                      {device.location && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          📍 {device.location}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                      title="Delete device"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Created: {new Date(device.createdAt).toLocaleDateString()}
                  </p>
                  <Link
                    to={`/devices/${device.id}`}
                    className="mt-4 inline-block w-full text-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onDeviceAdded={handleDeviceAdded}
        />
      )}
    </div>
  );
}
