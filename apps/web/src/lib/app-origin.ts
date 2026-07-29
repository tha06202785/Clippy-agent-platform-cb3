const DEFAULT_APP_ORIGIN = "https://useclippy.com";

export function getAppOrigin(value = process.env.NEXT_PUBLIC_APP_URL): string {
  const candidate = value?.trim() || DEFAULT_APP_ORIGIN;

  if (/\s/.test(candidate)) {
    throw new Error("NEXT_PUBLIC_APP_URL must not contain whitespace");
  }

  const url = new URL(candidate);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use http or https");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin only");
  }

  return url.origin;
}
