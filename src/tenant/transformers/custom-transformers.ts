import { Transform } from 'class-transformer';

/**
 * Transform string to uppercase
 */
export function ToUpperCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  });
}

/**
 * Transform string to lowercase
 */
export function ToLowerCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  });
}

/**
 * Transform string to title case
 */
export function ToTitleCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }
    return value;
  });
}

/**
 * Trim whitespace from string
 */
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Format phone number to Colombian standard
 */
export function FormatColombianPhone() {
  return Transform(({ value }) => {
    if (!value || typeof value !== 'string') return value;
    
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.length === 10) {
      // Mobile: 3001234567 -> +57 300 123 4567
      if (cleaned.startsWith('3')) {
        return `+57 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
      }
      // Landline: 6012345678 -> +57 601 234 5678
      return `+57 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }
    
    if (cleaned.length === 7) {
      // Local landline: 1234567 -> 123 4567
      return `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('57')) {
      // Already with country code: 573001234567 -> +57 300 123 4567
      const withoutCountry = cleaned.substring(2);
      return `+57 ${withoutCountry.substring(0, 3)} ${withoutCountry.substring(3, 6)} ${withoutCountry.substring(6)}`;
    }
    
    return value; // Return original if can't format
  });
}

/**
 * Format NIT to standard format
 */
export function FormatColombianNIT() {
  return Transform(({ value }) => {
    if (!value || typeof value !== 'string') return value;
    
    // Remove all non-numeric characters except hyphens
    const cleaned = value.replace(/[^\d-]/g, '');
    
    // If it already has a hyphen, return as is
    if (cleaned.includes('-')) {
      return cleaned;
    }
    
    // If it's 10 digits, add hyphen before last digit
    if (cleaned.length === 10) {
      return `${cleaned.substring(0, 9)}-${cleaned.substring(9)}`;
    }
    
    return cleaned;
  });
}

/**
 * Format currency to Colombian pesos
 */
export function FormatCurrency() {
  return Transform(({ value }) => {
    if (typeof value === 'number') {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    }
    return value;
  });
}

/**
 * Parse string to number
 */
export function ParseNumber() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return value;
  });
}

/**
 * Parse string to integer
 */
export function ParseInt() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return value;
  });
}

/**
 * Parse string to boolean
 */
export function ParseBoolean() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  });
}

/**
 * Format coordinates to proper precision
 */
export function FormatCoordinates() {
  return Transform(({ value }) => {
    if (typeof value === 'number') {
      return Math.round(value * 100000000) / 100000000; // 8 decimal places
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100000000) / 100000000;
    }
    return value;
  });
}

/**
 * Clean and format SKU
 */
export function FormatSKU() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }
    return value;
  });
}

/**
 * Format tags array (remove duplicates, trim, lowercase)
 */
export function FormatTags() {
  return Transform(({ value }) => {
    if (Array.isArray(value)) {
      const formatted = value
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase())
        .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
      
      return formatted;
    }
    return value;
  });
}

/**
 * Format time string to HH:MM format
 */
export function FormatTime() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove any non-numeric characters except colon
      const cleaned = value.replace(/[^\d:]/g, '');
      
      // If it's just numbers, assume HHMM format
      if (/^\d{3,4}$/.test(cleaned)) {
        const hours = cleaned.length === 3 ? cleaned.substring(0, 1) : cleaned.substring(0, 2);
        const minutes = cleaned.length === 3 ? cleaned.substring(1) : cleaned.substring(2);
        return `${hours.padStart(2, '0')}:${minutes}`;
      }
      
      // If it already has colon, validate format
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        const [hours, minutes] = cleaned.split(':');
        const h = parseInt(hours, 10);
        const m = parseInt(minutes, 10);
        
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          return `${h.toString().padStart(2, '0')}:${minutes}`;
        }
      }
    }
    return value;
  });
}

/**
 * Sanitize HTML content (basic)
 */
export function SanitizeHTML() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Basic HTML sanitization - remove script tags and dangerous attributes
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
    }
    return value;
  });
}

/**
 * Format address to proper case
 */
export function FormatAddress() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\b\w+/g, (word) => {
          // Don't capitalize certain words unless they're at the beginning
          const lowerWords = ['de', 'del', 'la', 'el', 'y', 'con', 'en', 'a'];
          const lower = word.toLowerCase();
          
          if (lowerWords.includes(lower)) {
            return lower;
          }
          
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
    }
    return value;
  });
}