"use client";
import React, { useState } from "react";
import axios from "axios";
import PhoneStep from "./PhoneStep";
import OtpStep from "./OtpStep";
import ProfileStep, { type ProfileData } from "./ProfileStep";
import ConsentStep from "./ConsentStep";
import MfaStep from "./MfaStep";
import SocialSignInButton from "./SocialSignInButton";
import TestApi from "./TestApi"; // optional: for protected API testing
import AccountSelectionStep, { type AccountOption } from "./AccountSelectionStep";
import VerificationStep from "./VerificationStep";

export type Step = "phone" | "otp" | "accountSelection" | "verification" | "profile" | "consent" | "mfa" | "done";

export default function SignupFlow() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<string>("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);
  const [primaryPatientId, setPrimaryPatientId] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [selectedAccountName, setSelectedAccountName] = useState<string>("");

  const stepTitles = {
    phone: "Verify Your Phone Number",
    otp: "Enter Verification Code",
    accountSelection: "Select Account",
    verification: "Verify Your Identity",
    profile: isAddingFamilyMember ? "Add Family Member" : "Complete Your Profile",
    consent: "Privacy & Terms",
    mfa: "Secure Your Account",
    done: "Welcome to EyeCare"
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl w-full">
        {/* Header with Medical Branding - Only on Phone Step */}
        {step === "phone" && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-md">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">MedCare</h1>
            <p className="text-gray-500 text-base">{stepTitles[step]}</p>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex space-x-3">
            {(['phone', 'otp', 'profile', 'consent', 'mfa'] as const).map((s, index) => (
              <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                (step === s || (step === 'accountSelection' && s === 'otp')) ? 'bg-emerald-500 scale-125' : 
                (['phone', 'otp', 'profile', 'consent', 'mfa'] as const).indexOf(step as any) > index ? 'bg-emerald-400' : 'bg-gray-300'
              }`} />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {step === "phone" && (
            <>
              <PhoneStep
                initialPhone={phone}
                onSent={(p) => { setPhone(p); setStep("otp"); }}
              />
              
              {/* Social Sign-In Options - Only on Phone Step */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div>
                <div className="flex justify-center items-center gap-4">
                  <SocialSignInButton provider="google" patientId={patientId} linkToken={linkToken} />
                  <SocialSignInButton provider="microsoft" patientId={patientId} linkToken={linkToken} />
                  <SocialSignInButton provider="x" patientId={patientId} linkToken={linkToken} />
                  <SocialSignInButton provider="instagram" patientId={patientId} linkToken={linkToken} />
                  <SocialSignInButton provider="facebook" patientId={patientId} linkToken={linkToken} />
                  <SocialSignInButton provider="apple" patientId={patientId} linkToken={linkToken} />
                </div>
                <p className="mt-4 text-sm text-gray-500 text-center leading-relaxed">
                  <svg className="w-4 h-4 inline mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Social accounts without phone numbers will require verification before account linking.
                </p>
              </div>
            </>
          )}

          {step === "otp" && (
            <OtpStep
              phone={phone}
              onVerified={async (data) => { 
                const { accountCount, accounts: accountList, primaryPatientId: primaryPid, linkToken: token } = data;
                
                setLinkToken(token);
                setPrimaryPatientId(primaryPid);
                
                // Existing user with complete profile - show account selection so they can add family or continue
                if (accountCount === 1 && accountList[0].hasProfile) {
                  setAccounts(accountList);
                  setPatientId(accountList[0].patientId);
                  setIsExistingUser(true);
                  setStep("accountSelection");
                }
                // Multiple accounts - show selection screen
                else if (accountCount > 1) {
                  setAccounts(accountList);
                  setIsExistingUser(true);
                  setStep("accountSelection");
                }
                // Single account with incomplete profile - complete profile
                else if (accountCount === 1 && !accountList[0].hasProfile) {
                  setPatientId(accountList[0].patientId);
                  setIsExistingUser(true);
                  setStep("profile");
                }
                // New user (should not happen as backend creates account) - create profile
                else {
                  setPatientId(accountList[0]?.patientId);
                  setIsExistingUser(false);
                  setStep("profile");
                }
              }}
              onBack={() => setStep("phone")}
            />
          )}

          {step === "accountSelection" && (
            <AccountSelectionStep
              accounts={accounts}
              phone={phone}
              onAccountSelected={async (selectedPatientId) => {
                const selectedAccount = accounts.find(acc => acc.patientId === selectedPatientId);
                setPatientId(selectedPatientId);
                setSelectedAccountName(selectedAccount?.name || "");
                setIsAddingFamilyMember(false);
                
                // If selecting a different patient (family member), create new linkToken
                if (selectedPatientId !== primaryPatientId && linkToken) {
                  try {
                    const response = await axios.post('/api/auth/create-link-token', {
                      patientId: selectedPatientId,
                      existingLinkToken: linkToken,
                    });
                    
                    if (response.data.success) {
                      setLinkToken(response.data.linkToken);
                    } else {
                      alert('Failed to create verification token. Please try again.');
                      return;
                    }
                  } catch (error) {
                    console.error('Create link token error:', error);
                    alert('Failed to create verification token. Please try again.');
                    return;
                  }
                }
                
                // Go to verification step instead of creating session directly
                setStep("verification");
              }}
              onAddFamilyMember={() => {
                if (accounts.length > 0) {
                  // Find primary patient ID
                  const primaryAccount = accounts.find(acc => acc.isPrimary);
                  setPrimaryPatientId(primaryAccount?.patientId || accounts[0].patientId);
                }
                setIsAddingFamilyMember(true);
                setStep("profile");
              }}
            />
          )}

          {step === "verification" && patientId && linkToken && (
            <VerificationStep
              patientId={patientId}
              patientName={selectedAccountName}
              linkToken={linkToken}
              isNewUser={!isExistingUser || isAddingFamilyMember}
              profileDob={profile?.dateOfBirth || ""}
              onVerified={async () => {
                // For new users, go to consent after verification
                // For existing users, create session and redirect to dashboard
                if (isExistingUser && !isAddingFamilyMember) {
                  try {
                    const response = await axios.post('/api/auth/select-account', {
                      patientId,
                      linkToken,
                    });
                    
                    if (response.data.success) {
                      window.location.href = '/dashboard';
                    } else {
                      alert('Failed to create session. Please try again.');
                    }
                  } catch (error) {
                    console.error('Select account error:', error);
                    alert('Failed to create session. Please try again.');
                  }
                } else {
                  // New user or family member - continue to consent
                  setStep("consent");
                }
              }}
              onBack={() => {
                if (isExistingUser && !isAddingFamilyMember) {
                  setStep("accountSelection");
                } else {
                  setStep("profile");
                }
              }}
            />
          )}

          {step === "profile" && (
            <ProfileStep
              isAddingFamilyMember={isAddingFamilyMember}
              onNext={async (data) => {
                setProfile(data);
                
                // If adding family member, call family API
                if (isAddingFamilyMember && primaryPatientId) {
                  try {
                    const response = await axios.post('/api/family/add-member', {
                      primaryPatientId,
                      firstName: data.firstName,
                      lastName: data.lastName,
                      middleName: data.middleName,
                      dob: data.dateOfBirth,
                      gender: data.gender,
                      relationship: data.relationship,
                      phone,
                      email: data.email,
                    });
                    
                    if (response.data.success) {
                      setPatientId(response.data.patientId);
                      setLinkToken(response.data.linkToken);
                      setSelectedAccountName(`${data.firstName} ${data.lastName}`);
                      setProfile(data); // IMPORTANT: Update profile with family member's data for DOB
                      // Family members must go through verification to create PIN
                      setStep("verification");
                    } else {
                      alert('Failed to add family member. Please try again.');
                    }
                  } catch (error: any) {
                    console.error('Add family member error:', error);
                    alert(error.response?.data?.error || 'Failed to add family member. Please try again.');
                  }
                  return;
                }
                
                // Normal registration flow
                try {
                  const response = await axios.post('/api/auth/register', {
                    phone,
                    linkToken,
                    profile: data,
                  });
                  
                  if (response.data.status === 'registration_complete' || response.data.status === 'existing_patient') {
                    setPatientId(response.data.patientId);
                    setSelectedAccountName(`${data.firstName} ${data.lastName}`);
                    // Go to verification step for DOB + PIN
                    setStep("verification");
                  } else {
                    alert('Registration failed. Please try again.');
                  }
                } catch (error: any) {
                  console.error('Registration error:', error);
                  alert(error.response?.data?.message || 'Failed to create patient record. Please try again.');
                }
              }}
              onSkip={async () => {
                // Even if skipped, we need to create basic patient record
                try {
                  const response = await axios.post('/api/auth/register', {
                    phone,
                    linkToken,
                    profile: {
                      firstName: 'Patient',
                      lastName: phone.slice(-4),
                      dateOfBirth: '2000-01-01', // Placeholder
                    },
                  });
                  
                  if (response.data.patientId) {
                    setPatientId(response.data.patientId);
                    setStep("consent");
                  }
                } catch (error) {
                  console.error('Registration error:', error);
                  alert('Failed to proceed. Please complete your profile.');
                }
              }}
            />
          )}

          {step === "consent" && patientId && linkToken && (
            <ConsentStep
              patientId={patientId}
              linkToken={linkToken}
              onAccepted={() => setStep("mfa")}
              onDeclined={() => alert("You must accept ToS and privacy to create an account.")}
            />
          )}

          {step === "mfa" && (
            <MfaStep onDone={() => setStep("done")} skip={() => setStep("done")} />
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {isExistingUser ? "Welcome Back!" : "Account Created Successfully!"}
              </h2>
              <p className="text-gray-600 mb-6">
                {isExistingUser 
                  ? "You're now signed in. Redirecting to your dashboard..." 
                  : "Welcome to EyeCare. You can now access all patient portal features."}
              </p>
              <div className="bg-blue-50 p-4 rounded-xl">
                <TestApi/>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}