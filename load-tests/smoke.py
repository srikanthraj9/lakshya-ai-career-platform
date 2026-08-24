import time
import requests

BASE_URL = "http://127.0.0.1:10000"


def run_smoke_test():
    print("=" * 60)
    print("LAKSHYA AI - SMOKE LOAD TEST (5 CONCURRENT RUNS)")
    print("=" * 60)

    endpoints = [
        "/api/health",
        "/api/health/ready",
        "/api/release",
    ]

    total_requests = 0
    success_count = 0
    latencies = []

    for ep in endpoints:
        for _ in range(5):
            total_requests += 1
            t0 = time.time()
            try:
                r = requests.get(f"{BASE_URL}{ep}", timeout=5)
                dt = (time.time() - t0) * 1000
                latencies.append(dt)
                if r.status_code == 200:
                    success_count += 1
            except Exception as e:
                print(f"Request failed for {ep}: {e}")

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    print(f"Total Requests: {total_requests}")
    print(f"Successful: {success_count} ({success_count/total_requests*100:.1f}%)")
    print(f"Average Latency: {avg_latency:.2f}ms")
    print("STATUS: " + ("PASS" if success_count == total_requests else "FAIL"))
    print("=" * 60)
    return success_count == total_requests


if __name__ == "__main__":
    run_smoke_test()
