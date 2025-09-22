import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${AUTH_SERVICE_URL}/signup/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Try to parse as JSON, fallback to text for error responses
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses (error pages, plain text)
      const text = await response.text();
      data = { error: 'service_error', message: text.substring(0, 200) };
    }
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to auth service' },
      { status: 500 }
    );
  }
}