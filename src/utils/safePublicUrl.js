module.exports = function safePublicUrl(value, fallback = "") {
  const candidate = String(value || "").trim();
  if (!candidate || /[\u0000-\u0020\\]/.test(candidate)) return fallback;

  // Permit same-origin paths, query-only links, and anchors, but never protocol-relative URLs.
  if (/^(?:\/(?!\/)|\?(?!\/)|#)/.test(candidate)) return candidate;

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      return fallback;
    }
    return parsed.href;
  } catch {
    return fallback;
  }
};
