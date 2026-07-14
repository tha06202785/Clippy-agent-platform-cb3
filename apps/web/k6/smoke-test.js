import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // Ramp up to 10 users
    { duration: "1m", target: 20 },    // Ramp to 20 users
    { duration: "30s", target: 0 },     // Ramp down
  ],
  thresholds: {
    errors: ["rate<0.05"],              // Less than 5% errors
    response_time: ["p(95)<2000"],      // 95% of requests under 2s
    http_req_duration: ["avg<500"],     // Average under 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || "https://useclippy.com";

export default function () {
  // Test landing page
  let res = http.get(BASE_URL + "/");
  check(res, { "landing page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  responseTime.add(res.timings.duration);
  sleep(1);

  // Test pricing page
  res = http.get(BASE_URL + "/pricing");
  check(res, { "pricing page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // Test sign-in page
  res = http.get(BASE_URL + "/sign-in");
  check(res, { "sign-in page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // Test health API
  res = http.get(BASE_URL + "/api/health");
  check(res, { "health API status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(0.5);

  // Test subscription plans API
  res = http.get(BASE_URL + "/api/subscription/plans");
  check(res, { "plans API status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(0.5);

  // Test security page
  res = http.get(BASE_URL + "/security");
  check(res, { "security page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // Test privacy page
  res = http.get(BASE_URL + "/privacy");
  check(res, { "privacy page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // Test terms page
  res = http.get(BASE_URL + "/terms");
  check(res, { "terms page status 200": (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // Test analytics page (will redirect to sign-in - that's correct)
  res = http.get(BASE_URL + "/analytics", { redirects: 0 });
  check(res, { "analytics redirects to sign-in": (r) => r.status === 307 || r.status === 302 });
  errorRate.add(r.status !== 307 && r.status !== 302);
  sleep(1);

  // Test leads API (should return 401 without auth - that's correct)
  res = http.get(BASE_URL + "/api/leads");
  check(res, { "leads API returns 401": (r) => r.status === 401 });
  errorRate.add(r.status !== 401);
  sleep(0.5);
}
