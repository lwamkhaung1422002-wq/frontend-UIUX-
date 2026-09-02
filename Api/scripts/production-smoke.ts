import "dotenv/config";

const frontendUrl = process.env.POS_FRONTEND_URL || "https://general-pos-uiux.netlify.app";
const apiUrl = process.env.POS_API_URL || "https://frontend-uiux-production.up.railway.app";
const samples = Number(process.env.POS_SMOKE_SAMPLES ?? 20);

type Measurement = { label: string; url: string; status: number; milliseconds: number };

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

async function request(label: string, url: URL, expected?: RegExp): Promise<Measurement> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "general-pos-production-smoke/1.0" },
    });
    const body = await response.text();
    const milliseconds = Math.round(performance.now() - startedAt);
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
    if (expected && !expected.test(body)) throw new Error(`${label} returned an unexpected response.`);
    return { label, url: url.toString(), status: response.status, milliseconds };
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const frontend = new URL(frontendUrl);
  const api = new URL(apiUrl);
  if (frontend.protocol !== "https:" || api.protocol !== "https:") {
    throw new Error("Production smoke URLs must use HTTPS.");
  }
  if (!Number.isInteger(samples) || samples < 5 || samples > 100) {
    throw new Error("POS_SMOKE_SAMPLES must be an integer between 5 and 100.");
  }

  const checks = [
    ["frontend", frontend, /<div id="root"><\/div>/i] as const,
    ["frontend API proxy", new URL("/api/health", frontend), /"status"\s*:\s*"ok"/i] as const,
    ["API health", new URL("/health", api), /"status"\s*:\s*"ok"/i] as const,
    ["API database readiness", new URL("/health/ready", api), /"database"\s*:\s*"connected"/i] as const,
  ];
  const measurements: Measurement[] = [];
  for (const [label, url, expected] of checks) measurements.push(await request(label, url, expected));

  const healthSamples: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    healthSamples.push((await request("API health sample", new URL("/health", api), /"status"\s*:\s*"ok"/i)).milliseconds);
  }
  console.log(JSON.stringify({
    status: "PASS",
    checks: measurements,
    apiHealthMilliseconds: { samples: healthSamples, p50: percentile(healthSamples, 0.5), p95: percentile(healthSamples, 0.95) },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
