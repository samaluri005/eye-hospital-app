"use client";
import React, { useState } from "react";

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
  patientType?: string;
  guardianName?: string;
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

export default function ProfileStep({ onNext, onSkip, isAddingFamilyMember = false, mode = "extended" }: Props) {
  const isMinimalMode = mode === "minimal";
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSuffix, setNameSuffix] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [patientType, setPatientType] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [relationship, setRelationship] = useState("");
  
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  
  const [bloodGroup, setBloodGroup] = useState("");
  const [sourceOfPatient, setSourceOfPatient] = useState("");
  const [referralName, setReferralName] = useState("");
  const [referralPhone, setReferralPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [permanentAddressLine1, setPermanentAddressLine1] = useState("");
  const [permanentAddressLine2, setPermanentAddressLine2] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentState, setPermanentState] = useState("");
  const [permanentPostalCode, setPermanentPostalCode] = useState("");
  const [permanentCountry, setPermanentCountry] = useState("India");
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      nameSuffix: nameSuffix.trim() || undefined,
      dateOfBirth,
      gender: gender || undefined,
      mobile: mobile.trim() || undefined,
      email: email.trim() || undefined,
      patientType: patientType || undefined,
      guardianName: isMinor ? guardianName.trim() || undefined : undefined,
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
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {isAddingFamilyMember 
            ? "Add Family Member" 
            : isMinimalMode 
              ? "Create Your Profile" 
              : "Complete Your Profile"
          }
        </h3>
        <p className="text-gray-600">
          {isAddingFamilyMember 
            ? "Please provide information for the family member you're adding"
            : isMinimalMode
              ? "Let's get started with your basic information"
              : "Help us serve you better with additional details (optional)"
          }
        </p>
      </div>

      {/* HIPAA Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 className="text-blue-800 font-semibold mb-1">HIPAA-Protected Information</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              All information is encrypted and stored securely in compliance with HIPAA regulations. Your data will only be used for healthcare services.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-red-800 font-medium">Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Personal Information Section */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal Information *
          </h4>
          
          {/* Title Dropdown */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={firstName} 
                onChange={(e)=>setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>

            {!isMinimalMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={middleName} 
                  onChange={(e)=>setMiddleName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={lastName} 
                onChange={(e)=>setLastName(e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>

            {!isMinimalMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name Suffix
                </label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
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

          {/* Mobile Number - Minimal Mode */}
          {isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
                <span className="text-gray-500 text-xs ml-1">(Recommended for appointment reminders)</span>
              </label>
              <input 
                type="tel"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={mobile} 
                onChange={(e)=>setMobile(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input 
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={dateOfBirth} 
                onChange={(e)=>setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              {age && (
                <p className="text-sm text-emerald-600 mt-1">
                  Age: {age.years} years, {age.months} months, {age.days} days
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender {isMinimalMode && <span className="text-red-500">*</span>}
              </label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
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

          {/* Guardian Name - Only for minors in minimal mode */}
          {isMinimalMode && isMinor && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-amber-900 mb-2">
                Guardian Name <span className="text-red-500">*</span>
                <span className="text-xs text-amber-700 block mt-1">Required for patients under 18 years</span>
              </label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" 
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Type
              </label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={patientType} 
                onChange={(e)=>setPatientType(e.target.value)}
              >
                <option value="">Select Patient Type</option>
                <option value="General">General</option>
                <option value="Insurer">Insurer</option>
                <option value="Camp">Camp</option>
                <option value="Arogya Badratha">Arogya Badratha</option>
                <option value="Arogyasree">Arogyasree</option>
                <option value="CGHS">CGHS (Central Government Health Scheme)</option>
                <option value="ECHS">ECHS (Ex-Servicemen Contributory Health Scheme)</option>
                <option value="Railway">Railway</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {/* Family Relationship Field */}
          {isAddingFamilyMember && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship to Primary Account Holder <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={relationship} 
                onChange={(e)=>setRelationship(e.target.value)}
                required
              >
                <option value="">Select Relationship</option>
                {FAMILY_RELATIONSHIPS.map((rel) => (
                  <option key={rel.value} value={rel.value}>
                    {rel.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This helps us manage linked family accounts sharing the same phone number
              </p>
            </div>
          )}

          {/* Email Field (optional for regular users, shown for family members) */}
          {!isMinimalMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email {isAddingFamilyMember && "(Optional for notifications)"}
              </label>
              <input 
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          )}
        </div>

        {/* Optional Information Toggle */}
        {!isMinimalMode && (
          <>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">
                {showOptional ? 'Hide' : 'Show'} Optional Information
              </span>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${showOptional ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Optional Fields */}
            {showOptional && (
          <div className="space-y-6">
            {/* Address Section */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address (Optional)
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={addressLine1} 
                  onChange={(e)=>setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. Box"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={addressLine2} 
                  onChange={(e)=>setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, unit, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={city} 
                    onChange={(e)=>setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={state} 
                    onChange={(e)=>setState(e.target.value)}
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={postalCode} 
                    onChange={(e)=>setPostalCode(e.target.value)}
                    placeholder="PIN/ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={country} 
                    onChange={(e)=>setCountry(e.target.value)}
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical & Personal Information Section */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Medical & Personal Details (Optional)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={bloodGroup} 
                    onChange={(e)=>setBloodGroup(e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={occupation} 
                    onChange={(e)=>setOccupation(e.target.value)}
                    placeholder="e.g., Teacher, Engineer, Retired"
                  />
                </div>
              </div>

              {/* Marital Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                    value={maritalStatus} 
                    onChange={(e)=>setMaritalStatus(e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* Spouse Name - Conditional */}
                {maritalStatus === "Married" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Spouse Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                      value={spouseName} 
                      onChange={(e)=>setSpouseName(e.target.value)}
                      placeholder="Full name of spouse"
                    />
                  </div>
                )}
              </div>

              {/* Source of Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source of Patient</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={sourceOfPatient} 
                  onChange={(e)=>setSourceOfPatient(e.target.value)}
                >
                  <option value="">Select Source</option>
                  <option value="General">General Walk-in</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>

              {/* Referral Details - Conditional */}
              {sourceOfPatient === "Referral" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h5 className="font-medium text-blue-900">Referral Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Referral Name</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        value={referralName} 
                        onChange={(e)=>setReferralName(e.target.value)}
                        placeholder="Name of referring doctor/person"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Referral Phone</label>
                      <input 
                        type="tel"
                        className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        value={referralPhone} 
                        onChange={(e)=>setReferralPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Permanent Address Section */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Permanent Address (Optional)
                </h4>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsPresentAddress}
                    onChange={(e) => {
                      setSameAsPresentAddress(e.target.checked);
                      if (e.target.checked) {
                        setPermanentAddressLine1(addressLine1);
                        setPermanentAddressLine2(addressLine2);
                        setPermanentCity(city);
                        setPermanentState(state);
                        setPermanentPostalCode(postalCode);
                        setPermanentCountry(country);
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Same as Present</span>
                </label>
              </div>

              {!sameAsPresentAddress && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                      value={permanentAddressLine1} 
                      onChange={(e)=>setPermanentAddressLine1(e.target.value)}
                      placeholder="Street address, P.O. Box"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                      value={permanentAddressLine2} 
                      onChange={(e)=>setPermanentAddressLine2(e.target.value)}
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        value={permanentCity} 
                        onChange={(e)=>setPermanentCity(e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        value={permanentState} 
                        onChange={(e)=>setPermanentState(e.target.value)}
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        value={permanentPostalCode} 
                        onChange={(e)=>setPermanentPostalCode(e.target.value)}
                        placeholder="PIN/ZIP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <select 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        value={permanentCountry} 
                        onChange={(e)=>setPermanentCountry(e.target.value)}
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Emergency Contact Section */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Emergency Contact (Optional)
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={emergencyContact} 
                  onChange={(e)=>setEmergencyContact(e.target.value)}
                  placeholder="Full name of emergency contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                <input 
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                  value={emergencyPhone} 
                  onChange={(e)=>setEmergencyPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          type="button"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2"
          onClick={handleSubmit}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{isMinimalMode ? "Continue" : "Save Profile"}</span>
        </button>
        
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

      <p className="text-xs text-gray-500 text-center">
        * Required fields for identity verification and CDC de-duplication compliance
      </p>
    </div>
  );
}
