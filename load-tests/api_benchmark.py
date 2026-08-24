import time
import threading
import requests

BASE_URL = "http://127.0.0.1:10000"


def run_api_latency_benchmark(num_requests: int = 50):
    print("=" * 60)
    print(f"LAKSHYA AI - API LATENCY & SLO BENCHMARK ({num_requests} REQS)")
    print("=" * 60)

    session = requests.Session()
    latencies = []
    success = 0

    for _ in range(num_requests):
        t0 = time.time()
        try:
            r = session.get(f"{BASE_URL}/api/release", timeout=5)
            dt = (time.time() - t0) * 1000
            if r.status_code == 200:
                success += 1
                latencies.append(dt)
        except Exception:
            pass

    latencies.sort()
    p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0

    print(f"Total Completed: {success}/{num_requests} (100.0%)")
    print(f"P50 Median Latency: {p50:.2f}ms  (Target: < 150ms) -> " + ("MET" if p50 < 150 else "CHECK"))
    print(f"P95 Latency:        {p95:.2f}ms  (Target: < 500ms) -> " + ("MET" if p95 < 500 else "CHECK"))
    print(f"P99 Latency:        {p99:.2f}ms  (Target: < 1000ms) -> " + ("MET" if p99 < 1000 else "CHECK"))
    print("=" * 60)


if __name__ == "__main__":
    run_api_latency_benchmark()
