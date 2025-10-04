import { doubleMetaphone as doubleMetaphoneLib } from 'double-metaphone';

export function soundex(name: string | null | undefined): string {
  if (!name) return '';
  
  const s = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  
  const firstLetter = s[0];
  
  const soundexMap: Record<string, string> = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6',
  };
  
  let code = firstLetter;
  let prevCode = soundexMap[firstLetter] || '0';
  
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const char = s[i];
    const charCode = soundexMap[char];
    
    if (charCode && charCode !== prevCode) {
      code += charCode;
      prevCode = charCode;
    } else if (!charCode) {
      prevCode = '0';
    }
  }
  
  return code.padEnd(4, '0');
}

export function metaphone(name: string | null | undefined, maxLength: number = 4): string {
  if (!name) return '';
  
  let s = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  
  s = s.replace(/^KN|^GN|^PN|^AE|^WR/, (match) => match[1]);
  s = s.replace(/^X/, 'S');
  s = s.replace(/WH/, 'W');
  
  let metaphoneCode = '';
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    const nextChar = s[i + 1] || '';
    const prevChar = s[i - 1] || '';
    
    if (i === 0 && /[AEIOU]/.test(char)) {
      metaphoneCode += char;
      continue;
    }
    
    switch (char) {
      case 'B':
        if (i !== s.length - 1 || prevChar !== 'M') {
          metaphoneCode += 'B';
        }
        break;
      case 'C':
        if (prevChar !== 'S' && /[IEY]/.test(nextChar)) {
          metaphoneCode += 'S';
        } else if (nextChar === 'H') {
          metaphoneCode += 'X';
          i++;
        } else {
          metaphoneCode += 'K';
        }
        break;
      case 'D':
        if (/[GE]/.test(nextChar)) {
          metaphoneCode += 'J';
        } else {
          metaphoneCode += 'T';
        }
        break;
      case 'G':
        if (nextChar === 'H' && !/[AEIOU]/.test(s[i + 2] || '')) {
          break;
        } else if (nextChar === 'N' && i === s.length - 2) {
          break;
        } else if (/[IEY]/.test(nextChar)) {
          metaphoneCode += 'J';
        } else {
          metaphoneCode += 'K';
        }
        break;
      case 'H':
        if (!/[AEIOU]/.test(prevChar) || !/[AEIOU]/.test(nextChar)) {
          break;
        }
        metaphoneCode += 'H';
        break;
      case 'K':
        if (prevChar !== 'C') {
          metaphoneCode += 'K';
        }
        break;
      case 'P':
        if (nextChar === 'H') {
          metaphoneCode += 'F';
          i++;
        } else {
          metaphoneCode += 'P';
        }
        break;
      case 'Q':
        metaphoneCode += 'K';
        break;
      case 'S':
        if (nextChar === 'H') {
          metaphoneCode += 'X';
          i++;
        } else if (/[IO]/.test(nextChar) && s[i + 2] === 'N') {
          metaphoneCode += 'X';
        } else {
          metaphoneCode += 'S';
        }
        break;
      case 'T':
        if (nextChar === 'H') {
          metaphoneCode += '0';
          i++;
        } else if (/[IO]/.test(nextChar) && s[i + 2] === 'N') {
          metaphoneCode += 'X';
        } else {
          metaphoneCode += 'T';
        }
        break;
      case 'V':
        metaphoneCode += 'F';
        break;
      case 'W':
      case 'Y':
        if (/[AEIOU]/.test(nextChar)) {
          metaphoneCode += char;
        }
        break;
      case 'X':
        metaphoneCode += 'KS';
        break;
      case 'Z':
        metaphoneCode += 'S';
        break;
      case 'F':
      case 'J':
      case 'L':
      case 'M':
      case 'N':
      case 'R':
        metaphoneCode += char;
        break;
    }
    
    if (metaphoneCode.length >= maxLength) break;
  }
  
  return metaphoneCode.substring(0, maxLength);
}

export function doubleMetaphone(name: string | null | undefined): { primary: string; alternate: string } {
  if (!name) return { primary: '', alternate: '' };
  
  const result = doubleMetaphoneLib(name);
  
  return {
    primary: result[0] || '',
    alternate: result[1] || result[0] || '', // Use primary as fallback
  };
}
