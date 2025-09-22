"use client";
import React, { useState } from "react";
import PhoneStep from "./PhoneStep";
import OtpStep from "./OtpStep";
import ProfileStep from "./ProfileStep";
import ConsentStep from "./ConsentStep";
import MfaStep from "./MfaStep";
import SocialSignInButton from "./SocialSignInButton";
import TestApi from "./TestApi"; // optional: for protected API testing

export type Step = "phone" | "otp" | "profile" | "consent" | "mfa" | "done";

export default function SignupFlow() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<string>("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ fullName?: string; password?: string }>({});

  const stepTitles = {
    phone: "Verify Your Phone Number",
    otp: "Enter Verification Code", 
    profile: "Complete Your Profile",
    consent: "Privacy & Terms",
    mfa: "Secure Your Account",
    done: "Welcome to EyeCare"
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="healthcare-card max-w-2xl w-full">
        {/* Header with Medical Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">EyeCare Patient Portal</h1>
          <p className="text-gray-600 text-lg">{stepTitles[step]}</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex space-x-2">
            {(['phone', 'otp', 'profile', 'consent', 'mfa'] as Step[]).map((s, index) => (
              <div key={s} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                step === s ? 'bg-blue-600 scale-125' : 
                (['phone', 'otp', 'profile', 'consent', 'mfa'] as Step[]).indexOf(step) > index ? 'bg-green-500' : 'bg-gray-300'
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
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div>
                <div className="flex justify-center items-center gap-4">
                  <SocialSignInButton provider="google" />
                  <SocialSignInButton provider="x" />
                  <SocialSignInButton provider="instagram" />
                  <SocialSignInButton provider="facebook" />
                  <SocialSignInButton provider="apple" />
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
              onVerified={(pid) => { setPatientId(pid); setStep("profile"); }}
              onBack={() => setStep("phone")}
            />
          )}

          {step === "profile" && (
            <ProfileStep
              initialName={profile.fullName}
              onNext={(data) => { setProfile(data); setStep("consent"); }}
              onSkip={() => setStep("consent")}
            />
          )}

          {step === "consent" && (
            <ConsentStep
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Created Successfully!</h2>
              <p className="text-gray-600 mb-6">Welcome to EyeCare. You can now access all patient portal features.</p>
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