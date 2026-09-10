import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const publicRoutes = ["/", "/login", "/signup"]

const isCronRoute = (pathname: string) => pathname.startsWith("/api/cron/")

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (isCronRoute(pathname)) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
