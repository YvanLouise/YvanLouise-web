export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}

export function noContent(extraHeaders = {}) {
  return {
    statusCode: 204,
    headers: {
      ...extraHeaders
    },
    body: ""
  };
}

export function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

export function getPublicCorsHeaders(event) {
  const allowedOrigin = process.env.PUBLIC_SITE_ORIGIN || "https://www.yvanlouise.xyz";
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const origin = requestOrigin && requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

export function handlePublicCors(event) {
  if (event.httpMethod === "OPTIONS") {
    return noContent(getPublicCorsHeaders(event));
  }

  return null;
}
