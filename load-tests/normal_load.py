import time
import threading
import requests

BASE_URL = "http://127.0.0.1:10000"


def simulate_user_session(user_id: int, results: list):
    session = requests.Session()
    endpoints = ["/api/health", "/api/release", "/api/health/ready"]
    for ep in endpoints:
        t0 = time.time()
        try:
            r = session.get(f"{BASE_URL}{ep}", timeout=10)
            dt = (time.time() - t0) * 1000
            results.append((r.status_code == 200, dt))
        except Exception as e:
            results.append((False, 10000))


def run_normal_load_test(num_users: int = 30):
    print("=" * 60)
    print(f"LAKSHYA AI - NORMAL CONCURRENCY LOAD TEST ({num_users} USERS)")
    print("=" * 60)

    threads = []
    results = []

    t_start = time.time()
    for i in range(num_users):
        t = threading.Thread(target=simulate_user_session, args=(i, results))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    total_duration = time.time() - t_start
    success_count = sum(1 for s, _ in results if s)
    total_reqs = len(results)
    latencies = [l for _, l in results]
    latencies.sort()

    p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0

    print(f"Total Requests Executed: {total_reqs} in {total_duration:.2f}s")
    print(f"Success Rate: {success_count}/{total_reqs} ({success_count/total_reqs*100:.1f}%)")
    print(f"P50 Latency: {p50:.2f}ms | P95 Latency: {p95:.2f}ms")
    print("STATUS: " + ("PASS" if success_count == total_reqs else "FAIL"))
    print("=" * 60)
    return success_count == total_reqs


if __name__ == "__main__":
    run_normal_load_test()
