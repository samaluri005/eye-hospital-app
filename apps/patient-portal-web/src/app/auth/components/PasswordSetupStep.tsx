"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Check, X } from "lucide-react";

interface PasswordSetupStepProps {
  onPasswordSet: (password: string) => void;
  onBack?: () => void;
}

export default function PasswordSetupStep({ onPasswordSet, onBack }: PasswordSetupStepProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // Password strength calculation
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score, label: "Medium", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const strength = password ? calculateStrength(password) : null;

  // Validation checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!checks.length) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    onPasswordSet(password);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Your Account</h2>
        <p className="text-gray-600">
          Create a strong password for signing in with your Hospital ID
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Strength Meter */}
          {password && strength && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Password strength:</span>
                <span className={`text-xs font-semibold ${
                  strength.label === 'Strong' ? 'text-green-600' : 
                  strength.label === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {strength.label}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Re-enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {checks.length ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${checks.length ? 'text-green-600' : 'text-gray-600'}`}>
                At least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              {checks.uppercase ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${checks.uppercase ? 'text-green-600' : 'text-gray-600'}`}>
                One uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-2">
              {checks.lowercase ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${checks.lowercase ? 'text-green-600' : 'text-gray-600'}`}>
                One lowercase letter
              </span>
            </div>
            <div className="flex items-center gap-2">
              {checks.number ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${checks.number ? 'text-green-600' : 'text-gray-600'}`}>
                One number
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4" role="alert" aria-live="polite">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!checks.length || password !== confirmPassword}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
