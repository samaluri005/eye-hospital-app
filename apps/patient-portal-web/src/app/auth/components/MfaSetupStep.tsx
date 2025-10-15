"use client";
import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import InfoTooltip from "./InfoTooltip";

export type MfaMethod = "totp" | "sms" | "email";

export type MfaSetupData = {
  method: MfaMethod;
  phoneNumber?: string;
  email?: string;
  totpVerified?: boolean;
  totpSecret?: string;
};

type Props = {
  onNext: (data: MfaSetupData) => void;
  onSkip: () => void;
  userPhone?: string;
  userEmail?: string;
};

export default function MfaSetupStep({ onNext, onSkip, userPhone, userEmail }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [smsPhone, setSmsPhone] = useState(userPhone || "");
  const [emailAddress, setEmailAddress] = useState(userEmail || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Progress Indicator Component - shown on all MFA screens
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-6">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
          1
        </div>
        <div className="ml-2 text-sm font-medium text-gray-900">Profile</div>
      </div>
      <div className="w-16 h-0.5 bg-emerald-500"></div>
      <div className="flex items-center">
        <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
          2
        </div>
        <div className="ml-2 text-sm font-medium text-gray-900">Verification</div>
      </div>
      <div className="w-16 h-0.5 bg-gray-300"></div>
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
          3
        </div>
        <div className="ml-2 text-sm font-medium text-gray-500">Complete</div>
      </div>
    </div>
  );

  useEffect(() => {
    if (selectedMethod === "totp") {
      generateTotpSecret();
    }
  }, [selectedMethod]);

  const generateTotpSecret = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/mfa/generate-totp", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate TOTP secret");
      }

      const data = await response.json();
      setTotpSecret(data.secret);
      setTotpUri(data.uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate TOTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/mfa/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: totpSecret,
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Invalid verification code");
      }

      onNext({
        method: "totp",
        totpVerified: true,
        totpSecret: totpSecret, // Pass the secret to be stored server-side
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSms = async () => {
    if (!smsPhone) {
      setError("Please enter a phone number");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      onNext({
        method: "sms",
        phoneNumber: smsPhone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "SMS setup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupEmail = async () => {
    if (!emailAddress) {
      setError("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      onNext({
        method: "email",
        email: emailAddress,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email setup failed");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedMethod) {
    return (
      <div className="space-y-6">
        <ProgressIndicator />

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Add Extra Security (Optional)
          </h3>
          <p className="text-gray-600">
            Protect your medical records with two-factor authentication
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 className="text-purple-800 font-semibold mb-1 inline-flex items-center">
                Why Enable MFA?
                <InfoTooltip text="Two-factor authentication adds an extra layer of security to your account, ensuring only you can access your sensitive medical information." />
              </h4>
              <p className="text-purple-700 text-sm leading-relaxed">
                Adds extra security to protect your medical records.
              </p>
            </div>
          </div>
        </div>

        {/* Method Selection */}
        <div className="space-y-3">
          <button
            onClick={() => setSelectedMethod("totp")}
            className="w-full border-2 border-gray-200 hover:border-purple-500 rounded-lg p-4 text-left transition-colors group"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1 inline-flex items-center">
                  Authenticator App (Recommended)
                  <InfoTooltip text="Use an app like Google Authenticator or Microsoft Authenticator to generate secure codes." />
                </h4>
                <p className="text-sm text-gray-600">
                  Generate time-based codes with your authenticator app
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod("sms")}
            className="w-full border-2 border-gray-200 hover:border-purple-500 rounded-lg p-4 text-left transition-colors group"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1 inline-flex items-center">
                  SMS OTP
                  <InfoTooltip text="Receive verification codes via text message to your phone" />
                </h4>
                <p className="text-sm text-gray-600">
                  Get one-time passwords sent to your mobile phone
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod("email")}
            className="w-full border-2 border-gray-200 hover:border-purple-500 rounded-lg p-4 text-left transition-colors group"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1 inline-flex items-center">
                  Email OTP
                  <InfoTooltip text="Receive verification codes via email to your registered email address" />
                </h4>
                <p className="text-sm text-gray-600">
                  Get one-time passwords sent to your email
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onSkip}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full"
          >
            Skip for now
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can always enable MFA later in your security settings
        </p>
      </div>
    );
  }

  if (selectedMethod === "totp") {
    return (
      <div className="space-y-6">
        <ProgressIndicator />

        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => setSelectedMethod(null)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center mx-auto"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Set Up Authenticator App
          </h3>
          <p className="text-gray-600">
            Scan the QR code with your authenticator app
          </p>
        </div>

        {/* QR Code */}
        {totpUri && (
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={totpUri} size={200} level="H" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all">
                {totpSecret}
              </code>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Verification Code Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter the 6-digit code from your app
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-2xl tracking-widest font-mono"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleVerifyTotp}
            disabled={loading || verificationCode.length !== 6}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (selectedMethod === "sms") {
    return (
      <div className="space-y-6">
        <ProgressIndicator />

        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => setSelectedMethod(null)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center mx-auto"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Set Up SMS Verification
          </h3>
          <p className="text-gray-600">
            Enter your phone number to receive verification codes
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Phone Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          {userPhone ? (
            <>
              <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 mb-2">
                <p className="text-gray-900 font-medium">{smsPhone}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Codes will be sent to this registered number
                </p>
              </div>
            </>
          ) : (
            <>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter the phone number to receive verification codes
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSetupSms}
            disabled={loading || !smsPhone}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (selectedMethod === "email") {
    return (
      <div className="space-y-6">
        <ProgressIndicator />

        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => setSelectedMethod(null)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center mx-auto"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Set Up Email Verification
          </h3>
          <p className="text-gray-600">
            Enter your email address to receive verification codes
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          {userEmail ? (
            <>
              <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 mb-2">
                <p className="text-gray-900 font-medium">{emailAddress}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Codes will be sent to this registered email
                </p>
              </div>
            </>
          ) : (
            <>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your.email@example.com"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter the email address to receive verification codes
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSetupEmail}
            disabled={loading || !emailAddress}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
