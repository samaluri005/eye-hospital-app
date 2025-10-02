# Microsoft Entra External ID Custom Policy Upload Instructions

## Prerequisites Checklist

✅ **Entra OTP API** running at: `https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002`

✅ **Policy Keys** configured in Azure Portal:
- `B2C_1A_TwilioAccountSid`
- `B2C_1A_TwilioAuthToken`
- `B2C_1A_TwilioPhoneNumber`
- `B2C_1A_EntraOtpApiKey` (use: `32beeaccbeb4c920420649250b5007da958f560d6f2c1fbe250ddc2b5586a7f1`)

## Step-by-Step Upload Process

### 1. Navigate to Identity Experience Framework
- Go to [Azure Portal](https://portal.azure.com)
- Navigate to your **EyeHospital-Patients-B2C** tenant
- Select **Identity Experience Framework** from the menu

### 2. Create Token Signing and Encryption Keys (if not already created)

#### Token Signing Key:
- Click **Policy Keys** → **Add**
- Options: **Generate**
- Name: `TokenSigningKeyContainer`
- Key type: **RSA**
- Key usage: **Signature**
- Click **Create**

#### Token Encryption Key:
- Click **Policy Keys** → **Add**
- Options: **Generate**
- Name: `TokenEncryptionKeyContainer`
- Key type: **RSA**
- Key usage: **Encryption**
- Click **Create**

### 3. Upload Custom Policies (IN THIS EXACT ORDER!)

⚠️ **IMPORTANT**: Upload policies in this specific sequence:

1. **TrustFrameworkBase.xml**
   - Click **Upload custom policy**
   - Select `TrustFrameworkBase.xml`
   - Check **Overwrite if exists**
   - Click **Upload**

2. **TrustFrameworkExtensions.xml**
   - Click **Upload custom policy**
   - Select `TrustFrameworkExtensions.xml`
   - Check **Overwrite if exists**
   - Click **Upload**

3. **SignUpSignIn.xml**
   - Click **Upload custom policy**
   - Select `SignUpSignIn.xml`
   - Check **Overwrite if exists**
   - Click **Upload**

4. **PasswordReset.xml** (Optional)
   - Click **Upload custom policy**
   - Select `PasswordReset.xml`
   - Check **Overwrite if exists**
   - Click **Upload**

5. **ProfileEdit.xml** (Optional)
   - Click **Upload custom policy**
   - Select `ProfileEdit.xml`
   - Check **Overwrite if exists**
   - Click **Upload**

### 4. Test Your Policy

After uploading, test the Sign Up/Sign In flow:

1. In **Identity Experience Framework**, find `B2C_1A_SignUpSignInPhone`
2. Click on it to open details
3. Click **Run now** button
4. This will open the authentication page

Test scenarios:
- Enter a phone number
- Receive OTP via SMS
- Complete sign-up with profile information
- Try signing in again with the same phone number

### 5. Update Your Tenant Name in XML Files

Before uploading, replace `eyehospitalpatients.onmicrosoft.com` with your actual tenant name in all XML files if different:
- Your tenant appears to be: `eyehospitalpatients.onmicrosoft.com` (based on screenshot)
- If different, use Find & Replace to update all occurrences

### 6. Production Deployment

When ready for production:

1. **Update API URLs** in `TrustFrameworkExtensions.xml`:
   - Replace development URL with your production API endpoint
   - Ensure HTTPS is used
   - Update `AllowInsecureAuthInProduction` to `false`

2. **Configure Application Insights** (optional):
   - Add Application Insights key in `SignUpSignIn.xml`
   - Set `DeveloperMode` to `false`

3. **Update API Security**:
   - Use a strong, production API key
   - Consider implementing rate limiting
   - Add IP whitelisting if needed

## Troubleshooting

### Common Issues:

1. **"Policy validation failed"**
   - Ensure you uploaded policies in correct order
   - Check tenant name is correct in all files
   - Verify all policy keys are created

2. **"REST API call failed"**
   - Check Entra OTP API is running
   - Verify API key matches in policy and API
   - Test API endpoints directly with curl/Postman

3. **"No SMS received"**
   - Check Twilio credentials in policy keys
   - Verify phone number format (+1234567890)
   - Check Twilio console for errors

4. **"User not created"**
   - Check Azure AD directory permissions
   - Verify extension app is registered
   - Check user attributes in policy

## Testing API Endpoints Directly

Test your OTP API is working:

```bash
# Send OTP
curl -X POST https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/api/otp/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 32beeaccbeb4c920420649250b5007da958f560d6f2c1fbe250ddc2b5586a7f1" \
  -d '{"phoneNumber": "+1234567890"}'

# Verify OTP
curl -X POST https://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev:3002/api/otp/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 32beeaccbeb4c920420649250b5007da958f560d6f2c1fbe250ddc2b5586a7f1" \
  -d '{"phoneNumber": "+1234567890", "code": "123456"}'
```

## Next Steps

Once policies are uploaded and tested:
1. Configure your application to use the custom policy
2. Update redirect URIs in app registration
3. Test end-to-end authentication flow
4. Monitor with Application Insights