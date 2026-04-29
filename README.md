# IoT Data Portal

A full-stack IoT monitoring app with user auth, device management, telemetry ingestion, and real-time updates.

## Repository Structure

- `backend/` - .NET solution and API
  - `IoTDataPortal.API/`
  - `IoTDataPortal.Models/`
  - `IoTDataPortal.Tests/`
- `frontend/` - React app

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/)
- SQL Server LocalDB (or another SQL Server instance)

## Configuration

Backend settings files:
- `backend/IoTDataPortal.API/appsettings.json`
- `backend/IoTDataPortal.API/appsettings.Development.json`

Required keys:
- `ConnectionStrings:DefaultConnection`
- `Jwt:Secret`
- `Jwt:Issuer`
- `Jwt:Audience`
- `Frontend:BaseUrl`
- `Smtp:*` (needed for full email flows in non-dev environments)

Frontend env:
- `VITE_API_URL` (optional, default `http://localhost:5000`)

## Getting Started

### 1) Backend

```powershell
Set-Location .\backend
dotnet restore
# Run API
dotnet run --project .\IoTDataPortal.API
```

API default URL: `http://localhost:5000`

Optional manual migration:

```powershell
dotnet ef database update --project .\IoTDataPortal.Models --startup-project .\IoTDataPortal.API
```

Swagger (Development): `http://localhost:5000/swagger`

### 2) Frontend

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## API Overview

Authentication:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Devices (auth required):
- `GET /api/devices`
- `GET /api/devices/{id}`
- `POST /api/devices`
- `DELETE /api/devices/{id}`

Measurements (auth required):
- `GET /api/measurements?deviceId=<guid>&from=<utc>&to=<utc>&metricType=<string>`
- `POST /api/measurements`

Device ingest (no user auth — API key only):
- `POST /api/measurements/ingest`
  - Header: `X-Api-Key: <device-api-key>`
  - Body:

```json
{
  "measurements": [
    { "metricType": "temperature", "value": 24.3, "unit": "\u00b0C" },
    { "metricType": "humidity",    "value": 58.1, "unit": "%" }
  ]
}
```

  - `metricType`: any string up to 100 chars (e.g. `temperature`, `humidity`, `pressure`, `light`, `soil_moisture`, `battery`)
  - `value`: any finite number
  - `unit`: optional string up to 20 chars

Simulator (auth required):
- `POST /api/simulator/generate?deviceId=<guid>&count=1`
- `POST /api/simulator/generate-historical?deviceId=<guid>&days=7`

## Real-Time Updates

SignalR hub endpoint: `/measurementHub` (JWT via `access_token` query string).

## Running Tests

```powershell
Set-Location .\backend\IoTDataPortal.Tests
dotnet test
```

```powershell
Set-Location .\frontend
npm run test:run
```

## Building

```powershell
Set-Location .\backend
dotnet build IoTDataPortal.slnx
```

```powershell
Set-Location .\frontend
npm run build
```

## Device Connectivity

Any device that can send HTTPS POST requests can push telemetry to the portal.

### Quick start (ESP32, Raspberry Pi, MicroPython, or any HTTP client)

1. Register a device in the portal to obtain a per-device **API key**.
2. Send readings to `POST /api/measurements/ingest` with the `X-Api-Key` header.
3. Batch multiple sensor metrics in a single request to reduce overhead.

```http
POST https://yourapi.com/api/measurements/ingest
X-Api-Key: your-device-api-key
Content-Type: application/json

{
  "measurements": [
    { "metricType": "temperature", "value": 24.3, "unit": "\u00b0C" },
    { "metricType": "humidity",    "value": 58.1, "unit": "%"  },
    { "metricType": "battery",     "value": 87.0, "unit": "%"  }
  ]
}
```

Metrics are schema-free — use any `metricType` string up to 100 characters. Data appears in real time on the device dashboard via SignalR as soon as the first request arrives.

## License

No license file is currently included in this repository.
