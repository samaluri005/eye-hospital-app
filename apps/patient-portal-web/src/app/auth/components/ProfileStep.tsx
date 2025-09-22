"use client";
import React, { useState } from "react";

type Props = {
  initialName?: string;
  onNext: (data: { fullName?: string; password?: string }) => void;
  onSkip: () => void;
};

export default function ProfileStep({ initialName, onNext, onSkip }: Props) {
  const [name, setName] = useState(initialName || "");
  const [password, setPassword] = useState("");
  const [optSetPassword, setOptSetPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Your Profile</h3>
        <p className="text-gray-600">Add your details to personalize your healthcare experience</p>
      </div>

      {/* Profile Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-blue-800 font-semibold mb-1">Profile Setup</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              Your profile information helps us provide personalized healthcare services and improves your care experience.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <svg className="w-4 h-4 inline mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Full Name
          </label>
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
            value={name} 
            onChange={(e)=>setName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        {/* Password Option */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={optSetPassword} 
              onChange={()=>setOptSetPassword(x=>!x)}
              className="mt-1 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-semibold text-gray-900">Set a password now</span>
              <span className="text-gray-500 ml-1">(Optional)</span>
              <p className="text-sm text-gray-600 mt-1">
                Create a password for direct login access to your account
              </p>
            </div>
          </label>
        </div>

        {optSetPassword && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 inline mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Password
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="Create a secure password"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2"
          onClick={()=>onNext({ fullName: name, password: optSetPassword ? password : undefined })}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Next</span>
        </button>
        
        <button 
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full"
          onClick={onSkip}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}