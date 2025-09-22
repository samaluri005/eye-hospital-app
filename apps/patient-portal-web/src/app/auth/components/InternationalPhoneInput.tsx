"use client";
import React, { useState, useRef, useEffect } from "react";
import { AsYouType, parsePhoneNumber, isValidPhoneNumber, getCountries, getCountryCallingCode } from "libphonenumber-js";
import ReactCountryFlag from "react-country-flag";

interface Country {
  code: string;
  name: string;
  dialCode: string;
}

const countries: Country[] = [
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  isValid?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export default function InternationalPhoneInput({ 
  value, 
  onChange, 
  onEnter, 
  isValid, 
  onValidityChange 
}: Props) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default to India
  const [displayValue, setDisplayValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update display value when input value changes
  useEffect(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed) {
          const asYouType = new AsYouType(parsed.country);
          asYouType.input(parsed.nationalNumber);
          setDisplayValue(asYouType.getNumber()?.formatNational() || value);
          
          // Update selected country based on parsed phone number
          const countryForPhone = countries.find(c => c.code === parsed.country);
          if (countryForPhone) {
            setSelectedCountry(countryForPhone);
          }
        }
      } catch {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue("");
    }
  }, [value]);

  // Check validity when display value changes
  useEffect(() => {
    if (displayValue && selectedCountry) {
      const fullNumber = selectedCountry.dialCode + displayValue.replace(/\D/g, "");
      const valid = isValidPhoneNumber(fullNumber);
      onValidityChange?.(valid);
    } else {
      onValidityChange?.(false);
    }
  }, [displayValue, selectedCountry, onValidityChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePhoneInput = (inputValue: string) => {
    // Remove all non-digit characters for processing
    const digits = inputValue.replace(/\D/g, "");
    
    if (digits.length === 0) {
      setDisplayValue("");
      onChange("");
      return;
    }

    try {
      // Format as user types using the selected country
      const asYouType = new AsYouType(selectedCountry.code as any);
      const formatted = asYouType.input(digits);
      setDisplayValue(formatted);

      // Generate E.164 format for backend
      const fullNumber = selectedCountry.dialCode + digits;
      try {
        const parsed = parsePhoneNumber(fullNumber);
        if (parsed) {
          onChange(parsed.format("E.164"));
        } else {
          onChange(fullNumber);
        }
      } catch {
        onChange(fullNumber);
      }
    } catch {
      setDisplayValue(inputValue);
      onChange(selectedCountry.dialCode + digits);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearchTerm("");
    
    // Reformat current number with new country
    if (displayValue) {
      const digits = displayValue.replace(/\D/g, "");
      const asYouType = new AsYouType(country.code as any);
      const formatted = asYouType.input(digits);
      setDisplayValue(formatted);
      
      const fullNumber = country.dialCode + digits;
      try {
        const parsed = parsePhoneNumber(fullNumber);
        if (parsed) {
          onChange(parsed.format("E.164"));
        } else {
          onChange(fullNumber);
        }
      } catch {
        onChange(fullNumber);
      }
    }
    
    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  const handleDropdownKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDropdownOpen(!dropdownOpen);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="relative">
      <div className="flex items-stretch">
        {/* Country Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onKeyDown={handleDropdownKeyPress}
            className="relative inline-flex items-center justify-center gap-2 px-3 h-12 bg-white border-2 border-r-0 border-blue-200 rounded-l-xl hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200 w-[112px]"
            aria-label={`Selected country: ${selectedCountry.name} ${selectedCountry.dialCode}`}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center justify-center w-5 h-4 flex-shrink-0">
              <ReactCountryFlag
                countryCode={selectedCountry.code}
                svg
                style={{
                  width: '20px',
                  height: '14px',
                }}
                aria-label={selectedCountry.name}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 leading-none">{selectedCountry.dialCode}</span>
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute z-50 w-80 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
              </div>
              
              {/* Country List */}
              <div className="max-h-40 overflow-y-auto" role="listbox">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center space-x-3 ${
                      selectedCountry.code === country.code ? 'bg-blue-100' : ''
                    }`}
                    role="option"
                    aria-selected={selectedCountry.code === country.code}
                  >
                    <div className="flex items-center justify-center w-5 h-4 flex-shrink-0">
                      <ReactCountryFlag
                        countryCode={country.code}
                        svg
                        style={{
                          width: '20px',
                          height: '14px',
                        }}
                        aria-label={country.name}
                      />
                    </div>
                    <span className="flex-1 text-sm leading-none">{country.name}</span>
                    <span className="text-sm text-gray-500 leading-none">{country.dialCode}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          value={displayValue}
          onChange={(e) => handlePhoneInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter phone number"
          className="flex-1 px-4 h-12 border-2 border-l-0 border-blue-200 rounded-r-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-200 text-gray-900 placeholder-gray-500"
          autoComplete="tel"
          aria-label="Phone number"
          aria-describedby="phone-help"
        />
      </div>
      
      {/* Helper Text */}
      <p id="phone-help" className="text-xs text-gray-500 mt-1">
        Enter your phone number in your country's format
      </p>
    </div>
  );
}