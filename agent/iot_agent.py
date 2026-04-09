"""
IoT Data Portal – Device Agent
Collects CPU load, RAM usage, and CPU/GPU temperatures from this machine
and streams them to the portal every --interval seconds.

Usage:
    python iot_agent.py --api-url "https://yourapi.com/api/measurements/ingest" \
                        --api-key  "your-device-api-key" \
                        [--interval 10]

Requirements:
    pip install psutil requests

For CPU/GPU temperatures on Windows:
    pip install wmi
    + run LibreHardwareMonitor (https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases)
      with its WMI provider enabled (Options → Enable WMI provider)
"""

import argparse
import platform
import sys
import time

import psutil
import requests

# ---------------------------------------------------------------------------
# Temperature helpers
# ---------------------------------------------------------------------------

def _lhm_temperatures() -> list[dict]:
    """
    Read temperatures from LibreHardwareMonitor via WMI (Windows).
    Returns a list of {'name': str, 'value': float, 'unit': '°C'}.
    Silently returns [] when WMI or LHM is unavailable.
    """
    try:
        import wmi  # type: ignore
        w = wmi.WMI(namespace=r"root\LibreHardwareMonitor")
        sensors = w.Sensor()
    except Exception:
        return []

    results = []
    for sensor in sensors:
        try:
            if sensor.SensorType != "Temperature":
                continue
            name: str = sensor.Name.lower().replace(" ", "_")
            value: float = float(sensor.Value)
            results.append({"name": name, "value": value, "unit": "°C"})
        except Exception:
            continue

    return results


def _psutil_temperatures() -> list[dict]:
    """
    Read temperatures via psutil (Linux / macOS).
    Returns a list of {'name': str, 'value': float, 'unit': '°C'}.
    """
    if not hasattr(psutil, "sensors_temperatures"):
        return []

    results = []
    try:
        all_temps = psutil.sensors_temperatures()
        for chip_name, entries in all_temps.items():
            for entry in entries:
                label = (entry.label or chip_name).lower().replace(" ", "_")
                results.append({"name": label, "value": float(entry.current), "unit": "°C"})
    except Exception:
        pass

    return results


def collect_metrics() -> list[dict]:
    """Collect all available metrics and return them as a list of measurement dicts."""
    metrics = []

    # CPU load (always available)
    cpu_pct = psutil.cpu_percent(interval=1)
    metrics.append({"metricType": "cpu_load", "value": round(cpu_pct, 1), "unit": "%"})

    # RAM usage (always available)
    ram = psutil.virtual_memory()
    metrics.append({"metricType": "ram_used", "value": round(ram.percent, 1), "unit": "%"})

    # Temperatures: try platform-specific approach
    temps: list[dict] = []
    if platform.system() == "Windows":
        temps = _lhm_temperatures()
    else:
        temps = _psutil_temperatures()

    for temp in temps:
        metrics.append({
            "metricType": temp["name"],
            "value": round(temp["value"], 1),
            "unit": temp["unit"],
        })

    return metrics


# ---------------------------------------------------------------------------
# Sender
# ---------------------------------------------------------------------------

def send_batch(api_url: str, api_key: str, metrics: list[dict], session: requests.Session) -> None:
    payload = {"measurements": metrics}
    resp = session.post(
        api_url,
        json=payload,
        headers={"X-Api-Key": api_key, "Content-Type": "application/json"},
        timeout=10,
    )
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="IoT Data Portal device agent")
    parser.add_argument("--api-url", required=True, help="Full ingest URL, e.g. https://myportal.com/api/measurements/ingest")
    parser.add_argument("--api-key", required=True, help="Device API key from the portal")
    parser.add_argument("--interval", type=float, default=10.0, help="Reporting interval in seconds (default: 10)")
    args = parser.parse_args()

    print(f"IoT Agent starting — sending to {args.api_url} every {args.interval}s")
    print(f"Platform: {platform.system()} {platform.release()} | Python {sys.version.split()[0]}")
    print("Press Ctrl+C to stop.\n")

    session = requests.Session()

    consecutive_errors = 0

    while True:
        try:
            metrics = collect_metrics()
            send_batch(args.api_url, args.api_key, metrics, session)
            consecutive_errors = 0
            labels = ", ".join(f"{m['metricType']}={m['value']}{m.get('unit','')}" for m in metrics)
            print(f"[OK] {labels}")
        except requests.HTTPError as exc:
            consecutive_errors += 1
            print(f"[ERROR] HTTP {exc.response.status_code}: {exc.response.text[:200]}", file=sys.stderr)
        except requests.ConnectionError:
            consecutive_errors += 1
            print("[ERROR] Cannot reach API — will retry", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            consecutive_errors += 1
            print(f"[ERROR] {exc}", file=sys.stderr)

        if consecutive_errors >= 10:
            print("[FATAL] 10 consecutive errors — check API URL and key, then restart the agent.", file=sys.stderr)
            sys.exit(1)

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
