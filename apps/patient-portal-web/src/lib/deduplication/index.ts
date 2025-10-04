export {
  standardizeName,
  standardizePhone,
  standardizeAddress,
  generateBlockingKey,
  standardizePatientData,
  type StandardizedPatient,
} from './standardization';

export {
  soundex,
  metaphone,
  doubleMetaphone,
} from './soundex';

export {
  levenshteinDistance,
  levenshteinSimilarity,
  jaroSimilarity,
  jaroWinklerSimilarity,
  calculateSimilarityScore,
} from './editDistance';

export {
  calculateNameSimilarity,
  calculatePhoneticSimilarity,
  calculatePhoneSimilarity,
  calculateDOBSimilarity,
  calculateAddressSimilarity,
  calculateTotalMatchScore,
  rankDuplicateCandidates,
  shouldBlockRegistration,
  shouldShowDuplicateWarning,
  categorizeMatches,
  generateCandidatesFromBlockingKey,
  DEFAULT_MATCH_WEIGHTS,
  MATCH_THRESHOLDS,
  type DuplicateCandidateScore,
  type MatchWeights,
  type PatientData as MatchingPatientData,
} from './matching';

export {
  generateBlockingKeys,
  generateAllBlockingKeys,
  selectOptimalBlockingStrategy,
  type BlockingStrategy,
  type BlockingKeyPair,
  type PatientData as BlockingPatientData,
} from './blocking';
