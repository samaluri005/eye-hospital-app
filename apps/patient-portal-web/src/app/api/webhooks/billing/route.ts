import { NextRequest, NextResponse } from 'next/server';
import { logWebhook, recordBillingEvent, updateAppointmentStatus } from '../../../../../lib/database';
import { verifyStripeSignature } from '../../../../../lib/webhook-security';
import { isEventProcessed, markEventProcessed } from '../../../../../lib/database-idempotency';

// Webhook for billing/payment system (Stripe, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.log('🏥 Billing Webhook Received:', {
      bodyLength: body.length,
      timestamp: new Date().toISOString()
    });

    // Security: Enforce Stripe signature verification
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured - rejecting webhook');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }
    
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
      console.log('❌ Invalid Stripe signature - webhook rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the event after signature verification
    const event = JSON.parse(body);
    
    // Idempotency: Check if event already processed (database-backed)
    if (await isEventProcessed('stripe', event.id)) {
      console.log('⚠️ Duplicate event ignored:', event.id);
      return NextResponse.json({ message: 'Event already processed' });
    }
    
    // Log webhook to database (after security verification)
    await logWebhook('billing', 'stripe', { event_type: event.type, event_id: event.id }, 'received');
    
    // Process billing events
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded for patient:', event.data.object.metadata?.patient_id);
        
        const patientId = parseInt(event.data.object.metadata?.patient_id || '0');
        const appointmentId = parseInt(event.data.object.metadata?.appointment_id || '0') || null;
        const amount = event.data.object.amount / 100; // Convert cents to dollars
        
        if (patientId) {
          // Record successful payment
          await recordBillingEvent(patientId, appointmentId, amount, 'paid', {
            payment_method: 'stripe',
            payment_intent_id: event.data.object.id
          });
          
          // Update specific appointment status if payment was for an appointment
          if (appointmentId) {
            await updateAppointmentStatus(patientId, 'confirmed', appointmentId);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed for patient:', event.data.object.metadata?.patient_id);
        
        const failedPatientId = parseInt(event.data.object.metadata?.patient_id || '0');
        const failedAmount = event.data.object.amount / 100;
        
        if (failedPatientId) {
          await recordBillingEvent(failedPatientId, null, failedAmount, 'failed', {
            payment_method: 'stripe',
            payment_intent_id: event.data.object.id,
            failure_reason: event.data.object.last_payment_error?.message
          });
        }
        break;
        
      case 'invoice.payment_succeeded':
        console.log('✅ Invoice payment succeeded:', event.data.object.id);
        // Handle invoice payments
        break;
        
      case 'invoice.payment_failed':
        console.log('❌ Invoice payment failed:', event.data.object.id);
        // Handle failed invoice payments
        break;
        
      default:
        console.log('📋 Unhandled billing event type:', event.type);
    }

    // Mark webhook as processed (database-backed idempotency)
    await markEventProcessed('stripe', event.id, event.type);
    await logWebhook('billing', 'stripe', { event_type: event.type, processed: true }, 'processed');

    return NextResponse.json({ 
      received: true, 
      event_type: event.type,
      event_id: event.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Billing webhook error:', error);
    
    // Log the error
    await logWebhook('billing', 'stripe', { error: error instanceof Error ? error.message : String(error) }, 'failed');
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}