// app.init.js
import { loadExternalSource } from "./source.loader.js";
import { apiFetch } from "./github-api.js";

const extractToken = (data) => {
  if (!data) {
    return "";
  }
  if (typeof data === "string") {
    return data.trim();
  }
  if (typeof data === "object") {
    const key = data.githubApiKey || data.token || data.pat;
    return String(key || "").trim();
  }
  return "";
};

async function boot() {
  try {
    const data = await loadExternalSource();
    const token = extractToken(data);

    if (!token) {
      console.warn("GitHub token missing from external source.");
      return;
    }

    window.__GITHUB_API_KEY__ = token;

    const user = await apiFetch({ token }, "/user");
    console.log("GitHub token OK for:", user.login);
  } catch (error) {
    console.error("External source init failed:", error);
  }
}

boot();
