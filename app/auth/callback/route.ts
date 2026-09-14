import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(url.searchParams.get("next") || "/library", url.origin));
}
