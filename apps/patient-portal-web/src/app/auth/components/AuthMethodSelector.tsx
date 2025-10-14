"use client";
import React from "react";

type AuthMethod = "phone" | "email" | "upi" | "social" | "signup";

type Props = {
  onMethodSelected: (method: AuthMethod) => void;
};

export default function AuthMethodSelector({ onMethodSelected }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EyeCare</h1>
                <p className="text-xs text-gray-600">Patient Portal</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Let's access your eye care account</p>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="space-y-4">
            {/* Existing Patients Button */}
            <button
              onClick={() => onMethodSelected("upi")}
              className="w-full group bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-xl p-4 transition-all duration-200 text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    Existing Patients
                  </h3>
                  <p className="text-sm text-gray-600">
                    Already have a Hospital ID? Sign in here
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* New Patient Registration Button */}
            <button
              onClick={() => onMethodSelected("signup")}
              className="w-full group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl p-4 transition-all duration-200 text-left shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 group-hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    New Patient Registration
                  </h3>
                  <p className="text-sm text-emerald-50">
                    First time? Register here
                  </p>
                </div>
                <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Footer Text */}
          <div className="text-center pt-6">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <a href="#" className="text-emerald-600 hover:underline font-medium">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-emerald-600 hover:underline font-medium">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual with Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <img 
          src="/abstract_eye_care_me_fb46b19d.jpg" 
          alt="Eye Care"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
        />
        <div className="relative z-10 flex items-center justify-center p-12 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Experience World-Class Eye Care
              </h2>
              <p className="text-emerald-50 text-lg leading-relaxed">
                Access your medical records, schedule appointments, and manage your eye health journey with our advanced digital platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
