"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import InternationalPhoneInput from "./InternationalPhoneInput";

export type ProfileData = {
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nameSuffix?: string;
  dateOfBirth: string; // YYYY-MM-DD format
  gender?: string;
  mobile?: string;
  email?: string;
  password?: string;
  patientType?: string;
  guardianName?: string;
  govtIdType?: string; // Government ID type
  govtIdNumber?: string; // Government ID number
  bloodGroup?: string;
  sourceOfPatient?: string;
  referralName?: string;
  referralPhone?: string;
  occupation?: string;
  maritalStatus?: string;
  spouseName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentPostalCode?: string;
  permanentCountry?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  relationship?: string; // For family members
};

type Props = {
  onNext: (data: ProfileData) => void;
  onSkip: () => void;
  isAddingFamilyMember?: boolean;
  mode?: "minimal" | "extended"; // minimal: only name + DOB, extended: all fields
  initialData?: ProfileData; // Pre-populate form with existing data
};

const FAMILY_RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'dependent', label: 'Dependent' },
  { value: 'other', label: 'Other Family Member' },
];

export default function ProfileStep({ onNext, onSkip, isAddingFamilyMember = false, mode = "extended", initialData }: Props) {
  const isMinimalMode = mode === "minimal";
  const [title, setTitle] = useState(initialData?.title || "");
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [middleName, setMiddleName] = useState(initialData?.middleName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [nameSuffix, setNameSuffix] = useState(initialData?.nameSuffix || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "");
  const [gender, setGender] = useState(initialData?.gender || "");
  const [mobile, setMobile] = useState(initialData?.mobile || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [patientType, setPatientType] = useState(initialData?.patientType || "");
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || "");
  const [relationship, setRelationship] = useState(initialData?.relationship || "");
  const [govtIdType, setGovtIdType] = useState(initialData?.govtIdType || "");
  const [govtIdNumber, setGovtIdNumber] = useState(initialData?.govtIdNumber || "");
  
  const [addressLine1, setAddressLine1] = useState(initialData?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(initialData?.addressLine2 || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [postalCode, setPostalCode] = useState(initialData?.postalCode || "");
  const [country, setCountry] = useState(initialData?.country || "India");
  
  const [emergencyContact, setEmergencyContact] = useState(initialData?.emergencyContact || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialData?.emergencyPhone || "");
  
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "");
  const [sourceOfPatient, setSourceOfPatient] = useState(initialData?.sourceOfPatient || "");
  const [referralName, setReferralName] = useState(initialData?.referralName || "");
  const [referralPhone, setReferralPhone] = useState(initialData?.referralPhone || "");
  const [occupation, setOccupation] = useState(initialData?.occupation || "");
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || "");
  const [spouseName, setSpouseName] = useState(initialData?.spouseName || "");
  const [permanentAddressLine1, setPermanentAddressLine1] = useState(initialData?.permanentAddressLine1 || "");
  const [permanentAddressLine2, setPermanentAddressLine2] = useState(initialData?.permanentAddressLine2 || "");
  const [permanentCity, setPermanentCity] = useState(initialData?.permanentCity || "");
  const [permanentState, setPermanentState] = useState(initialData?.permanentState || "");
  const [permanentPostalCode, setPermanentPostalCode] = useState(initialData?.permanentPostalCode || "");
  const [permanentCountry, setPermanentCountry] = useState(initialData?.permanentCountry || "India");
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldValid, setFieldValid] = useState<Record<string, boolean>>({});

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months, days };
  };

  const age = calculateAge(dateOfBirth);
  const isMinor = age ? age.years < 18 : false;

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(password);

  // Real-time email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle field blur validation
  const handleFieldBlur = (field: string, value: string) => {
    const errors = { ...fieldErrors };
    const valid = { ...fieldValid };

    switch (field) {
      case 'email':
        if (isMinimalMode && value && !validateEmail(value)) {
          errors.email = 'Please enter a valid email address';
          valid.email = false;
        } else if (value && validateEmail(value)) {
          delete errors.email;
          valid.email = true;
        }
        break;
      case 'password':
        if (isMinimalMode && value && value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
          valid.password = false;
        } else if (value && value.length >= 8) {
          delete errors.password;
          valid.password = true;
        }
        break;
      case 'confirmPassword':
        if (isMinimalMode && value && value !== password) {
          errors.confirmPassword = 'Passwords do not match';
          valid.confirmPassword = false;
        } else if (value && value === password) {
          delete errors.confirmPassword;
          valid.confirmPassword = true;
        }
        break;
    }

    setFieldErrors(errors);
    setFieldValid(valid);
  };

  const handleSubmit = () => {
    setError(null);
    
    // Validate required fields
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required");
      return;
    }
    
    // Validate email in minimal mode
    if (isMinimalMode && email && !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate password in minimal mode
    if (isMinimalMode && password && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Validate password match
    if (isMinimalMode && password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate terms acceptance
    if (isMinimalMode && !acceptTerms) {
      setError("You must accept the terms and privacy policy");
      return;
    }
    
    // Validate gender in minimal mode
    if (isMinimalMode && !gender) {
      setError("Gender is required");
      return;
    }
    
    // Validate guardian name if minor (in minimal mode during signup)
    if (isMinimalMode && isMinor && !guardianName.trim()) {
      setError("Guardian name is required for patients under 18 years");
      return;
    }
    
    // Validate relationship if adding family member
    if (isAddingFamilyMember && !relationship) {
      setError("Relationship is required when adding a family member");
      return;
    }
    
    // Validate age (must be reasonable for healthcare)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const ageInYears = today.getFullYear() - dob.getFullYear();
    if (ageInYears < 0 || ageInYears > 150) {
      setError("Please enter a valid date of birth");
      return;
    }
    
    const profileData: ProfileData = {
      title: title || undefined,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      nameSuffix: nameSuffix || undefined,
      dateOfBirth,
      gender: gender || undefined,
      mobile: mobile.trim() || undefined,
      email: email.trim() || undefined,
      password: password || undefined,
      patientType: patientType || undefined,
      guardianName: guardianName.trim() || undefined,
      govtIdType: govtIdType || undefined,
      govtIdNumber: govtIdNumber.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
      sourceOfPatient: sourceOfPatient || undefined,
      referralName: sourceOfPatient === "Referral" ? referralName.trim() || undefined : undefined,
      referralPhone: sourceOfPatient === "Referral" ? referralPhone.trim() || undefined : undefined,
      occupation: occupation.trim() || undefined,
      maritalStatus: maritalStatus || undefined,
      spouseName: maritalStatus === "Married" ? spouseName.trim() || undefined : undefined,
      addressLine1: addressLine1.trim() || undefined,
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country || undefined,
      permanentAddressLine1: permanentAddressLine1.trim() || undefined,
      permanentAddressLine2: permanentAddressLine2.trim() || undefined,
      permanentCity: permanentCity.trim() || undefined,
      permanentState: permanentState.trim() || undefined,
      permanentPostalCode: permanentPostalCode.trim() || undefined,
      permanentCountry: permanentCountry || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      emergencyPhone: emergencyPhone.trim() || undefined,
      relationship: isAddingFamilyMember ? relationship : undefined,
    };

    onNext(profileData);
  };

  return (
    <div className="space-y-6">
      {/* Header - Clean and Minimal */}
      <div className="text-center">
        {/* Progress Indicator */}
        {isMinimalMode && (
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div className="ml-2 text-sm font-medium text-gray-900">Profile</div>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="ml-2 text-sm font-medium text-gray-500">Verification</div>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="ml-2 text-sm font-medium text-gray-500">Complete</div>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {isAddingFamilyMember 
            ? "Add Family Member" 
            : isMinimalMode 
              ? "Create Your Profile" 
              : "Complete Your Profile"
          }
        </h3>
        <p className="text-gray-600 text-sm">
          {isAddingFamilyMember 
            ? "Please provide information for the family member you're adding"
            : isMinimalMode
              ? "Let's get started with your basic information"
              : "Help us serve you better with additional details (optional)"
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-red-800 font-medium text-sm">Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form Fields */}
      <div className="space-y-5">
        {/* Personal Information Section */}
        <div className="border border-gray-200 rounded-lg p-5 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center text-sm">
            <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal Information <span className="text-red-500 ml-1">*</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title Dropdown - Compact */}
            {isMinimalMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <select 
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value)}
                >
                  <option value="">Select Title</option>
                  <option value="Mr">Mr.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Miss">Miss</option>
                  <option value="Ms">Ms.</option>
                  <option value="Dr">Dr.</option>
                  <option value="Master">Master</option>
                  <option value="Baby">Baby</option>
                </select>
              </div>
            )}
          
            <div className={isMinimalMode && title ? "" : "md:col-span-2"}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10" 
                  value={firstName} 
                  onChange={(e)=>setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
                {firstName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {!isMinimalMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Middle Name
                </label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={middleName} 
                  onChange={(e)=>setMiddleName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10" 
                  value={lastName} 
                  onChange={(e)=>setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
                {lastName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {!isMinimalMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name Suffix
                </label>
                <select 
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={nameSuffix} 
                  onChange={(e)=>setNameSuffix(e.target.value)}
                >
                  <option value="">None</option>
                  <option value="Jr">Jr.</option>
                  <option value="Sr">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date of Birth - Modern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="date"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={dateOfBirth} 
                  onChange={(e)=>setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              {age && (
                <p className="text-xs text-emerald-600 mt-1.5">
                  Age: {age.years} years, {age.months} months
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Gender {isMinimalMode && <span className="text-red-500">*</span>}
              </label>
              <select 
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={gender} 
                onChange={(e)=>setGender(e.target.value)}
                required={isMinimalMode}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Mobile Number - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mobile Number
                <span className="text-gray-500 text-xs ml-1">(Recommended for appointment reminders)</span>
              </label>
              <InternationalPhoneInput
                value={mobile}
                onChange={setMobile}
              />
            </div>
          )}

          {/* Email - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="email"
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 pr-10 ${
                    fieldErrors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : fieldValid.email 
                        ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                        : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  value={email} 
                  onChange={(e)=>setEmail(e.target.value)}
                  onBlur={(e)=>handleFieldBlur('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
                {fieldValid.email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>
          )}

          {/* Password - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 pr-10 ${
                    fieldErrors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : fieldValid.password 
                        ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                        : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  value={password} 
                  onChange={(e)=>setPassword(e.target.value)}
                  onBlur={(e)=>handleFieldBlur('password', e.target.value)}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? passwordStrength <= 2
                              ? 'bg-red-500'
                              : passwordStrength <= 3
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {passwordStrength <= 2 && 'Weak password'}
                    {passwordStrength === 3 && 'Fair password'}
                    {passwordStrength >= 4 && 'Strong password'}
                  </p>
                </div>
              )}
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
              )}
            </div>
          )}

          {/* Confirm Password - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 pr-10 ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : fieldValid.confirmPassword 
                        ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                        : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  value={confirmPassword} 
                  onChange={(e)=>setConfirmPassword(e.target.value)}
                  onBlur={(e)=>handleFieldBlur('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                {fieldValid.confirmPassword && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Guardian Name - Only for minors in minimal mode */}
          {isMinimalMode && isMinor && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-amber-900 mb-1.5">
                Guardian Name <span className="text-red-500">*</span>
                <span className="text-xs text-amber-700 block mt-1">Required for patients under 18 years</span>
              </label>
              <input 
                type="text"
                className="w-full px-3 py-2.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" 
                value={guardianName} 
                onChange={(e)=>setGuardianName(e.target.value)}
                placeholder="Full name of parent or legal guardian"
                required
              />
            </div>
          )}

          {/* Patient Type - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Patient Type
              </label>
              <select 
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={patientType} 
                onChange={(e)=>setPatientType(e.target.value)}
              >
                <option value="">Select Patient Type</option>
                <option value="General">General</option>
                <option value="Insurer">Insurer</option>
                <option value="Corporate">Corporate</option>
                <option value="Senior Citizen">Senior Citizen</option>
                <option value="Student">Student</option>
              </select>
            </div>
          )}
        </div>

        {/* Terms and Privacy - Minimal Mode */}
        {isMinimalMode && (
          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the{' '}
              <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                Privacy Policy
              </a>
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
        )}

        {/* Relationship - Family Members */}
        {isAddingFamilyMember && (
          <div className="border border-gray-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-900 flex items-center mb-4 text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Family Relationship <span className="text-red-500 ml-1">*</span>
            </h4>
            <select 
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              value={relationship} 
              onChange={(e)=>setRelationship(e.target.value)}
              required
            >
              <option value="">Select Relationship</option>
              {FAMILY_RELATIONSHIPS.map(rel => (
                <option key={rel.value} value={rel.value}>{rel.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Extended Mode Fields */}
        {!isMinimalMode && (
          <>
          {/* Contact Information */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Contact Information
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
              <InternationalPhoneInput
                value={mobile}
                onChange={setMobile}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input 
                type="email"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Additional Information - Collapsible */}
          {showOptional ? (
            <>
              {/* Government ID */}
              <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center text-sm">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  Government ID (Optional)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Type</label>
                    <select 
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                      value={govtIdType} 
                      onChange={(e)=>setGovtIdType(e.target.value)}
                    >
                      <option value="">Select ID Type</option>
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Passport">Passport</option>
                      <option value="DrivingLicense">Driving License</option>
                      <option value="VoterID">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Number</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                      value={govtIdNumber} 
                      onChange={(e)=>setGovtIdNumber(e.target.value)}
                      placeholder="Enter ID number"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center text-sm">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Medical Information (Optional)
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group</label>
                  <select 
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={bloodGroup} 
                    onChange={(e)=>setBloodGroup(e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

            {/* Present Address */}
            <div className="border border-gray-200 rounded-lg p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Present Address (Optional)
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={addressLine1} 
                  onChange={(e)=>setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={addressLine2} 
                  onChange={(e)=>setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={city} 
                    onChange={(e)=>setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={state} 
                    onChange={(e)=>setState(e.target.value)}
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={postalCode} 
                    onChange={(e)=>setPostalCode(e.target.value)}
                    placeholder="ZIP / Postal code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={country} 
                  onChange={(e)=>setCountry(e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border border-gray-200 rounded-lg p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm">
                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Emergency Contact (Optional)
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={emergencyContact} 
                  onChange={(e)=>setEmergencyContact(e.target.value)}
                  placeholder="Full name of emergency contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                <InternationalPhoneInput
                  value={emergencyPhone}
                  onChange={setEmergencyPhone}
                />
              </div>
            </div>
          </>
            ) : (
              <button
                type="button"
                onClick={() => setShowOptional(true)}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Optional Information</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2 shadow-sm"
          onClick={handleSubmit}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{isMinimalMode ? "Continue" : "Save Profile"}</span>
        </motion.button>
        
        {!isMinimalMode && (
          <button 
            type="button"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full"
            onClick={onSkip}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
