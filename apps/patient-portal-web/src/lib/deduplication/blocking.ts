import { generateBlockingKey } from './standardization';

export type PatientData = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
};

export type BlockingStrategy = 'standard' | 'phonetic' | 'loose';

export function generateBlockingKeys(
  patient: PatientData,
  strategy: BlockingStrategy = 'standard'
): string[] {
  const keys: string[] = [];
  
  const standardKey = generateBlockingKey(
    patient.firstName,
    patient.lastName,
    patient.dateOfBirth
  );
  if (standardKey) {
    keys.push(standardKey);
  }
  
  if (strategy === 'phonetic' || strategy === 'loose') {
    if (patient.lastName && patient.firstName && patient.dateOfBirth) {
      const last4 = patient.lastName.substring(0, 4);
      const first2 = patient.firstName.substring(0, 2);
      const dob = typeof patient.dateOfBirth === 'string'
        ? patient.dateOfBirth
        : patient.dateOfBirth?.toISOString().split('T')[0];
      
      if (dob) {
        keys.push(`${last4}${first2}${dob}`.toUpperCase());
      }
    }
  }
  
  if (strategy === 'loose') {
    if (patient.lastName && patient.dateOfBirth) {
      const last6 = patient.lastName.substring(0, 6);
      const dob = typeof patient.dateOfBirth === 'string'
        ? patient.dateOfBirth
        : patient.dateOfBirth?.toISOString().split('T')[0];
      
      if (dob) {
        keys.push(`${last6}${dob}`.toUpperCase());
      }
    }
    
    if (patient.phone && patient.dateOfBirth) {
      const phoneDigits = patient.phone.replace(/\D/g, '').slice(-10);
      const dob = typeof patient.dateOfBirth === 'string'
        ? patient.dateOfBirth
        : patient.dateOfBirth?.toISOString().split('T')[0];
      
      if (dob && phoneDigits.length >= 10) {
        keys.push(`PHONE${phoneDigits}${dob}`);
      }
    }
  }
  
  return [...new Set(keys)];
}

export type BlockingKeyPair = {
  key: string;
  strategy: BlockingStrategy;
};

export function generateAllBlockingKeys(
  patient: PatientData
): BlockingKeyPair[] {
  const pairs: BlockingKeyPair[] = [];
  
  const standardKeys = generateBlockingKeys(patient, 'standard');
  standardKeys.forEach(key => pairs.push({ key, strategy: 'standard' }));
  
  const phoneticKeys = generateBlockingKeys(patient, 'phonetic');
  phoneticKeys.forEach(key => {
    if (!standardKeys.includes(key)) {
      pairs.push({ key, strategy: 'phonetic' });
    }
  });
  
  const looseKeys = generateBlockingKeys(patient, 'loose');
  looseKeys.forEach(key => {
    if (!standardKeys.includes(key) && !phoneticKeys.includes(key)) {
      pairs.push({ key, strategy: 'loose' });
    }
  });
  
  return pairs;
}

export function selectOptimalBlockingStrategy(
  dataCompleteness: {
    hasLastName: boolean;
    hasFirstName: boolean;
    hasDOB: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
  }
): BlockingStrategy {
  const { hasLastName, hasFirstName, hasDOB } = dataCompleteness;
  
  if (hasLastName && hasFirstName && hasDOB) {
    return 'standard';
  }
  
  if ((hasLastName || hasFirstName) && hasDOB) {
    return 'phonetic';
  }
  
  return 'loose';
}
