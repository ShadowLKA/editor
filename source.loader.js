// source.loader.js
import { SOURCE } from "./source.config.js";

function toAbsoluteUrl(urlString) {
  return new URL(urlString, window.location.href);
}

function assertAllowedDomain(urlString) {
  const { allowedDomains } = SOURCE;
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) return;

  const hostname = toAbsoluteUrl(urlString).hostname;
  const ok = allowedDomains.some(d => hostname === d || hostname.endsWith("." + d));
  if (!ok) {
    throw new Error(`Blocked domain: ${hostname}`);
  }
}

function detectType(url, contentType) {
  const ct = (contentType || "").toLowerCase();
  const path = toAbsoluteUrl(url).pathname.toLowerCase();

  if (ct.includes("application/json") || path.endsWith(".json")) return "json";
  if (ct.includes("javascript") || path.endsWith(".js") || path.endsWith(".mjs")) return "js";
  return "text";
}

async function fetchFallback() {
  const res = await fetch(SOURCE.fallbackJsonPath, { cache: "no-store" });
  if (!res.ok) throw new Error("Fallback JSON load failed");
  return await res.json();
}

function injectScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => resolve({ injected: true, url });
    s.onerror = () => reject(new Error("Script injection failed"));
    document.head.appendChild(s);
  });
}

export async function loadExternalSource() {
  const url = (SOURCE.url || "").trim();

  if (!url || url === "PASTE_FILE_LINK_HERE") {
    return await fetchFallback();
  }

  assertAllowedDomain(url);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("External fetch failed");

    const type = detectType(url, res.headers.get("content-type"));

    if (type === "json") return await res.json();
    if (type === "js") {
      if (SOURCE.jsMode === "script") {
        return await injectScript(url);
      }
      return await import(/* @vite-ignore */ url);
    }

    return await res.text();

  } catch (err) {
    console.warn("External source failed, using fallback:", err);
    return await fetchFallback();
  }
}
