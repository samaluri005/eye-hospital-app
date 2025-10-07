"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import AuthMethodSelector from "./AuthMethodSelector";
import UpiSignInStep from "./UpiSignInStep";
import PhoneStep from "./PhoneStep";
import EmailStep from "./EmailStep";
import OtpStep from "./OtpStep";
import ProfileStep, { type ProfileData } from "./ProfileStep";
import AccountSelectionStep, { type AccountOption } from "./AccountSelectionStep";
import VerificationStep from "./VerificationStep";
import SocialSignInWithEmpi from "./SocialSignInWithEmpi";
import axios from "axios";

const SocialSignInButton = dynamic(() => import("./SocialSignInButton"), { ssr: false });
const ConsentStep = dynamic(() => import("./ConsentStep"), { ssr: false });
const MfaStep = dynamic(() => import("./MfaStep"), { ssr: false });

type AuthMethod = "selector" | "phone" | "email" | "upi" | "social";
type FlowStep = "method" | "input" | "otp" | "accountSelection" | "verification" | "profile" | "consent" | "mfa" | "done";

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

  const handleMethodSelected = (method: Exclude<AuthMethod, "selector">) => {
    setAuthMethod(method);
    if (method === "upi") {
      setStep("input");
    } else if (method === "phone" || method === "email") {
      setStep("input");
    } else if (method === "social") {
      setStep("input");
    }
  };

  const handleOtpVerified = async (data: any) => {
    const { accountCount, accounts: accountList, primaryPatientId: primaryPid, linkToken: token } = data;
    
    setLinkToken(token);
    setPrimaryPatientId(primaryPid);
    
    // Add UPI to accounts if available
    const accountsWithUpi = accountList.map((acc: any) => ({
      ...acc,
      upi: acc.upi || ""
    }));
    
    // Existing user with complete profile - show account selection
    if (accountCount === 1 && accountList[0].hasProfile) {
      setAccounts(accountsWithUpi);
      setPatientId(accountList[0].patientId);
      setPatientUpi(accountList[0].upi || "");
      setPatientName(accountList[0].name || "");
      setIsExistingUser(true);
      setStep("accountSelection");
    }
    // Multiple accounts - show selection screen
    else if (accountCount > 1) {
      setAccounts(accountsWithUpi);
      setIsExistingUser(true);
      setStep("accountSelection");
    }
    // Single account with incomplete profile - complete profile
    else if (accountCount === 1 && !accountList[0].hasProfile) {
      setPatientId(accountList[0].patientId);
      setPatientUpi(accountList[0].upi || "");
      setIsExistingUser(true);
      setStep("profile");
    }
    // New user - create profile
    else {
      setPatientId(accountList[0]?.patientId);
      setPatientUpi(accountList[0]?.upi || "");
      setIsExistingUser(false);
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
    } else {
      setStep("verification");
    }
  };

  const handleVerified = () => {
    setStep("consent");
  };

  const handleConsentAccepted = () => {
    setStep("mfa");
  };

  const handleMfaDone = () => {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Method Selector */}
        {step === "method" && (
          <AuthMethodSelector onMethodSelected={handleMethodSelected} />
        )}

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
            onSkip={() => setStep("verification")}
            isAddingFamilyMember={isAddingFamilyMember}
          />
        )}

        {step === "consent" && patientId && linkToken && (
          <ConsentStep
            patientId={patientId}
            linkToken={linkToken}
            onAccepted={handleConsentAccepted}
            onDeclined={handleBackToMethod}
          />
        )}

        {step === "mfa" && (
          <MfaStep
            onDone={handleMfaDone}
            skip={handleMfaDone}
            patientId={patientId || undefined}
            linkToken={linkToken || undefined}
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
    </div>
  );
}
