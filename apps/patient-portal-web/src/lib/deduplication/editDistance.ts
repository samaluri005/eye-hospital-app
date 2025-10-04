export function levenshteinDistance(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return b?.length || 0;
  if (!b) return a?.length || 0;
  
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();
  
  const m = str1.length;
  const n = str2.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

export function levenshteinSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity * 100) / 100;
}

export function jaroSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();
  
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j]) continue;
      if (str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return ((matches / len1) + (matches / len2) + ((matches - transpositions / 2) / matches)) / 3.0;
}

export function jaroWinklerSimilarity(a: string | null | undefined, b: string | null | undefined, prefixScale: number = 0.1): number {
  const jaroSim = jaroSimilarity(a, b);
  
  if (jaroSim < 0.7) return jaroSim;
  
  if (!a || !b) return jaroSim;
  
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();
  
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));
  
  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      prefix++;
    } else {
      break;
    }
  }
  
  return jaroSim + (prefix * prefixScale * (1.0 - jaroSim));
}

export function calculateSimilarityScore(
  str1: string | null | undefined,
  str2: string | null | undefined,
  algorithm: 'levenshtein' | 'jaro' | 'jaro-winkler' = 'jaro-winkler'
): number {
  switch (algorithm) {
    case 'levenshtein':
      return levenshteinSimilarity(str1, str2);
    case 'jaro':
      return jaroSimilarity(str1, str2) * 100;
    case 'jaro-winkler':
      return jaroWinklerSimilarity(str1, str2) * 100;
    default:
      return 0;
  }
}
