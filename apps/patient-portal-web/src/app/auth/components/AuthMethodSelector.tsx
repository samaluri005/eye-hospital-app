"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

type AuthMethod = "phone" | "email" | "upi" | "social" | "signup";

type Props = {
  onMethodSelected: (method: AuthMethod) => void;
};

export default function AuthMethodSelector({ onMethodSelected }: Props) {
  const [hospitalId, setHospitalId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaPin, setMfaPin] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hospitalId.trim()) {
      setError("Please enter your Hospital ID");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/auth/upi-signin", {
        upi: hospitalId.toUpperCase().trim(),
        password,
        rememberMe: false,
      });

      if (response.data.mfaRequired) {
        setMfaRequired(true);
        setTempToken(response.data.tempToken);
      } else if (response.data.sessionToken || response.data.accessToken) {
        window.location.href = "/dashboard";
      } else {
        setError("Unexpected response from server");
      }
    } catch (e: any) {
      const errorCode = e?.response?.data?.error;
      const errorMessage = e?.response?.data?.message;
      
      if (errorCode === "incomplete_signup") {
        setError(errorMessage || "Your account setup is incomplete. Please complete signup.");
      } else if (errorCode === "invalid_credentials") {
        setError(errorMessage || "Invalid Hospital ID or password");
      } else {
        setError(errorMessage || e.message || "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mfaPin || mfaPin.length !== 4) {
      setError("Please enter your 4-digit PIN");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/auth/verify-mfa", {
        tempToken,
        pin: mfaPin,
      });

      if (response.data.sessionToken || response.data.accessToken) {
        window.location.href = "/dashboard";
      } else {
        setError("MFA verification failed");
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.response?.data?.error || e.message || "MFA verification failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="space-y-8">
        {/* Logo and Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">EyeCare Hospital</h1>
              <p className="text-xs text-gray-600">Patient Portal</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-gray-600">Enter your 4-digit security PIN to continue</p>
        </div>

        {/* MFA Form */}
        <form onSubmit={handleMfaVerify} className="space-y-5">
          <div>
            <label htmlFor="mfaPin" className="block text-sm font-semibold text-gray-700 mb-2">
              Security PIN
            </label>
            <motion.input
              whileFocus={{ scale: 1.01, borderColor: "#10b981" }}
              transition={{ duration: 0.2 }}
              type="password"
              id="mfaPin"
              value={mfaPin}
              onChange={(e) => setMfaPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              maxLength={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors text-center text-2xl tracking-widest"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            transition={{ duration: 0.15 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify PIN"}
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setMfaRequired(false);
              setMfaPin("");
              setTempToken(null);
              setError(null);
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo and Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">EyeCare Hospital</h1>
            <p className="text-xs text-gray-600">Patient Portal</p>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600">Sign in to access your eye care account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSignIn} className="space-y-5">
        {/* Hospital ID Field */}
        <div>
          <label htmlFor="hospitalId" className="block text-sm font-semibold text-gray-700 mb-2">
            Hospital ID
          </label>
          <motion.input
            whileFocus={{ scale: 1.01, borderColor: "#10b981" }}
            transition={{ duration: 0.2 }}
            type="text"
            id="hospitalId"
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            placeholder="Enter your unique patient ID"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
            required
          />
          <a href="#" className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-1 inline-block">
            Forgot ID?
          </a>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <motion.input
              whileFocus={{ scale: 1.01, borderColor: "#10b981" }}
              transition={{ duration: 0.2 }}
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <a href="#" className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-1 inline-block">
            Forgot Password?
          </a>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Sign In Button */}
        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          transition={{ duration: 0.15 }}
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Sign In"}
        </motion.button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">New Patient?</span>
        </div>
      </div>

      {/* New Patient Registration Options */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          onClick={() => onMethodSelected("signup")}
          className="w-full py-3 px-6 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold rounded-lg transition-all duration-200"
        >
          Create New Account
        </motion.button>
        
        <p className="text-center text-sm text-gray-600">
          First time here?{" "}
          <button
            onClick={() => onMethodSelected("signup")}
            className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
          >
            Register Now
          </button>
        </p>
      </div>

      {/* Copyright Footer */}
      <div className="pt-6 border-t border-gray-200">
        <p className="text-center text-xs text-gray-500">
          © 2025 EyeCare Hospital. All rights reserved
        </p>
        <p className="text-center text-xs text-gray-500 mt-2">
          By continuing, you agree to our{" "}
          <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
