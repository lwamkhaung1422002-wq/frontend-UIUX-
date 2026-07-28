import "dotenv/config";

const frontendUrl = process.env.STAGING_FRONTEND_URL;
const apiUrl = process.env.STAGING_API_URL;

function requireStagingUrl(value: string | undefined, name: string): URL {
  if (!value) throw new Error(`${name} is required.`);
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside localhost.`);
  }
  if (!/(staging|preview|localhost|127\.0\.0\.1)/i.test(`${url.hostname}${url.pathname}`)) {
    throw new Error(`${name} must identify a staging or preview environment.`);
  }
  return url;
}

async function check(url: URL, label: string, expectedContent?: RegExp): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "greenmart-staging-smoke/1.0" },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
    if (expectedContent && !expectedContent.test(body)) {
      throw new Error(`${label} returned an unexpected response.`);
    }
    console.log(`PASS ${label} ${response.status} ${url.origin}${url.pathname}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const frontend = requireStagingUrl(frontendUrl, "STAGING_FRONTEND_URL");
  const api = requireStagingUrl(apiUrl, "STAGING_API_URL");
  const health = new URL("/health", api);

  await check(frontend, "frontend");
  await check(health, "api health", /"status"\s*:\s*"ok"/i);
  console.log(JSON.stringify({ status: "PASS", frontend: frontend.origin, api: api.origin }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
