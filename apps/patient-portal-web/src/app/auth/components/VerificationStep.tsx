"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface VerificationStepProps {
  patientId: string;
  patientName: string;
  linkToken: string;
  onVerified: () => void;
  onBack: () => void;
  isNewUser?: boolean; // New user (just completed profile)
  profileDob?: string; // DOB from profile step (for new users)
}

export default function VerificationStep({
  patientId,
  patientName,
  linkToken,
  onVerified,
  onBack,
  isNewUser = false,
  profileDob = "",
}: VerificationStepProps) {
  const [dob, setDob] = useState(profileDob); // Pre-fill with profile DOB for new users
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [needsPin, setNeedsPin] = useState(isNewUser); // New users always need PIN
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!isNewUser); // Check PIN for existing users
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  // Fetch DOB and PIN status for existing users on mount
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!isNewUser && patientId && linkToken) {
        try {
          setInitializing(true);
          const response = await axios.post('/api/auth/patient-info', {
            patientId,
            linkToken,
          });

          if (response.data.success) {
            // Set DOB if available
            if (response.data.dob) {
              setDob(response.data.dob);
            }
            // Check if PIN exists
            setNeedsPin(!response.data.hasPin);
          }
        } catch (err) {
          console.error('Failed to fetch patient info:', err);
        } finally {
          setInitializing(false);
        }
      }
    };

    fetchPatientInfo();
  }, [patientId, linkToken, isNewUser]);

  // Sync local dob state with profileDob prop changes (for family member flow)
  useEffect(() => {
    if (profileDob && profileDob !== dob) {
      setDob(profileDob);
    }
  }, [profileDob]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // If user needs to set PIN, call set-pin endpoint first
      if (needsPin) {
        if (pin !== pinConfirm) {
          setError("PINs do not match");
          setLoading(false);
          return;
        }

        if (!/^\d{4}$/.test(pin)) {
          setError("PIN must be exactly 4 digits");
          setLoading(false);
          return;
        }

        const setPinResponse = await axios.post(
          "/api/auth/account-verification/set-pin",
          {
            patientId,
            pin,
            pinConfirm,
            linkToken,
          }
        );

        if (setPinResponse.data.status === "pin_set") {
          // PIN set successfully, now verify
          const verifyResponse = await axios.post(
            "/api/auth/account-verification/verify",
            {
              patientId,
              dob,
              pin,
              linkToken,
            }
          );

          if (verifyResponse.data.status === "verified") {
            onVerified();
          }
        }
      } else {
        // Normal verification flow
        const verifyResponse = await axios.post(
          "/api/auth/account-verification/verify",
          {
            patientId,
            dob,
            pin,
            linkToken,
          }
        );

        if (verifyResponse.data.status === "verified") {
          onVerified();
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);

      if (err.response?.status === 423) {
        // Account locked
        setLockedUntil(err.response.data.lockedUntil);
        const minutesLeft = err.response.data.minutesLeft;
        setError(
          `Account locked due to too many failed attempts. Please try again in ${minutesLeft} minutes.`
        );
      } else if (err.response?.status === 401) {
        // Wrong DOB or PIN
        const attemptsRemaining = err.response.data.attemptsRemaining;
        if (attemptsRemaining !== undefined) {
          setError(
            `Incorrect PIN. ${attemptsRemaining} attempts remaining before account lock.`
          );
        } else {
          setError(err.response.data.error || "Verification failed");
        }
      } else {
        setError(err.response?.data?.error || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockedUntil && new Date(lockedUntil) > new Date();

  // Show loading state while fetching patient info
  if (initializing) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
          <svg className="animate-spin w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-gray-600">Loading verification...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Verify Identity</h2>
        <p className="text-gray-600 mt-2">
          Please verify your identity for: <strong>{patientName}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        {/* DOB Input - Only for existing users */}
        {!isNewUser && (
          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              disabled={loading || !!isLocked}
            />
          </div>
        )}

        {/* PIN Input or Create PIN */}
        {!needsPin ? (
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              4-Digit PIN <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(value);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
              placeholder="••••"
              maxLength={4}
              required
              disabled={loading || !!isLocked}
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter your 4-digit security PIN
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>First time login!</strong> Please create a 4-digit PIN to
                secure your account.
              </p>
            </div>

            <div>
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Create 4-Digit PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="pinConfirm"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Re-enter PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="pinConfirm"
                value={pinConfirm}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPinConfirm(value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
                required
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={loading || !!isLocked}
          >
            {loading ? (needsPin ? "Creating PIN..." : "Verifying...") : needsPin ? "Create PIN" : "Verify"}
          </button>
        </div>
      </form>
    </div>
  );
}
