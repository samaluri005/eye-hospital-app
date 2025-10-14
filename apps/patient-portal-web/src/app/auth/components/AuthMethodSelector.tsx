"use client";
import React from "react";

type AuthMethod = "phone" | "email" | "upi" | "social" | "signup";

type Props = {
  onMethodSelected: (method: AuthMethod) => void;
};

export default function AuthMethodSelector({ onMethodSelected }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Eye Hospital Portal</h1>
        <p className="text-gray-600">Welcome! Please choose how you'd like to continue</p>
      </div>

      {/* Existing Patients - Sign In */}
      <button
        onClick={() => onMethodSelected("upi")}
        className="w-full group bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-200 hover:border-emerald-300 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
              Existing Patients
            </h2>
            <p className="text-sm text-gray-600">
              Already have a Hospital ID? Sign in here
            </p>
          </div>
          <svg className="w-6 h-6 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
        </div>
      </div>

      {/* New Patients - Sign Up */}
      <button
        onClick={() => onMethodSelected("signup")}
        className="w-full group bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-200 hover:border-emerald-300 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
              New Patient Registration
            </h2>
            <p className="text-sm text-gray-600">
              First time? Register here
            </p>
          </div>
          <svg className="w-6 h-6 text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <a href="#" className="text-emerald-600 hover:underline font-medium">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-emerald-600 hover:underline font-medium">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
