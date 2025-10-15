"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import InternationalPhoneInput from "./InternationalPhoneInput";
import InfoTooltip from "./InfoTooltip";
import ConsentModal from "./ConsentModal";

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
  guardianRelationship?: string; // Guardian relationship for minors
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
  // Consent fields (only in minimal mode during signup)
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  acceptHipaa?: boolean;
  acceptAuthorization?: boolean;
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

const GUARDIAN_RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' },
];

export default function ProfileStep({ onNext, onSkip, isAddingFamilyMember = false, mode = "extended", initialData }: Props) {
  const isMinimalMode = mode === "minimal";
  
  // Progressive step state for minimal mode
  const [currentStep, setCurrentStep] = useState(1); // 1 = Personal Info, 2 = Contact & Security
  
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
  
  // Consent checkboxes (4 required)
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptHipaa, setAcceptHipaa] = useState(false);
  const [acceptAuthorization, setAcceptAuthorization] = useState(false);
  
  // Modal state
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentModalType, setConsentModalType] = useState<"terms" | "privacy" | "hipaa" | "authorization">("terms");
  const [patientType, setPatientType] = useState(initialData?.patientType || "");
  const [guardianName, setGuardianName] = useState(initialData?.guardianName || "");
  const [guardianRelationship, setGuardianRelationship] = useState(initialData?.guardianRelationship || "");
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
  const [loading, setLoading] = useState(false);
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

  // Validate Step 1 (Personal Info)
  const validateStep1 = (): boolean => {
    setError(null);
    
    if (!firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required");
      return false;
    }
    if (isMinimalMode && !gender) {
      setError("Gender is required");
      return false;
    }
    
    // Validate age
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const ageInYears = today.getFullYear() - dob.getFullYear();
    if (ageInYears < 0 || ageInYears > 150) {
      setError("Please enter a valid date of birth");
      return false;
    }

    // Validate guardian for minors
    if (isMinimalMode && isMinor && !guardianName.trim()) {
      setError("Guardian name is required for patients under 18 years");
      return false;
    }
    
    if (isMinimalMode && isMinor && !guardianRelationship) {
      setError("Guardian relationship is required for patients under 18 years");
      return false;
    }
    
    return true;
  };

  // Validate Step 2 (Contact & Security)
  const validateStep2 = (): boolean => {
    setError(null);
    
    // Validate email if provided
    if (isMinimalMode && email && !validateEmail(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Validate password is required and meets minimum length
    if (isMinimalMode && !password) {
      setError("Password is required");
      return false;
    }

    if (isMinimalMode && password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    // Validate confirm password is required
    if (isMinimalMode && !confirmPassword) {
      setError("Please confirm your password");
      return false;
    }

    // Validate password match
    if (isMinimalMode && password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Validate all 4 consent checkboxes
    if (isMinimalMode && !acceptTerms) {
      setError("You must accept the Terms of Service");
      return false;
    }
    
    if (isMinimalMode && !acceptPrivacy) {
      setError("You must accept the Privacy Policy");
      return false;
    }
    
    if (isMinimalMode && !acceptHipaa) {
      setError("You must consent to HIPAA Notice of Privacy Practices");
      return false;
    }
    
    if (isMinimalMode && !acceptAuthorization) {
      setError("You must authorize use of your health information");
      return false;
    }
    
    return true;
  };

  const handleNext = async () => {
    if (isMinimalMode && currentStep === 1) {
      if (validateStep1()) {
        // EMPI duplicate check after Step 1
        setLoading(true);
        setError(null);
        
        try {
          const response = await axios.post("/api/auth/empi-check", {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            gender: gender || undefined,
            title: title || undefined,
          });
          
          if (response.data.isDuplicate) {
            // Show duplicate warning
            setError(
              `A patient with similar information already exists. If this is you, please sign in instead. If you believe this is an error, please contact hospital administration.`
            );
            setLoading(false);
            return;
          }
          
          // No duplicates, proceed to Step 2
          setCurrentStep(2);
        } catch (err: any) {
          console.error("EMPI check failed:", err);
          setError(err?.response?.data?.message || "Unable to verify patient information. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleSubmit = () => {
    if (isMinimalMode) {
      if (!validateStep2()) return;
    } else {
      // Extended mode validation
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
      
      if (isAddingFamilyMember && !relationship) {
        setError("Relationship is required when adding a family member");
        return;
      }
      
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const ageInYears = today.getFullYear() - dob.getFullYear();
      if (ageInYears < 0 || ageInYears > 150) {
        setError("Please enter a valid date of birth");
        return;
      }
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
      guardianRelationship: guardianRelationship || undefined,
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
      // Include consents only in minimal mode
      acceptTerms: isMinimalMode ? acceptTerms : undefined,
      acceptPrivacy: isMinimalMode ? acceptPrivacy : undefined,
      acceptHipaa: isMinimalMode ? acceptHipaa : undefined,
      acceptAuthorization: isMinimalMode ? acceptAuthorization : undefined,
    };

    onNext(profileData);
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator - Minimal Mode Only */}
      {isMinimalMode && (
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 ${currentStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'} rounded-full flex items-center justify-center text-sm font-semibold`}>
              1
            </div>
            <div className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>Profile</div>
          </div>
          <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 ${currentStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'} rounded-full flex items-center justify-center text-sm font-semibold`}>
              2
            </div>
            <div className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>Verification</div>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div className="ml-2 text-sm font-medium text-gray-500">Complete</div>
          </div>
        </div>
      )}

      {/* Header - Extended Mode Only */}
      {!isMinimalMode && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {isAddingFamilyMember ? "Add Family Member" : "Complete Your Profile"}
          </h3>
          <p className="text-gray-600 text-sm">
            {isAddingFamilyMember 
              ? "Please provide information for the family member you're adding"
              : "Help us serve you better with additional details (optional)"
            }
          </p>
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
      </AnimatePresence>

      {/* Form Fields */}
      <div className="space-y-5">
        {/* STEP 1: Personal Information - Minimal Mode */}
        {isMinimalMode && currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="border border-gray-200 rounded-lg p-5 space-y-4"
          >
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information <span className="text-red-500 ml-1">*</span>
            </h4>
            
            {/* Sequential vertical layout */}
            <div className="space-y-3">
              {/* Title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title
                  </label>
                  <select 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
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
                <div></div>
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={firstName} 
                  onChange={(e)=>setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={lastName} 
                  onChange={(e)=>setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={dateOfBirth} 
                  onChange={(e)=>setDateOfBirth(e.target.value)}
                  placeholder="dd-mm-yyyy"
                  required
                />
                {age && (
                  <p className="text-xs text-gray-500 mt-1">
                    Age: {age.years} years, {age.months} months
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={gender} 
                  onChange={(e)=>setGender(e.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Guardian Name & Relationship - Only for minors */}
            {isMinor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1.5">
                    Guardian Name <span className="text-red-500">*</span>
                    <InfoTooltip text="Full name of parent or legal guardian responsible for the patient" />
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
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1.5">
                    Relationship with Patient <span className="text-red-500">*</span>
                    <InfoTooltip text="Guardian's relationship to the patient" />
                  </label>
                  <select 
                    className="w-full px-3 py-2.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" 
                    value={guardianRelationship} 
                    onChange={(e)=>setGuardianRelationship(e.target.value)}
                    required
                  >
                    <option value="">Select Relationship</option>
                    {GUARDIAN_RELATIONSHIPS.map(rel => (
                      <option key={rel.value} value={rel.value}>{rel.label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STEP 2: Contact & Security - Minimal Mode */}
        {isMinimalMode && currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="border border-gray-200 rounded-lg p-5 space-y-4"
          >
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact & Security
            </h4>

            {/* Mobile Number - OPTIONAL with Tooltip */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mobile Number
                <InfoTooltip text="Optional but recommended for appointment reminders, OTP verification, and emergency contact" />
              </label>
              <InternationalPhoneInput
                value={mobile}
                onChange={setMobile}
              />
            </div>

            {/* Email Address - OPTIONAL with Tooltip */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
                <InfoTooltip text="Email is optional but recommended for account recovery, appointment confirmations, and health updates. You can add it later in settings." />
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
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 mt-1"
                >
                  {fieldErrors.email}
                </motion.p>
              )}
            </div>

            {/* Password */}
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
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 mt-1"
                >
                  {fieldErrors.password}
                </motion.p>
              )}
            </div>

            {/* Confirm Password */}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 mt-1"
                >
                  {fieldErrors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* Consent & Agreements - 4 Required Checkboxes */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">
                Consent & Agreements <span className="text-red-500">*</span>
              </h5>
              
              {/* 1. Terms of Service */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={() => { setConsentModalType("terms"); setConsentModalOpen(true); }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                  >
                    Terms of Service
                  </button>
                </label>
              </div>
              
              {/* 2. Privacy Policy */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="privacy" className="text-sm text-gray-700">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={() => { setConsentModalType("privacy"); setConsentModalOpen(true); }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
              
              {/* 3. HIPAA Notice */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="hipaa"
                  checked={acceptHipaa}
                  onChange={(e) => setAcceptHipaa(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="hipaa" className="text-sm text-gray-700 flex items-center">
                  I consent to{' '}
                  <button
                    type="button"
                    onClick={() => { setConsentModalType("hipaa"); setConsentModalOpen(true); }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline mx-1"
                  >
                    HIPAA Notice of Privacy Practices
                  </button>
                  <InfoTooltip text="Federal law protecting your health information" />
                </label>
              </div>
              
              {/* 4. Health Information Authorization */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="authorization"
                  checked={acceptAuthorization}
                  onChange={(e) => setAcceptAuthorization(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="authorization" className="text-sm text-gray-700 flex items-center">
                  I authorize{' '}
                  <button
                    type="button"
                    onClick={() => { setConsentModalType("authorization"); setConsentModalOpen(true); }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline mx-1"
                  >
                    use of my health information
                  </button>
                  for treatment, payment, and healthcare operations
                  <InfoTooltip text="Standard authorization for medical care coordination and billing as per HIPAA regulations" />
                </label>
              </div>
            </div>
          </motion.div>
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

        {/* Extended Mode Fields - Show all at once for profile completion */}
        {!isMinimalMode && (
          <>
          {/* Personal Information */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information <span className="text-red-500 ml-1">*</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={title} onChange={(e)=>setTitle(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Mr">Mr.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Miss">Miss</option>
                  <option value="Ms">Ms.</option>
                  <option value="Dr">Dr.</option>
                  <option value="Master">Master</option>
                  <option value="Baby">Baby</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="Enter first name" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={middleName} onChange={(e)=>setMiddleName(e.target.value)} placeholder="Optional" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Enter last name" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={dateOfBirth} onChange={(e)=>setDateOfBirth(e.target.value)} required />
                {age && <p className="text-xs text-gray-500 mt-1">Age: {age.years} years, {age.months} months</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={gender} onChange={(e)=>setGender(e.target.value)}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

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
              <InternationalPhoneInput value={mobile} onChange={setMobile} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input type="email" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="your.email@example.com" />
            </div>
          </div>

          {/* Additional Personal Details */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Additional Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={bloodGroup} onChange={(e)=>setBloodGroup(e.target.value)}>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={occupation} onChange={(e)=>setOccupation(e.target.value)} placeholder="Your occupation" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Government ID Type</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={govtIdType} onChange={(e)=>setGovtIdType(e.target.value)}>
                  <option value="">Select ID Type</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Government ID Number</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={govtIdNumber} onChange={(e)=>setGovtIdNumber(e.target.value)} placeholder="ID number" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Marital Status</label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={maritalStatus} onChange={(e)=>setMaritalStatus(e.target.value)}>
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              {maritalStatus === "Married" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Spouse Name</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={spouseName} onChange={(e)=>setSpouseName(e.target.value)} placeholder="Enter spouse name" />
                </div>
              )}
            </div>
          </div>

          {/* Present Address */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Present Address
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={addressLine1} onChange={(e)=>setAddressLine1(e.target.value)} placeholder="House/Flat No., Street" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={addressLine2} onChange={(e)=>setAddressLine2(e.target.value)} placeholder="Area, Landmark" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="City" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={state} onChange={(e)=>setState(e.target.value)} placeholder="State" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={postalCode} onChange={(e)=>setPostalCode(e.target.value)} placeholder="Postal code" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="Country" />
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center text-sm">
                <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Permanent Address
              </h4>
              <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="mr-2 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={sameAsPresentAddress} onChange={(e)=>{
                  setSameAsPresentAddress(e.target.checked);
                  if (e.target.checked) {
                    setPermanentAddressLine1(addressLine1);
                    setPermanentAddressLine2(addressLine2);
                    setPermanentCity(city);
                    setPermanentState(state);
                    setPermanentPostalCode(postalCode);
                    setPermanentCountry(country);
                  }
                }} />
                Same as Present Address
              </label>
            </div>

            {!sameAsPresentAddress && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentAddressLine1} onChange={(e)=>setPermanentAddressLine1(e.target.value)} placeholder="House/Flat No., Street" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 2</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentAddressLine2} onChange={(e)=>setPermanentAddressLine2(e.target.value)} placeholder="Area, Landmark" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentCity} onChange={(e)=>setPermanentCity(e.target.value)} placeholder="City" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentState} onChange={(e)=>setPermanentState(e.target.value)} placeholder="State" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentPostalCode} onChange={(e)=>setPermanentPostalCode(e.target.value)} placeholder="Postal code" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={permanentCountry} onChange={(e)=>setPermanentCountry(e.target.value)} placeholder="Country" />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Emergency Contact
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={emergencyContact} onChange={(e)=>setEmergencyContact(e.target.value)} placeholder="Emergency contact name" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                <InternationalPhoneInput value={emergencyPhone} onChange={setEmergencyPhone} />
              </div>
            </div>
          </div>

          {/* Source of Patient */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              How did you hear about us?
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
              <select className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={sourceOfPatient} onChange={(e)=>setSourceOfPatient(e.target.value)}>
                <option value="">Select Source</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Referral">Referral</option>
                <option value="Doctor">Doctor Referral</option>
                <option value="Insurance">Insurance</option>
                <option value="Online">Online Search</option>
                <option value="Advertisement">Advertisement</option>
              </select>
            </div>

            {sourceOfPatient === "Referral" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Referral Name</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={referralName} onChange={(e)=>setReferralName(e.target.value)} placeholder="Name of person who referred" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Referral Phone</label>
                  <InternationalPhoneInput value={referralPhone} onChange={setReferralPhone} />
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-end gap-3">
          {isMinimalMode && currentStep === 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </motion.button>
          )}
          
          {!isMinimalMode && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip optional fields
            </button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {isMinimalMode && currentStep === 1 ? "Next →" : (isAddingFamilyMember ? "Add Family Member" : "Continue")}
          </motion.button>
        </div>
        
        {/* Back to Sign-In Link - Step 1 Only */}
        {isMinimalMode && currentStep === 1 && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-gray-600 hover:text-emerald-600 transition-colors"
            >
              ← Back to Sign-In
            </button>
          </div>
        )}
      </div>

      {/* Consent Modal */}
      <ConsentModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        type={consentModalType}
      />
    </div>
  );
}
