/** Browsers request /favicon.ico unprompted; serve the emblem instead of falling into [locale]. */
export function GET(request: Request) {
  return Response.redirect(new URL("/brand/ojetil-emblem.jpg", request.url), 308);
}
