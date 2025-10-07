"use client";
import React, { useState } from "react";

export type ConsentData = {
  hipaaConsent: boolean;
  communicationConsent: boolean;
  researchConsent?: boolean;
};

type Props = {
  onNext: (data: ConsentData) => void;
  patientName?: string;
};

export default function HipaaConsentStep({ onNext, patientName }: Props) {
  const [hipaaConsent, setHipaaConsent] = useState(false);
  const [communicationConsent, setCommunicationConsent] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    if (!hipaaConsent) {
      setError("You must accept the HIPAA Privacy Notice to continue");
      return;
    }

    if (!communicationConsent) {
      setError("You must consent to electronic communications to use this portal");
      return;
    }

    onNext({
      hipaaConsent,
      communicationConsent,
      researchConsent,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Privacy & Consent
        </h3>
        <p className="text-gray-600">
          Review and accept our privacy practices to complete your registration
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-red-800 font-medium">Required</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* HIPAA Privacy Notice - Required */}
      <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50">
        <div className="flex items-start space-x-3 mb-4">
          <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-blue-900 font-semibold mb-2">HIPAA Privacy Notice</h4>
            <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-3">
              <p className="font-semibold">Notice of Privacy Practices - Summary</p>
              
              <p>
                <strong>Your Rights:</strong> You have the right to request restrictions on certain uses and disclosures of your protected health information (PHI). You may request to access, amend, or receive an accounting of disclosures of your PHI.
              </p>
              
              <p>
                <strong>How We Use Your Information:</strong> We may use and disclose your PHI for treatment, payment, and healthcare operations. We may also use your information to contact you with appointment reminders, treatment alternatives, or other health-related benefits and services.
              </p>
              
              <p>
                <strong>Your Consent:</strong> By accepting this notice, you acknowledge that you have been provided with a copy of our Notice of Privacy Practices and consent to the use and disclosure of your PHI as described therein.
              </p>
              
              <p>
                <strong>Security:</strong> All PHI is encrypted both in transit and at rest. We maintain comprehensive audit logs of all access to your medical records in compliance with HIPAA regulations.
              </p>
              
              <p className="text-blue-600">
                <a href="#" className="underline hover:text-blue-800">Read full Privacy Notice →</a>
              </p>
            </div>
          </div>
        </div>
        
        <label className="flex items-start space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={hipaaConsent}
            onChange={(e) => setHipaaConsent(e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            <strong className="text-red-600">*</strong> I acknowledge that I have reviewed and accept the HIPAA Privacy Notice
          </span>
        </label>
      </div>

      {/* Electronic Communications Consent - Required */}
      <div className="border-2 border-emerald-200 rounded-lg p-5 bg-emerald-50">
        <div className="flex items-start space-x-3 mb-4">
          <svg className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-emerald-900 font-semibold mb-2">Electronic Communications Consent</h4>
            <div className="bg-white rounded-lg p-4 text-sm text-gray-700 leading-relaxed space-y-2">
              <p>
                To use this patient portal, you must consent to receive electronic communications including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Appointment reminders via SMS and email</li>
                <li>Test results and medical updates</li>
                <li>Billing statements and payment receipts</li>
                <li>Portal notifications and security alerts</li>
              </ul>
              <p className="text-emerald-700">
                You can update your communication preferences anytime in your account settings.
              </p>
            </div>
          </div>
        </div>
        
        <label className="flex items-start space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={communicationConsent}
            onChange={(e) => setCommunicationConsent(e.target.checked)}
            className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-0.5"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            <strong className="text-red-600">*</strong> I consent to receive electronic communications as described above
          </span>
        </label>
      </div>

      {/* Research Participation - Optional */}
      <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
        <div className="flex items-start space-x-3 mb-4">
          <svg className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-purple-900 font-semibold mb-2">Research Participation (Optional)</h4>
            <div className="bg-white rounded-lg p-4 text-sm text-gray-700 leading-relaxed space-y-2">
              <p>
                Help advance eye care research by allowing your de-identified medical data to be used for approved research studies.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All data is fully anonymized before use</li>
                <li>Your personal information is never shared</li>
                <li>You can withdraw consent at any time</li>
              </ul>
            </div>
          </div>
        </div>
        
        <label className="flex items-start space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={researchConsent}
            onChange={(e) => setResearchConsent(e.target.checked)}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            I consent to the use of my de-identified health data for research purposes (Optional)
          </span>
        </label>
      </div>

      {/* Legal Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          By clicking "Complete Registration", you confirm that you have read, understood, and agree to the terms outlined above. 
          {patientName && ` This consent is being recorded for ${patientName}.`} 
          A copy of this consent will be stored in your medical record and can be accessed at any time through your account settings.
        </p>
      </div>

      {/* Action Button */}
      <div>
        <button
          onClick={handleSubmit}
          disabled={!hipaaConsent || !communicationConsent}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Complete Registration</span>
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        <strong>*</strong> Required consents to use the patient portal
      </p>
    </div>
  );
}
