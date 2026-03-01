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
- `GET /api/measurements?deviceId=<guid>&from=<utc>&to=<utc>`
- `POST /api/measurements`

Payload example:

```json
{
  "deviceId": "00000000-0000-0000-0000-000000000000",
  "temperature": 23.4,
  "humidity": 51.2,
  "energyUsage": 1.08
}
```

Validation:
- Temperature: `-50` to `100`
- Humidity: `0` to `100`
- EnergyUsage: `>= 0`

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

Any device or gateway that can send HTTPS JSON with Bearer JWT can post to `POST /api/measurements`.

Recommended setup for real homes/installations:
- Device(s) -> edge gateway (Home Assistant / Node-RED / custom agent) -> API
- Register each physical unit in `/api/devices` and send measurements with its `deviceId`

## License

No license file is currently included in this repository.
