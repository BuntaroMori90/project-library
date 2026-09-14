import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/library/:path*", "/onboarding", "/account/:path*"],
};
