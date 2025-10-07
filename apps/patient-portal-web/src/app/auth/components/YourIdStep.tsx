"use client";

import { IdCard, ArrowRight, UserPlus } from "lucide-react";

interface YourIdStepProps {
  upi: string;
  onCompleteProfile: () => void;
  onSkip: () => void;
}

export default function YourIdStep({ upi, onCompleteProfile, onSkip }: YourIdStepProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl mb-6 shadow-2xl shadow-emerald-200">
          <IdCard className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Eye Hospital!</h2>
        <p className="text-gray-600 text-lg">Your account has been created successfully</p>
      </div>

      {/* UPI Display Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-8">
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-700 mb-2">Your Hospital ID</p>
          <div className="bg-white rounded-xl px-6 py-4 mb-4 inline-block">
            <p className="text-3xl font-bold text-emerald-600 tracking-wide font-mono">{upi}</p>
          </div>
          <p className="text-sm text-gray-600">
            Save this ID for future sign-ins. You can use it with your password to access your account anytime.
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Ways to Sign In</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use your Hospital ID + Password</li>
              <li>• Use your phone number + OTP</li>
              <li>• Use your email + OTP</li>
              <li>• Use Google or Microsoft account</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onCompleteProfile}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 group"
        >
          <UserPlus className="w-5 h-5" />
          Complete Your Profile
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button
          onClick={onSkip}
          className="w-full py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
        >
          Skip for Now
        </button>
      </div>

      {/* Help Text */}
      <p className="text-center text-sm text-gray-500">
        You can complete your profile later from your dashboard settings
      </p>
    </div>
  );
}
