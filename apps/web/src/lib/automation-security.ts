import { timingSafeEqual } from "node:crypto";

export type AutomationSecretName = "CRON_SECRET" | "INTERNAL_API_SECRET";

type AutomationEnvironment = Record<string, string | undefined>;

export function automationSecretIssues(
  env: AutomationEnvironment = process.env,
): string[] {
  const cron = env.CRON_SECRET?.trim() || "";
  const internal = env.INTERNAL_API_SECRET?.trim() || "";
  const issues: string[] = [];

  if (!cron) issues.push("CRON_SECRET is missing");
  else if (cron.length < 32) issues.push("CRON_SECRET is too short");
  if (!internal) issues.push("INTERNAL_API_SECRET is missing");
  else if (internal.length < 32)
    issues.push("INTERNAL_API_SECRET is too short");
  if (cron && internal && cron === internal)
    issues.push("Automation secrets must be different");

  return issues;
}

export function readAutomationSecret(
  name: AutomationSecretName,
  env: AutomationEnvironment = process.env,
): string | null {
  const value = env[name]?.trim() || "";
  return value.length >= 32 ? value : null;
}

export function secureSecretMatch(candidate: string | null, secret: string) {
  if (!candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const secretBuffer = Buffer.from(secret);
  if (candidateBuffer.length !== secretBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, secretBuffer);
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}
