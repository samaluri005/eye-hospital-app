"use client";
import React from "react";

type AuthMethod = "phone" | "email" | "upi" | "social";

type Props = {
  onMethodSelected: (method: AuthMethod) => void;
};

export default function AuthMethodSelector({ onMethodSelected }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-md">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to MedCare</h1>
        <p className="text-gray-500 text-base">Sign in or create an account to continue</p>
      </div>

      {/* Primary Sign-In Options */}
      <div className="space-y-3">
        {/* UPI Sign-In - For Returning Patients */}
        <button
          onClick={() => onMethodSelected("upi")}
          className="w-full p-4 border-2 border-emerald-500 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all duration-200 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                Sign In with UPI
              </h3>
              <p className="text-sm text-gray-600">
                For returning patients with a Unique Patient ID
              </p>
            </div>
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Phone Sign-In/Sign-Up */}
        <button
          onClick={() => onMethodSelected("phone")}
          className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                Continue with Phone
              </h3>
              <p className="text-sm text-gray-600">
                Sign in or create account with phone number
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Email Sign-In/Sign-Up */}
        <button
          onClick={() => onMethodSelected("email")}
          className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                Continue with Email
              </h3>
              <p className="text-sm text-gray-600">
                Sign in or create account with email address
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
        </div>
      </div>

      {/* Social Login Button */}
      <button
        onClick={() => onMethodSelected("social")}
        className="w-full py-3 px-6 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
        Social Login (Google/Microsoft/Apple)
      </button>

      {/* Help Text */}
      <div className="text-center pt-4">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
