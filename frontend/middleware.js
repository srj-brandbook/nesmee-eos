import { NextResponse } from "next/server";
import { AUTH_PATHS, APP_PREFIXES } from "@/constants/routes";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get("sid")?.value;
  const refresh = request.cookies.get("rid")?.value;
  const hasSession = Boolean(access || refresh);

  if (AUTH_PATHS.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (APP_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
