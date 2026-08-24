import time
import threading
import requests

BASE_URL = "http://127.0.0.1:10000"


def hit_health(results):
    t0 = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        results.append(r.status_code == 200)
    except Exception:
        results.append(False)


def run_stress_test(num_requests: int = 100):
    print("=" * 60)
    print(f"LAKSHYA AI - CONCURRENT STRESS TEST ({num_requests} BURST REQUESTS)")
    print("=" * 60)

    threads = []
    results = []

    t0 = time.time()
    for _ in range(num_requests):
        t = threading.Thread(target=hit_health, args=(results,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    total_time = time.time() - t0
    success = sum(1 for r in results if r)
    rps = num_requests / total_time if total_time > 0 else 0

    print(f"Completed {num_requests} requests in {total_time:.2f}s ({rps:.1f} req/sec)")
    print(f"Success Rate: {success}/{num_requests} ({success/num_requests*100:.1f}%)")
    print("STATUS: " + ("PASS" if success >= num_requests * 0.95 else "DEGRADED"))
    print("=" * 60)


if __name__ == "__main__":
    run_stress_test()
