import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)", // Allow cron jobs (secured with CRON_SECRET)
  "/settings/user(.*)", // Allow Clerk UserProfile catch-all routes
  "/account(.*)", // Allow Clerk UserProfile catch-all routes
  "/ping",
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Playwright health check - must return 200
  if (pathname === "/ping") {
    return new Response("pong", { status: 200 });
  }

  // Protect all non-public routes
  // No guest redirect - users MUST sign in
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
