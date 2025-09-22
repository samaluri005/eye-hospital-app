import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For now, we'll just log the consent and return success
    // In a real implementation, this would be sent to the auth service
    console.log('Consent received:', body);
    
    // TODO: Forward to auth service consent endpoint when implemented
    // const response = await fetch(`${AUTH_SERVICE_URL}/consent`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(body),
    // });

    // For now, return success to allow the flow to continue
    return NextResponse.json({ 
      status: 'consent_recorded',
      message: 'Your consent preferences have been recorded successfully'
    });
  } catch (error) {
    console.error('Consent API error:', error);
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}