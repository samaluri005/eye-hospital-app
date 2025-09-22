"use client";
import React, { useState } from "react";
import axios from "axios";

type Props = {
  onAccepted: () => void;
  onDeclined: () => void;
};

export default function ConsentStep({ onAccepted, onDeclined }: Props) {
  const [requiredChecked, setRequiredChecked] = useState(false);
  const [optionalChecked, setOptionalChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function accept() {
    if (!requiredChecked) return setErr("You must accept Terms & Privacy to continue");
    setSaving(true); setErr(null);
    try {
      // POST consent to backend for audit
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.post(`${backend}/consent`, {
        consentType: "tos+privacy",
        version: "v1",
        accepted: true
      });
      onAccepted();
    } catch (e:any) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Privacy & Terms</h3>
        <p className="text-gray-600">Please review and accept our terms to complete your registration</p>
      </div>

      {/* Consent Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-blue-800 font-semibold mb-1">HIPAA Compliance</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              Your medical information is protected under HIPAA regulations. We use industry-standard encryption and security measures.
            </p>
          </div>
        </div>
      </div>

      {/* Consent Checkboxes */}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={requiredChecked} 
              onChange={()=>setRequiredChecked(x=>!x)}
              className="mt-1 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-semibold text-gray-900">I agree to the Terms of Service and Privacy Policy</span>
              <span className="text-red-500 ml-1">*</span>
              <p className="text-sm text-gray-600 mt-1">
                Required to create your account and access medical services
              </p>
            </div>
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={optionalChecked} 
              onChange={()=>setOptionalChecked(x=>!x)}
              className="mt-1 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-semibold text-gray-900">Share anonymized data for medical research</span>
              <span className="text-gray-500 ml-1">(Optional)</span>
              <p className="text-sm text-gray-600 mt-1">
                Help improve healthcare outcomes by contributing to anonymized research studies
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-red-800 font-semibold">Error</h4>
              <p className="text-red-700 text-sm mt-1">{err}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2 ${(!requiredChecked || saving) ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={!requiredChecked || saving} 
          onClick={accept}
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Accept & Continue</span>
            </>
          )}
        </button>
        
        <button 
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full"
          onClick={onDeclined}
        >
          Decline
        </button>
      </div>
    </div>
  );
}