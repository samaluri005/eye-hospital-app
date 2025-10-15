"use client";
import React from "react";
import { motion } from "framer-motion";

type Props = {
  patientName: string;
  healthId: string;
  onContinue: () => void;
};

export default function WelcomeStep({ patientName, healthId, onContinue }: Props) {
  return (
    <div className="space-y-8">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center"
      >
        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      {/* Welcome Message */}
      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-gray-900"
        >
          Welcome, {patientName}!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600"
        >
          Your account has been created successfully
        </motion.p>
      </div>

      {/* Health ID Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg"
      >
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            <span className="text-sm font-medium opacity-90">Your Health ID</span>
          </div>
          <div className="text-2xl font-bold tracking-wider font-mono bg-white/20 rounded-lg py-3 px-4 text-center">
            {healthId}
          </div>
          <p className="text-xs opacity-75 text-center">
            Save this ID - you'll need it to sign in
          </p>
        </div>
      </motion.div>

      {/* Important Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-blue-900 font-semibold mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Access your health dashboard to view appointments and records</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Complete your medical history for better care</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Book appointments with our eye care specialists</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
      >
        Go to Dashboard
      </motion.button>

      {/* Security Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-gray-500 text-center"
      >
        Your information is protected with bank-level security and HIPAA compliance
      </motion.p>
    </div>
  );
}
