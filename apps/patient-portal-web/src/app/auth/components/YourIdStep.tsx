"use client";

import { IdCard, ArrowRight, UserPlus } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

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
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Eye Care!</h2>
        <p className="text-gray-600 text-lg">Your account has been created successfully</p>
      </div>

      {/* Health ID Display Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-sm font-medium text-emerald-700">Your Health ID</p>
            <InfoTooltip text="Your secure identifier for accessing medical records and health portal. You'll need this ID and your password to sign in." />
          </div>
          <div className="bg-white rounded-xl px-6 py-4 mb-4 inline-block">
            <p className="text-3xl font-bold text-emerald-600 tracking-wide font-mono">{upi}</p>
          </div>
          <p className="text-sm text-gray-600">
            Save this ID for future sign-ins. You'll need it with your password to access your account anytime.
          </p>
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
