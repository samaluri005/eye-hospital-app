"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import PersistentAuthLayout from "./PersistentAuthLayout";
import AuthMethodSelector from "./AuthMethodSelector";
import UpiSignInStep from "./UpiSignInStep";
import PhoneStep from "./PhoneStep";
import EmailStep from "./EmailStep";
import OtpStep from "./OtpStep";
import ProfileStep, { type ProfileData } from "./ProfileStep";
import PasswordSetupStep from "./PasswordSetupStep";
import YourIdStep from "./YourIdStep";
import MfaSetupStep, { type MfaSetupData } from "./MfaSetupStep";
import HipaaConsentStep, { type ConsentData } from "./HipaaConsentStep";
import AccountSelectionStep, { type AccountOption } from "./AccountSelectionStep";
import VerificationStep from "./VerificationStep";
import SocialSignInWithEmpi from "./SocialSignInWithEmpi";
import DuplicateBlockedStep from "./DuplicateBlockedStep";
import WelcomeStep from "./WelcomeStep";
import axios from "axios";

const SocialSignInButton = dynamic(() => import("./SocialSignInButton"), { ssr: false });

type AuthMethod = "selector" | "phone" | "email" | "upi" | "social" | "signup";
type FlowStep = "method" | "input" | "otp" | "accountSelection" | "verification" | "profile" | "password" | "upiDisplay" | "extendedProfile" | "mfaSetup" | "hipaaConsent" | "welcome" | "duplicateBlocked" | "done";

export default function EnhancedAuthFlow() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("selector");
  const [step, setStep] = useState<FlowStep>("method");
  const [contactInfo, setContactInfo] = useState<string>(""); // phone or email
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientUpi, setPatientUpi] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);
  const [primaryPatientId, setPrimaryPatientId] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedIsNewUser = sessionStorage.getItem('signup_isNewUser');
    if (savedIsNewUser === 'true') {
      setIsExistingUser(false);
    } else if (savedIsNewUser === 'false') {
      setIsExistingUser(true);
    }
  }, []);

  const handleMethodSelected = (method: Exclude<AuthMethod, "selector">) => {
    setAuthMethod(method);
    if (method === "signup") {
      // Direct registration flow - skip OTP, go straight to profile
      setIsExistingUser(false);
      sessionStorage.setItem('signup_isNewUser', 'true');
      setStep("profile");
    } else if (method === "upi") {
      setStep("input");
    } else if (method === "phone" || method === "email") {
      setStep("input");
    } else if (method === "social") {
      setStep("input");
    }
  };

  const handleOtpVerified = async (data: any) => {
    const { accountCount, accounts: accountList, primaryPatientId: primaryPid, linkToken: token, isNewUser } = data;
    
    setLinkToken(token);
    setPrimaryPatientId(primaryPid);
    
    // Add UPI to accounts if available
    const accountsWithUpi = accountList.map((acc: any) => ({
      ...acc,
      upi: acc.upi || ""
    }));
    
    // BRAND NEW USER - Start complete signup flow (profile → password → UPI → extended → MFA → consent)
    if (isNewUser === true) {
      // Safety guard: New user should have at least one account created by backend
      if (accountList.length === 0) {
        console.error("Backend returned isNewUser=true but no accounts - this should not happen");
        return;
      }
      setPatientId(accountList[0].patientId);
      setPatientUpi(accountList[0].upi || "");
      setIsExistingUser(false);
      sessionStorage.setItem('signup_isNewUser', 'true');
      setStep("profile"); // Start with minimal profile step
    }
    // Existing user with complete profile - show account selection
    else if (accountCount === 1 && accountList[0].hasProfile) {
      setAccounts(accountsWithUpi);
      setPatientId(accountList[0].patientId);
      setPatientUpi(accountList[0].upi || "");
      setPatientName(accountList[0].name || "");
      setIsExistingUser(true);
      sessionStorage.setItem('signup_isNewUser', 'false');
      setStep("accountSelection");
    }
    // Multiple accounts - show selection screen
    else if (accountCount > 1) {
      setAccounts(accountsWithUpi);
      setIsExistingUser(true);
      sessionStorage.setItem('signup_isNewUser', 'false');
      setStep("accountSelection");
    }
    // Existing user with incomplete profile - go to verification (they started signup before but didn't finish)
    else if (accountCount === 1 && !accountList[0].hasProfile) {
      setPatientId(accountList[0].patientId);
      setPatientUpi(accountList[0].upi || "");
      setIsExistingUser(true);
      sessionStorage.setItem('signup_isNewUser', 'false');
      setStep("verification"); // Existing user needs to verify to continue
    }
    // Fallback - treat as new user
    else {
      setPatientId(accountList[0]?.patientId);
      setPatientUpi(accountList[0]?.upi || "");
      setIsExistingUser(false);
      sessionStorage.setItem('signup_isNewUser', 'true');
      setStep("profile");
    }
  };

  const handleAccountSelected = (selectedPatientId: string) => {
    const account = accounts.find(a => a.patientId === selectedPatientId);
    if (account) {
      setPatientId(selectedPatientId);
      setPatientUpi(account.upi || "");
      setPatientName(account.name);
      setIsAddingFamilyMember(false);
      setStep("verification");
    }
  };

  const handleAddFamilyMember = () => {
    setIsAddingFamilyMember(true);
    setStep("profile");
  };

  const handleProfileComplete = async (profileData: ProfileData) => {
    setProfile(profileData);
    
    // If adding family member, create the patient record
    if (isAddingFamilyMember && primaryPatientId && linkToken) {
      try {
        const response = await axios.post("/api/auth/add-family-member", {
          primaryPatientId,
          linkToken,
          profile: profileData,
        });
        
        if (response.data.success) {
          setPatientId(response.data.patientId);
          setPatientUpi(response.data.upi || "");
          setStep("verification");
        }
      } catch (error) {
        console.error("Failed to add family member:", error);
      }
    } 
    // Direct signup flow (no OTP verification)
    else if (authMethod === "signup" && !patientId) {
      try {
        const response = await axios.post("/api/auth/create-patient-with-empi-check", {
          profile: profileData,
        });
        
        if (response.data.success) {
          setPatientId(response.data.patientId);
          setPatientUpi(response.data.upi || "");
          setPatientName(`${profileData.firstName} ${profileData.lastName}`);
          setLinkToken(response.data.linkToken); // Store linkToken for subsequent steps
          // Password already collected in ProfileStep Step 2, skip PasswordSetupStep
          setStep("upiDisplay");
        } else {
          // API returned success: false (shouldn't happen in success case, but handle it)
          setError(response.data.message || "Failed to create account. Please try again.");
        }
      } catch (error: any) {
        console.error("Failed to create patient:", error);
        // Check for 409 Conflict status (EMPI duplicate detection)
        if (error.response?.status === 409) {
          setError(error.response.data.message || "We could not complete your registration at this time. This may be due to matching information in our system. Please contact support for assistance.");
          setStep("duplicateBlocked");
        } else {
          setError(error.response?.data?.message || "Failed to create account. Please try again.");
        }
      }
    }
    // Existing flow with OTP verification
    else {
      // Save minimal profile to database
      if (patientId && linkToken) {
        try {
          await axios.post("/api/auth/save-profile", {
            patientId,
            linkToken,
            profile: profileData,
          });
          
          // New users go to password setup, existing users go to verification
          if (!isExistingUser) {
            setStep("password");
          } else {
            setStep("verification");
          }
        } catch (error) {
          console.error("Failed to save profile:", error);
          // Still proceed to next step even if save fails
          if (!isExistingUser) {
            setStep("password");
          } else {
            setStep("verification");
          }
        }
      } else {
        if (!isExistingUser) {
          setStep("password");
        } else {
          setStep("verification");
        }
      }
    }
  };

  const handleVerified = async () => {
    // Check if consent already exists for this patient
    if (patientId && linkToken) {
      try {
        const response = await axios.post("/api/auth/check-consent", {
          patientId,
          linkToken,
        });

        if (response.data.hasConsent) {
          // Consent exists - create session and redirect to dashboard
          const sessionResponse = await axios.post("/api/auth/create-session", {
            patientId,
            linkToken,
          });

          if (sessionResponse.data.success) {
            sessionStorage.removeItem('signup_isNewUser');
            window.location.href = "/dashboard";
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check consent:", error);
      }
    }

    // No consent found - show consent screen
    setStep("hipaaConsent");
  };

  const handlePasswordSetup = async (password: string) => {
    // Save password to database
    if (patientId && linkToken) {
      try {
        const response = await axios.post("/api/auth/setup-password", {
          patientId,
          linkToken,
          password,
          confirmPassword: password, // Already validated in PasswordSetupStep
        });

        if (response.data.success) {
          // Password is set up, show UPI
          setStep("upiDisplay");
        } else {
          console.error("Password setup failed:", response.data);
          // Still proceed to avoid blocking user
          setStep("upiDisplay");
        }
      } catch (error) {
        console.error("Failed to setup password:", error);
        // Still proceed to avoid blocking user
        setStep("upiDisplay");
      }
    } else {
      console.error("Missing patientId or linkToken for password setup");
      // Still proceed to avoid blocking user
      setStep("upiDisplay");
    }
  };

  const handleUpiDisplayNext = () => {
    // User saw their UPI, now show extended profile
    setStep("extendedProfile");
  };

  const handleUpiDisplaySkip = () => {
    // Direct signup flow already collected consents, show welcome instead of HIPAA consent
    if (authMethod === "signup") {
      setStep("welcome");
    } else {
      setStep("hipaaConsent");
    }
  };

  const handleExtendedProfileComplete = async (profileData: ProfileData) => {
    // Save extended profile
    if (patientId && linkToken) {
      try {
        await axios.post("/api/auth/save-profile", {
          patientId,
          linkToken,
          profile: profileData,
        });
      } catch (error) {
        console.error("Failed to save extended profile:", error);
      }
    }
    setStep("mfaSetup");
  };

  const handleExtendedProfileSkip = () => {
    // Skip extended profile, go to MFA
    setStep("mfaSetup");
  };

  const handleMfaSetupComplete = async (mfaData: MfaSetupData) => {
    // Save MFA settings
    if (patientId && linkToken) {
      try {
        await axios.post("/api/auth/setup-mfa", {
          patientId,
          linkToken,
          mfa: mfaData,
        });
      } catch (error) {
        console.error("Failed to setup MFA:", error);
      }
    }
    // Direct signup flow already collected consents, show welcome instead of HIPAA consent
    if (authMethod === "signup") {
      setStep("welcome");
    } else {
      setStep("hipaaConsent");
    }
  };

  const handleMfaSetupSkip = () => {
    // Direct signup flow already collected consents, show welcome instead of HIPAA consent
    if (authMethod === "signup") {
      setStep("welcome");
    } else {
      setStep("hipaaConsent");
    }
  };

  const handleConsentAccepted = async (consentData: ConsentData) => {
    // Save consent
    if (patientId && linkToken) {
      try {
        await axios.post("/api/auth/save-consent", {
          patientId,
          linkToken,
          consent: consentData,
        });
      } catch (error) {
        console.error("Failed to save consent:", error);
      }
    }
    sessionStorage.removeItem('signup_isNewUser');
    window.location.href = "/dashboard";
  };

  const handleWelcomeContinue = () => {
    // Clear signup flag and redirect to dashboard
    sessionStorage.removeItem('signup_isNewUser');
    window.location.href = "/dashboard";
  };

  const handleUpiSignInSuccess = (sessionToken: string) => {
    // UPI sign-in bypasses most steps and goes directly to dashboard
    window.location.href = "/dashboard";
  };

  const handleBackToMethod = () => {
    setAuthMethod("selector");
    setStep("method");
    setContactInfo("");
    setPatientId(null);
    setPatientUpi("");
    setLinkToken(null);
    setAccounts([]);
  };

  return (
    <PersistentAuthLayout>
      {step === "method" && (
        <AuthMethodSelector onMethodSelected={handleMethodSelected} />
      )}

      {step !== "method" && (
        <div className="w-full">
            {/* UPI Sign-In Flow */}
            {authMethod === "upi" && step === "input" && (
              <UpiSignInStep
                onSuccess={handleUpiSignInSuccess}
                onBack={handleBackToMethod}
              />
            )}

        {/* Phone Flow */}
        {authMethod === "phone" && (
          <>
            {step === "input" && (
              <PhoneStep
                initialPhone={contactInfo}
                onSent={(phone) => {
                  setContactInfo(phone);
                  setStep("otp");
                }}
              />
            )}
            {step === "otp" && (
              <OtpStep
                phone={contactInfo}
                onVerified={handleOtpVerified}
                onBack={() => setStep("input")}
              />
            )}
          </>
        )}

        {/* Email Flow */}
        {authMethod === "email" && (
          <>
            {step === "input" && (
              <EmailStep
                initialEmail={contactInfo}
                onSent={(email) => {
                  setContactInfo(email);
                  setStep("otp");
                }}
              />
            )}
            {step === "otp" && (
              <OtpStep
                phone={contactInfo} // Reuse OTP component, it can handle email too
                onVerified={handleOtpVerified}
                onBack={() => setStep("input")}
              />
            )}
          </>
        )}

        {/* Social Flow */}
        {authMethod === "social" && step === "input" && (
          <>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Social Sign-In</h3>
                <p className="text-gray-600">Choose your preferred provider</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SocialSignInButton provider="google" patientId={patientId} linkToken={linkToken} />
                <SocialSignInButton provider="microsoft" patientId={patientId} linkToken={linkToken} />
                <SocialSignInButton provider="apple" patientId={patientId} linkToken={linkToken} />
              </div>

              <button
                onClick={handleBackToMethod}
                className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>

            {/* EMPI Matching Logic - Triggers after social auth */}
            <SocialSignInWithEmpi 
              onAccountsFound={handleOtpVerified}
              onError={(error) => console.error("Social auth error:", error)}
            />
          </>
        )}

        {/* Common Steps (Account Selection, Verification, Profile, Consent, MFA) */}
        {step === "accountSelection" && (
          <AccountSelectionStep
            accounts={accounts}
            phone={contactInfo}
            onAccountSelected={handleAccountSelected}
            onAddFamilyMember={handleAddFamilyMember}
          />
        )}

        {step === "verification" && patientId && linkToken && (
          <VerificationStep
            patientId={patientId}
            patientName={patientName}
            patientUpi={patientUpi}
            linkToken={linkToken}
            onVerified={handleVerified}
            onBack={() => setStep("accountSelection")}
            isNewUser={!isExistingUser}
            profileDob={profile?.dateOfBirth}
          />
        )}

        {step === "profile" && (
          <ProfileStep
            onNext={handleProfileComplete}
            onSkip={() => {
              // For direct signup (minimal mode), go back to sign-in selector
              // For extended profile or family member, go to verification
              if (!isExistingUser && authMethod === "signup") {
                handleBackToMethod();
              } else {
                setStep("verification");
              }
            }}
            isAddingFamilyMember={isAddingFamilyMember}
            mode={!isExistingUser ? "minimal" : "extended"}
          />
        )}

        {step === "password" && (
          <PasswordSetupStep
            onPasswordSet={handlePasswordSetup}
          />
        )}

        {step === "upiDisplay" && (
          <YourIdStep
            upi={patientUpi}
            onCompleteProfile={handleUpiDisplayNext}
            onSkip={handleUpiDisplaySkip}
          />
        )}

        {step === "extendedProfile" && (
          <ProfileStep
            onNext={handleExtendedProfileComplete}
            onSkip={handleExtendedProfileSkip}
            mode="extended"
            initialData={profile || undefined}
          />
        )}

        {step === "mfaSetup" && (
          <MfaSetupStep
            onNext={handleMfaSetupComplete}
            onSkip={handleMfaSetupSkip}
            userPhone={profile?.mobile || contactInfo}
            userEmail={profile?.email}
          />
        )}

        {step === "hipaaConsent" && (
          <HipaaConsentStep
            onNext={handleConsentAccepted}
            patientName={patientName}
          />
        )}

        {step === "welcome" && (
          <WelcomeStep
            patientName={patientName}
            healthId={patientUpi}
            onContinue={handleWelcomeContinue}
          />
        )}

        {step === "duplicateBlocked" && (
          <DuplicateBlockedStep
            message={error || "An account with similar details already exists"}
            onGoToSignIn={() => {
              setAuthMethod("upi");
              setStep("input");
              setError(null);
            }}
          />
        )}

          {/* Back to Method Selector - Show only on input steps */}
          {step === "input" && authMethod !== "upi" && (
            <div className="mt-4 text-center">
              <button
                onClick={handleBackToMethod}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to sign-in options
              </button>
            </div>
          )}
        </div>
      )}
    </PersistentAuthLayout>
  );
}
