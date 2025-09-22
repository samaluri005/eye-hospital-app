import { NextRequest, NextResponse } from 'next/server';
import { logWebhook, findPatientByPhone, updateAppointmentStatus } from '../../../../../lib/database';
import { verifyTwilioSignature } from '../../../../../lib/webhook-security';
import { isEventProcessed, markEventProcessed } from '../../../../../lib/database-idempotency';

// Webhook for SMS/WhatsApp notifications (Twilio, etc.)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const messageSid = formData.get('MessageSid') as string;
    
    // Mask phone for all logging (PHI protection)
    const maskedPhone = from?.substring(0, 6) + '***';
    
    console.log('📱 SMS Webhook Received:', {
      from: maskedPhone,
      body_length: body?.length || 0,
      messageStatus,
      messageSid,
      timestamp: new Date().toISOString()
    });

    // Security: Enforce Twilio signature verification
    const signature = request.headers.get('X-Twilio-Signature');
    const url = request.url;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!authToken) {
      console.error('❌ TWILIO_AUTH_TOKEN not configured - rejecting webhook');
      return new NextResponse('Webhook secret not configured', { status: 503 });
    }
    
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });
    
    if (!verifyTwilioSignature(signature, url, params, authToken)) {
      console.log('❌ Invalid Twilio signature - webhook rejected');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Idempotency: Check if SMS already processed (database-backed)
    if (await isEventProcessed('twilio', messageSid)) {
      console.log('⚠️ Duplicate SMS event ignored:', messageSid);
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Log webhook to database (after security verification)
    await logWebhook('sms', 'twilio', { from: maskedPhone, messageStatus, messageSid }, 'received');

    // Find patient by phone number
    const patient = await findPatientByPhone(from);
    
    if (!patient) {
      console.log('⚠️ No patient found for phone:', maskedPhone);
      const unknownResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We couldn't find your patient record. Please contact our office at (555) 123-4567.</Message>
</Response>`;
      return new NextResponse(unknownResponse, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    let responseMessage = "Thank you for your message.";
    
    // Process SMS responses based on content
    if (body?.toLowerCase().includes('confirm')) {
      console.log('✅ Patient confirmed appointment via SMS');
      const updated = await updateAppointmentStatus(patient.id, 'confirmed');
      responseMessage = updated 
        ? "✅ Your appointment has been confirmed. Thank you!"
        : "We received your confirmation. Please call us if you have questions.";
        
    } else if (body?.toLowerCase().includes('cancel')) {
      console.log('❌ Patient cancelled appointment via SMS');
      const updated = await updateAppointmentStatus(patient.id, 'cancelled');
      responseMessage = updated
        ? "Your appointment has been cancelled. Please call us to reschedule."
        : "We received your cancellation request. Our office will contact you soon.";
        
    } else if (body?.toLowerCase().includes('reschedule')) {
      console.log('🔄 Patient wants to reschedule via SMS');
      responseMessage = "We'll contact you shortly to reschedule your appointment. Thank you!";
      
    } else {
      console.log('💬 General SMS message received');
      responseMessage = "Thank you for your message. Our office will respond during business hours.";
    }

    // Mark webhook as processed (database-backed idempotency)  
    await markEventProcessed('twilio', messageSid, 'sms_received');
    await logWebhook('sms', 'twilio', { from: maskedPhone, messageStatus, patient_id: patient.id }, 'processed');

    // Respond with TwiML for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

    return new NextResponse(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    await logWebhook('sms', 'twilio', { error: error instanceof Error ? error.message : String(error) }, 'failed');
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We're experiencing technical difficulties. Please call our office.</Message>
</Response>`;
    
    return new NextResponse(errorResponse, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}