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

    const data = await response.json();
    
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