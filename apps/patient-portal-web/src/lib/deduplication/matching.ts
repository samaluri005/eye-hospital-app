import {
  standardizeName,
  standardizePhone,
  generateBlockingKey,
} from './standardization';
import { soundex, doubleMetaphone } from './soundex';
import {
  levenshteinSimilarity,
  jaroWinklerSimilarity,
  calculateSimilarityScore,
} from './editDistance';

export type PatientData = {
  patientId?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
};

export type DuplicateCandidateScore = {
  candidatePatientId: string;
  totalScore: number;
  nameScore: number;
  phoneScore: number;
  dobScore: number;
  addressScore: number;
  phoneticScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  matchType: 'exact' | 'likely' | 'possible' | 'unlikely';
};

export type MatchWeights = {
  name: number;
  phone: number;
  dob: number;
  address: number;
  phonetic: number;
};

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  name: 0.3,
  phone: 0.25,
  dob: 0.25,
  address: 0.1,
  phonetic: 0.1,
};

export const MATCH_THRESHOLDS = {
  EXACT_MATCH: 95,
  LIKELY_DUPLICATE: 90,
  POSSIBLE_DUPLICATE: 70,
  UNLIKELY_DUPLICATE: 50,
} as const;

export function calculateNameSimilarity(
  firstName1: string | null | undefined,
  lastName1: string | null | undefined,
  firstName2: string | null | undefined,
  lastName2: string | null | undefined
): number {
  const stdFirst1 = standardizeName(firstName1);
  const stdLast1 = standardizeName(lastName1);
  const stdFirst2 = standardizeName(firstName2);
  const stdLast2 = standardizeName(lastName2);
  
  const fullName1 = `${stdFirst1} ${stdLast1}`.trim();
  const fullName2 = `${stdFirst2} ${stdLast2}`.trim();
  
  if (!fullName1 || !fullName2) return 0;
  if (fullName1 === fullName2) return 100;
  
  let firstNameScore = 0;
  if (stdFirst1 && stdFirst2) {
    const jaroWinkler = jaroWinklerSimilarity(stdFirst1, stdFirst2) * 100;
    const levenshtein = levenshteinSimilarity(stdFirst1, stdFirst2);
    firstNameScore = jaroWinkler * 0.6 + levenshtein * 0.4;
  }
  
  let lastNameScore = 0;
  if (stdLast1 && stdLast2) {
    const jaroWinkler = jaroWinklerSimilarity(stdLast1, stdLast2) * 100;
    const levenshtein = levenshteinSimilarity(stdLast1, stdLast2);
    lastNameScore = jaroWinkler * 0.6 + levenshtein * 0.4;
  }
  
  if (stdFirst1 && stdFirst2 && stdLast1 && stdLast2) {
    return (firstNameScore * 0.4 + lastNameScore * 0.6);
  } else if (stdLast1 && stdLast2) {
    return lastNameScore;
  } else if (stdFirst1 && stdFirst2) {
    return firstNameScore;
  }
  
  return 0;
}

export function calculatePhoneticSimilarity(
  firstName1: string | null | undefined,
  lastName1: string | null | undefined,
  firstName2: string | null | undefined,
  lastName2: string | null | undefined
): number {
  let firstScore = 0;
  let lastScore = 0;
  
  if (firstName1 && firstName2) {
    const soundex1 = soundex(firstName1);
    const soundex2 = soundex(firstName2);
    const dm1 = doubleMetaphone(firstName1);
    const dm2 = doubleMetaphone(firstName2);
    
    if (soundex1 === soundex2) firstScore += 40;
    if (dm1.primary === dm2.primary) firstScore += 30;
    if (dm1.alternate === dm2.alternate) firstScore += 15;
    if (dm1.primary === dm2.alternate || dm1.alternate === dm2.primary) firstScore += 15;
    firstScore = Math.min(firstScore, 100);
  }
  
  if (lastName1 && lastName2) {
    const soundex1 = soundex(lastName1);
    const soundex2 = soundex(lastName2);
    const dm1 = doubleMetaphone(lastName1);
    const dm2 = doubleMetaphone(lastName2);
    
    if (soundex1 === soundex2) lastScore += 40;
    if (dm1.primary === dm2.primary) lastScore += 30;
    if (dm1.alternate === dm2.alternate) lastScore += 15;
    if (dm1.primary === dm2.alternate || dm1.alternate === dm2.primary) lastScore += 15;
    lastScore = Math.min(lastScore, 100);
  }
  
  if (firstName1 && firstName2 && lastName1 && lastName2) {
    return (firstScore * 0.4 + lastScore * 0.6);
  } else if (lastName1 && lastName2) {
    return lastScore;
  } else if (firstName1 && firstName2) {
    return firstScore;
  }
  
  return 0;
}

export function calculatePhoneSimilarity(
  phone1: string | null | undefined,
  phone2: string | null | undefined
): number {
  if (!phone1 || !phone2) return 0;
  
  const std1 = standardizePhone(phone1);
  const std2 = standardizePhone(phone2);
  
  if (!std1 || !std2) return 0;
  
  if (std1 === std2) return 100;
  
  const lastNDigits = (phone: string, n: number) => {
    return phone.replace(/\D/g, '').slice(-n);
  };
  
  if (lastNDigits(std1, 10) === lastNDigits(std2, 10)) {
    return 95;
  }
  
  if (lastNDigits(std1, 8) === lastNDigits(std2, 8)) {
    return 80;
  }
  
  return levenshteinSimilarity(std1, std2) * 0.6;
}

export function calculateDOBSimilarity(
  dob1: string | Date | null | undefined,
  dob2: string | Date | null | undefined
): number {
  if (!dob1 || !dob2) return 0;
  
  const date1 = typeof dob1 === 'string' ? new Date(dob1) : dob1;
  const date2 = typeof dob2 === 'string' ? new Date(dob2) : dob2;
  
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    return 0;
  }
  
  const isoDate1 = date1.toISOString().split('T')[0];
  const isoDate2 = date2.toISOString().split('T')[0];
  
  if (isoDate1 === isoDate2) {
    return 100;
  }
  
  const year1 = date1.getFullYear();
  const month1 = date1.getMonth();
  const day1 = date1.getDate();
  
  const year2 = date2.getFullYear();
  const month2 = date2.getMonth();
  const day2 = date2.getDate();
  
  if (year1 === year2 && month1 === month2 && Math.abs(day1 - day2) <= 2) {
    return 85;
  }
  
  if (year1 === year2 && month1 === month2) {
    return 60;
  }
  
  if (year1 === year2) {
    return 40;
  }
  
  return 0;
}

export function calculateAddressSimilarity(
  address1: string | null | undefined,
  address2: string | null | undefined
): number {
  if (!address1 || !address2) return 0;
  
  const jaroWinkler = jaroWinklerSimilarity(address1, address2) * 100;
  const levenshtein = levenshteinSimilarity(address1, address2);
  
  return (jaroWinkler * 0.5 + levenshtein * 0.5);
}

export function calculateTotalMatchScore(
  patient1: PatientData,
  patient2: PatientData,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): DuplicateCandidateScore {
  const nameScore = calculateNameSimilarity(
    patient1.firstName,
    patient1.lastName,
    patient2.firstName,
    patient2.lastName
  );
  
  const phoneScore = calculatePhoneSimilarity(patient1.phone, patient2.phone);
  
  const dobScore = calculateDOBSimilarity(
    patient1.dateOfBirth,
    patient2.dateOfBirth
  );
  
  const addressScore = calculateAddressSimilarity(
    patient1.address,
    patient2.address
  );
  
  const phoneticScore = calculatePhoneticSimilarity(
    patient1.firstName,
    patient1.lastName,
    patient2.firstName,
    patient2.lastName
  );
  
  const totalScore =
    nameScore * weights.name +
    phoneScore * weights.phone +
    dobScore * weights.dob +
    addressScore * weights.address +
    phoneticScore * weights.phonetic;
  
  let matchType: DuplicateCandidateScore['matchType'] = 'unlikely';
  let confidenceLevel: DuplicateCandidateScore['confidenceLevel'] = 'low';
  
  if (totalScore >= MATCH_THRESHOLDS.EXACT_MATCH) {
    matchType = 'exact';
    confidenceLevel = 'high';
  } else if (totalScore >= MATCH_THRESHOLDS.LIKELY_DUPLICATE) {
    matchType = 'likely';
    confidenceLevel = 'high';
  } else if (totalScore >= MATCH_THRESHOLDS.POSSIBLE_DUPLICATE) {
    matchType = 'possible';
    confidenceLevel = 'medium';
  }
  
  return {
    candidatePatientId: patient2.patientId || '',
    totalScore: Math.round(totalScore * 100) / 100,
    nameScore: Math.round(nameScore * 100) / 100,
    phoneScore: Math.round(phoneScore * 100) / 100,
    dobScore: Math.round(dobScore * 100) / 100,
    addressScore: Math.round(addressScore * 100) / 100,
    phoneticScore: Math.round(phoneticScore * 100) / 100,
    confidenceLevel,
    matchType,
  };
}

export function generateCandidatesFromBlockingKey(
  blockingKey: string,
  excludePatientId?: string
): {
  blockingKey: string;
  excludePatientId?: string;
} {
  return {
    blockingKey,
    excludePatientId,
  };
}

export function rankDuplicateCandidates(
  candidates: DuplicateCandidateScore[]
): DuplicateCandidateScore[] {
  return candidates
    .filter((c) => c.totalScore >= MATCH_THRESHOLDS.POSSIBLE_DUPLICATE)
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function shouldBlockRegistration(
  candidates: DuplicateCandidateScore[]
): boolean {
  return candidates.some((c) => c.totalScore >= MATCH_THRESHOLDS.EXACT_MATCH);
}

export function shouldShowDuplicateWarning(
  candidates: DuplicateCandidateScore[]
): boolean {
  return candidates.some(
    (c) => c.totalScore >= MATCH_THRESHOLDS.LIKELY_DUPLICATE
  );
}

export function categorizeMatches(candidates: DuplicateCandidateScore[]): {
  exactMatches: DuplicateCandidateScore[];
  likelyDuplicates: DuplicateCandidateScore[];
  possibleDuplicates: DuplicateCandidateScore[];
} {
  const exactMatches: DuplicateCandidateScore[] = [];
  const likelyDuplicates: DuplicateCandidateScore[] = [];
  const possibleDuplicates: DuplicateCandidateScore[] = [];
  
  for (const candidate of candidates) {
    if (candidate.totalScore >= MATCH_THRESHOLDS.EXACT_MATCH) {
      exactMatches.push(candidate);
    } else if (candidate.totalScore >= MATCH_THRESHOLDS.LIKELY_DUPLICATE) {
      likelyDuplicates.push(candidate);
    } else if (candidate.totalScore >= MATCH_THRESHOLDS.POSSIBLE_DUPLICATE) {
      possibleDuplicates.push(candidate);
    }
  }
  
  return {
    exactMatches: exactMatches.sort((a, b) => b.totalScore - a.totalScore),
    likelyDuplicates: likelyDuplicates.sort((a, b) => b.totalScore - a.totalScore),
    possibleDuplicates: possibleDuplicates.sort((a, b) => b.totalScore - a.totalScore),
  };
}
