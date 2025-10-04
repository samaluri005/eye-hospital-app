import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

export interface StandardizedPatient {
  firstNameStandardized: string;
  lastNameStandardized: string;
  fullNameStandardized: string;
  phoneStandardized: string;
  addressStandardized: string;
  blockingKey: string;
}

export function standardizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function standardizePhone(phone: string | null | undefined, defaultCountry: CountryCode = 'IN'): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
  } catch (error) {
    console.warn('Phone parsing failed:', phone, error);
  }
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10 && defaultCountry === 'IN') {
    return `+91${digitsOnly}`;
  }
  
  return digitsOnly ? `+${digitsOnly}` : '';
}

const addressAbbreviations: Record<string, string> = {
  'st': 'street',
  'st.': 'street',
  'ave': 'avenue',
  'ave.': 'avenue',
  'rd': 'road',
  'rd.': 'road',
  'blvd': 'boulevard',
  'blvd.': 'boulevard',
  'ln': 'lane',
  'ln.': 'lane',
  'dr': 'drive',
  'dr.': 'drive',
  'ct': 'court',
  'ct.': 'court',
  'apt': 'apartment',
  'apt.': 'apartment',
  '#': 'number',
  'n': 'north',
  'n.': 'north',
  's': 'south',
  's.': 'south',
  'e': 'east',
  'e.': 'east',
  'w': 'west',
  'w.': 'west',
};

export function standardizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  let standardized = address.trim().toLowerCase();
  
  const words = standardized.split(/\s+/);
  const expandedWords = words.map(word => {
    const cleaned = word.replace(/[.,;]/g, '');
    return addressAbbreviations[cleaned] || word;
  });
  
  standardized = expandedWords.join(' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  
  return standardized;
}

export function generateBlockingKey(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  dob: Date | string | null | undefined
): string {
  const lastNameStd = standardizeName(lastName);
  const firstNameStd = standardizeName(firstName);
  
  if (!lastNameStd && !firstNameStd) return '';
  
  const lastNamePart = lastNameStd.substring(0, 5).padEnd(5, '_');
  const firstNamePart = firstNameStd.charAt(0) || '_';
  
  let dobPart = '';
  if (dob) {
    const date = typeof dob === 'string' ? new Date(dob) : dob;
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dobPart = `${year}-${month}-${day}`;
    }
  }
  
  if (!dobPart) return '';
  
  return `${lastNamePart}_${firstNamePart}_${dobPart}`;
}

export function standardizePatientData(data: {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  phone?: string | null;
  address?: string | null;
  dob?: Date | string | null;
}): StandardizedPatient {
  const firstNameStd = standardizeName(data.firstName);
  const lastNameStd = standardizeName(data.lastName);
  const middleNameStd = standardizeName(data.middleName);
  
  const fullNameParts = [firstNameStd, middleNameStd, lastNameStd].filter(Boolean);
  const fullNameStandardized = fullNameParts.join(' ');
  
  const phoneStandardized = standardizePhone(data.phone);
  const addressStandardized = standardizeAddress(data.address);
  const blockingKey = generateBlockingKey(data.firstName, data.lastName, data.dob);
  
  return {
    firstNameStandardized: firstNameStd,
    lastNameStandardized: lastNameStd,
    fullNameStandardized,
    phoneStandardized,
    addressStandardized,
    blockingKey,
  };
}
