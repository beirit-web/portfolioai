async function blockExternalRequests(context, baseURL) {
  const origin = new URL(baseURL).origin;
  // Match external requests only, so later API mocks and local routes keep working.
  await context.route(
    url => ["http:", "https:"].includes(url.protocol) && url.origin !== origin,
    route => route.abort(),
  );
}

module.exports = { blockExternalRequests };
