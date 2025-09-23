import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headers: Record<string, string> = { 
      "Content-Type": "application/json" 
    };
    
    // Forward Authorization header from client fetch
    const auth = req.headers.get("authorization");
    if (auth) {
      headers["authorization"] = auth;
    }

    const res = await fetch(`${AUTH_SERVICE_URL}/auth/link`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let data;
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      // Handle non-JSON responses (error pages, plain text)
      const text = await res.text();
      data = { error: 'service_error', message: text.substring(0, 200) };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Auth link proxy error:', e);
    return NextResponse.json({ error: "proxy_failed" }, { status: 500 });
  }
}