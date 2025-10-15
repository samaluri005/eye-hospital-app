"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";
import { maskUPI } from "../../../../lib/utils";

interface VerificationStepProps {
  patientId: string;
  patientName: string;
  patientUpi?: string;
  linkToken: string;
  onVerified: () => void;
  onBack: () => void;
  isNewUser?: boolean;
  profileDob?: string;
}

export default function VerificationStep({
  patientId,
  patientName,
  patientUpi = "",
  linkToken,
  onVerified,
  onBack,
  isNewUser = false,
  profileDob = "",
}: VerificationStepProps) {
  const [fullUpi, setFullUpi] = useState(patientUpi);
  const [lastFourInput, setLastFourInput] = useState("");
  const [isUpiEditing, setIsUpiEditing] = useState(false);
  const [dob, setDob] = useState(profileDob);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!isNewUser);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

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
            if (response.data.dob) {
              setDob(response.data.dob);
            }
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

  useEffect(() => {
    if (profileDob && profileDob !== dob) {
      setDob(profileDob);
    }
  }, [profileDob]);

  useEffect(() => {
    if (patientUpi && patientUpi !== fullUpi) {
      setFullUpi(patientUpi);
    }
  }, [patientUpi]);

  const handleUpiFocus = () => {
    setIsUpiEditing(true);
    setLastFourInput("");
  };

  const handleUpiBlur = () => {
    setIsUpiEditing(false);
    if (lastFourInput.length === 4 && fullUpi) {
      const prefix = fullUpi.slice(0, -4);
      const newFullUpi = prefix + lastFourInput.toUpperCase();
      setFullUpi(newFullUpi);
    }
    setLastFourInput("");
  };

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 4) {
      setLastFourInput(value);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const verifyResponse = await axios.post(
        "/api/auth/account-verification/verify",
        {
          patientId,
          dob,
          linkToken,
        }
      );

      if (verifyResponse.data.status === "verified") {
        onVerified();
      }
    } catch (err: any) {
      console.error("Verification error:", err);

      if (err.response?.status === 423) {
        setLockedUntil(err.response.data.lockedUntil);
        const minutesLeft = err.response.data.minutesLeft;
        setError(
          `Account locked due to too many failed attempts. Please try again in ${minutesLeft} minutes.`
        );
      } else if (err.response?.status === 401) {
        const attemptsRemaining = err.response.data.attemptsRemaining;
        if (attemptsRemaining !== undefined) {
          setError(
            `Incorrect information. ${attemptsRemaining} attempts remaining before account lock.`
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

  if (initializing) {
    return <LoadingSpinner size="lg" message="Loading verification..." />;
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Identity</h2>
        <p className="text-gray-600">
          {patientName}
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        {fullUpi && (
          <div>
            <label
              htmlFor="upi"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              UPI (Unique Patient ID)
            </label>
            <div className="relative">
              <input
                type="text"
                id="upi"
                value={isUpiEditing ? lastFourInput : maskUPI(fullUpi)}
                onChange={handleUpiChange}
                onFocus={handleUpiFocus}
                onBlur={handleUpiBlur}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono bg-gray-50"
                placeholder={isUpiEditing ? "Enter last 4 characters" : ""}
                disabled={loading || !!isLocked}
                maxLength={4}
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isUpiEditing ? "Enter only the last 4 characters of your UPI" : "Click to edit and verify the last 4 characters"}
            </p>
          </div>
        )}

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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert" aria-live="polite">
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
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </form>
    </div>
  );
}
