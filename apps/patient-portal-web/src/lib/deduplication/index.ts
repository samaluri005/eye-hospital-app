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
