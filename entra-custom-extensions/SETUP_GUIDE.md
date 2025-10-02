# Microsoft Entra External ID - Custom Authentication Extensions Setup Guide

## 🚀 Phone SMS OTP Integration with Twilio

This guide shows how to integrate Twilio SMS OTP into Microsoft Entra External ID using **Custom Authentication Extensions** (the modern approach, NOT B2C custom policies).

## 📋 Prerequisites

- ✅ Microsoft Entra External ID tenant (NOT Azure AD B2C)
- ✅ Twilio account with SMS capabilities
- ✅ REST API endpoint deployed (our `entra-otp-api` service)

## 🏗️ Architecture Overview

```
User → Entra User Flow → Custom Extension Event → Your API → Twilio SMS → User
```

## 📝 Step-by-Step Implementation

### **Step 1: Configure User Flow in Entra External ID**

1. **Navigate to Entra Admin Center:**
   - Go to [Entra Admin Center](https://entra.microsoft.com)
   - Navigate to: **External Identities** → **User flows**

2. **Create New User Flow:**
   - Click **+ New user flow**
   - Select **Sign up and sign in**
   - Name it: `Phone_SMS_SignUpSignIn`

3. **Configure Identity Providers:**
   - Under **Identity providers**, enable:
     - ✅ **Email one-time passcode** (we'll replace with SMS)
     - ✅ **Phone number** (if available in your tenant)
   - Keep other providers as needed

4. **Configure User Attributes:**
   - Select attributes to collect:
     - ✅ Display Name
     - ✅ Given Name  
     - ✅ Surname
     - ✅ Phone Number (custom attribute if needed)

### **Step 2: Register Your REST API as App Registration**

1. **Create App Registration:**
   ```
   Entra ID → App registrations → New registration
   ```
   - Name: `EyeHospital-CustomExtensions-API`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: Leave blank (not needed for API)

2. **Note the IDs:**
   - Application (client) ID: `{your-app-id}`
   - Directory (tenant) ID: `{your-tenant-id}`

3. **Create Client Secret:**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Description: `Custom Extensions API Key`
   - Expires: Choose appropriate expiry
   - Copy the secret value immediately

4. **Add API Permissions:**
   - Go to **API permissions**
   - Click **Add a permission**
   - Select **Microsoft Graph**
   - Choose **Application permissions**
   - Add: `CustomAuthenticationExtension.Receive.Payload`
   - Click **Grant admin consent**

### **Step 3: Create Custom Authentication Extensions**

#### **Extension 1: OnAttributeCollectionSubmit (Phone Validation & OTP Send)**

1. **Navigate to Custom Extensions:**
   ```
   External Identities → Custom authentication extensions
   ```

2. **Create Extension:**
   - Click **+ Create a custom extension**
   - **Basics:**
     - Name: `Phone_OTP_Validation`
     - Description: `Validates phone number and sends OTP via Twilio`
     - Event type: **OnAttributeCollectionSubmit**
   
   - **Endpoint Configuration:**
     - Target URL: `https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/api/extensions/onAttributeCollectionSubmit`
     - Timeout: 10 seconds (default)
   
   - **API Authentication:**
     - Authentication type: **OAuth 2.0 Client credentials**
     - Client ID: `{your-app-id}`
     - Client secret: `{your-secret}`
     - Scope: Leave default
   
   - **Claims:**
     - Select attributes to send to API:
       - ✅ phoneNumber
       - ✅ displayName
       - ✅ email (if collected)

3. **Review and Create**

#### **Extension 2: OnTokenIssuanceStart (Custom Claims)**

1. **Create Second Extension:**
   - Name: `Add_Custom_Claims`
   - Description: `Adds patient ID and phone verification status to tokens`
   - Event type: **OnTokenIssuanceStart**
   
   - **Endpoint Configuration:**
     - Target URL: `https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/api/extensions/onTokenIssuanceStart`
   
   - **API Authentication:** (same as above)
   
   - **Claims:** Select all available

### **Step 4: Associate Extensions with User Flow**

1. **Open Your User Flow:**
   ```
   External Identities → User flows → Phone_SMS_SignUpSignIn
   ```

2. **Configure Custom Extensions:**
   - In the user flow settings, find **Custom authentication extensions**
   - For **"When a user submits their information":**
     - Select: `Phone_OTP_Validation`
   - For **"Before creating the user":**
     - Leave empty (optional)
   - For **"Before issuing a token":**
     - Select: `Add_Custom_Claims`

3. **Save the User Flow**

### **Step 5: Test Your Implementation**

1. **Run User Flow:**
   - In the user flow page, click **Run user flow**
   - This opens a test sign-up/sign-in page

2. **Test Scenarios:**
   - **New User Registration:**
     - Enter phone number
     - Should trigger OTP send via Twilio
     - Verify OTP entry
     - Complete profile
   
   - **Existing User Sign-in:**
     - Enter phone number
     - Receive and verify OTP
     - Get token with custom claims

3. **Monitor Logs:**
   - Check your API logs for incoming requests
   - View Entra sign-in logs for authentication events
   - Monitor Twilio logs for SMS delivery

## 🔍 Debugging & Monitoring

### **Check API Logs:**
```bash
# In your Replit console
curl https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/health
```

### **View Entra Logs:**
1. **Sign-in Logs:**
   ```
   Entra ID → Monitoring → Sign-in logs
   ```
   - Filter by user flow
   - Check for extension execution

2. **Audit Logs:**
   ```
   Entra ID → Monitoring → Audit logs
   ```
   - Look for custom extension events

### **Test API Directly:**
```bash
# Test the extension endpoint
curl -X POST https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/api/extensions/onAttributeCollectionSubmit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 32beeaccbeb4c920420649250b5007da958f560d6f2c1fbe250ddc2b5586a7f1" \
  -d '{
    "type": "microsoft.graph.authenticationEvent.attributeCollectionSubmit",
    "data": {
      "attributes": {
        "phoneNumber": "+1234567890",
        "displayName": "Test User"
      }
    }
  }'
```

## 📊 Response Actions Reference

### **OnAttributeCollectionSubmit Actions:**

**Continue with default:**
```json
{
  "@odata.type": "microsoft.graph.attributeCollectionSubmit.continueWithDefaultBehavior"
}
```

**Show validation error:**
```json
{
  "@odata.type": "microsoft.graph.attributeCollectionSubmit.showValidationError",
  "message": "Invalid phone format",
  "attributeErrors": [{
    "attribute": "phoneNumber",
    "message": "Enter valid phone with country code"
  }]
}
```

**Block registration:**
```json
{
  "@odata.type": "microsoft.graph.attributeCollectionSubmit.showBlockPage",
  "message": "Registration not allowed from this region"
}
```

**Modify attributes:**
```json
{
  "@odata.type": "microsoft.graph.attributeCollectionSubmit.modifyAttributeValues",
  "attributes": {
    "phoneNumber": "+1234567890",
    "phoneVerified": "true"
  }
}
```

### **OnTokenIssuanceStart Actions:**

**Add custom claims:**
```json
{
  "@odata.type": "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
  "claims": {
    "patientId": "12345",
    "phoneVerified": "true",
    "medicalRecordNumber": "MRN-2024-001"
  }
}
```

## 🚨 Important Limitations

### **What's NOT Available in Entra External ID:**
- ❌ Custom HTML/CSS (only company branding)
- ❌ Full journey orchestration (use built-in flows)
- ❌ XML custom policies (use REST extensions)
- ❌ Multiple OTP steps in same flow
- ❌ Custom SMS provider for built-in SMS (use extensions)

### **Performance Requirements:**
- Response time: < 2 seconds recommended
- Maximum timeout: 10 seconds
- API must be highly available (inline with auth)

## 🔐 Security Best Practices

1. **Validate Bearer Tokens:**
   - Entra sends JWT in Authorization header
   - Validate signature and claims

2. **Rate Limiting:**
   - Implement throttling on your API
   - Prevent SMS bombing attacks

3. **Secure Storage:**
   - Store OTPs with expiration
   - Hash sensitive data
   - Use Azure Key Vault for secrets

4. **HTTPS Only:**
   - Custom extensions require HTTPS endpoints
   - Use valid SSL certificates

## 📚 Additional Resources

- [Custom Authentication Extensions Overview](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-overview)
- [Attribute Collection Extensions](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-attribute-collection)
- [Token Issuance Extensions](https://learn.microsoft.com/en-us/entra/identity-platform/custom-claims-provider-reference)
- [Troubleshooting Guide](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-troubleshoot)

## 🎯 Next Steps

Once your custom extensions are working:

1. **Configure Application:**
   - Update your app to use Entra authentication
   - Configure MSAL for token acquisition
   - Handle custom claims in your app

2. **Production Deployment:**
   - Deploy API to Azure Functions/App Service
   - Enable Application Insights monitoring
   - Configure autoscaling

3. **Advanced Scenarios:**
   - Add MFA with authenticator app
   - Implement progressive profiling
   - Add risk-based authentication