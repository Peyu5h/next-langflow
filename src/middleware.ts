import { NextResponse, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};