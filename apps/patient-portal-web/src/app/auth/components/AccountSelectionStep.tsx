"use client";
import React from "react";

export interface AccountOption {
  patientId: string;
  name: string;
  hasProfile: boolean;
  relationship?: string;
  isPrimary?: boolean;
}

interface AccountSelectionStepProps {
  accounts: AccountOption[];
  phone: string;
  onAccountSelected: (patientId: string) => void;
  onAddFamilyMember: () => void;
}

export default function AccountSelectionStep({
  accounts,
  phone,
  onAccountSelected,
  onAddFamilyMember,
}: AccountSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Multiple Accounts Found
        </h3>
        <p className="text-sm text-gray-600">
          We found {accounts.length} account{accounts.length > 1 ? "s" : ""} associated with {phone}
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <button
            key={account.patientId}
            onClick={() => onAccountSelected(account.patientId)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 group-hover:text-emerald-700">
                  {account.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">
                    {account.relationship || "Primary Account"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-500">
                    {account.hasProfile ? "Profile Complete" : "Profile Incomplete"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {account.isPrimary && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded">
                    You
                  </span>
                )}
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">Or</span>
        </div>
      </div>

      <button
        onClick={onAddFamilyMember}
        className="w-full py-3 px-4 bg-white border-2 border-emerald-500 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add New Family Member
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Adding a family member creates a new patient account linked to this phone number
      </p>
    </div>
  );
}
