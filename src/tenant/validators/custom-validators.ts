import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments
} from 'class-validator';

/**
 * Validates Colombian phone numbers
 */
@ValidatorConstraint({ async: false })
export class IsColombianPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments) {
    if (!phone) return true; // Optional field
    
    // Colombian phone number patterns
    const patterns = [
      /^\+57\s?[0-9]{10}$/, // +57 3001234567 or +57 300 123 4567
      /^57[0-9]{10}$/, // 573001234567
      /^[0-9]{10}$/, // 3001234567
      /^[0-9]{7}$/, // 1234567 (landline)
    ];
    
    return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
  }

  defaultMessage(args: ValidationArguments) {
    return 'Phone number must be a valid Colombian phone number';
  }
}

export function IsColombianPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsColombianPhoneConstraint,
    });
  };
}

/**
 * Validates Colombian NIT (Tax ID)
 */
@ValidatorConstraint({ async: false })
export class IsColombianNITConstraint implements ValidatorConstraintInterface {
  validate(nit: string, args: ValidationArguments) {
    if (!nit) return true; // Optional field
    
    // Remove spaces and hyphens
    const cleanNit = nit.replace(/[\s-]/g, '');
    
    // Colombian NIT pattern: 9-10 digits followed by optional check digit
    const nitPattern = /^[0-9]{9,10}(-?[0-9])?$/;
    
    if (!nitPattern.test(cleanNit)) {
      return false;
    }

    // Validate check digit if present
    if (cleanNit.includes('-') || cleanNit.length === 10) {
      return this.validateNITCheckDigit(cleanNit);
    }

    return true;
  }

  private validateNITCheckDigit(nit: string): boolean {
    const cleanNit = nit.replace('-', '');
    if (cleanNit.length < 9) return false;

    const digits = cleanNit.slice(0, -1);
    const checkDigit = parseInt(cleanNit.slice(-1));
    
    const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    
    const remainder = sum % 11;
    const calculatedCheckDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return calculatedCheckDigit === checkDigit;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Tax ID must be a valid Colombian NIT';
  }
}

export function IsColombianNIT(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsColombianNITConstraint,
    });
  };
}

/**
 * Validates that end date is after start date
 */
@ValidatorConstraint({ async: false })
export class IsAfterConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    if (!endDate) return true; // Optional field
    
    const [relatedPropertyName] = args.constraints;
    const startDate = (args.object as any)[relatedPropertyName];
    
    if (!startDate) return true; // Can't validate if start date is not provided
    
    return new Date(endDate) > new Date(startDate);
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be after ${relatedPropertyName}`;
  }
}

export function IsAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterConstraint,
    });
  };
}

/**
 * Validates GPS coordinates for Colombia
 */
@ValidatorConstraint({ async: false })
export class IsColombianCoordinatesConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) return true; // Optional field
    
    const { latitude, longitude } = this.getCoordinates(value, args);
    
    if (latitude === null || longitude === null) return false;
    
    // Colombia approximate bounds
    const colombiaBounds = {
      north: 13.5,
      south: -4.5,
      east: -66.5,
      west: -81.5
    };
    
    return (
      latitude >= colombiaBounds.south &&
      latitude <= colombiaBounds.north &&
      longitude >= colombiaBounds.west &&
      longitude <= colombiaBounds.east
    );
  }

  private getCoordinates(value: any, args: ValidationArguments): { latitude: number | null, longitude: number | null } {
    if (args.property === 'latitude') {
      const longitude = (args.object as any).longitude;
      return { latitude: value, longitude };
    } else if (args.property === 'longitude') {
      const latitude = (args.object as any).latitude;
      return { latitude, longitude: value };
    }
    
    return { latitude: null, longitude: null };
  }

  defaultMessage(args: ValidationArguments) {
    return 'Coordinates must be within Colombian territory';
  }
}

export function IsColombianCoordinates(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsColombianCoordinatesConstraint,
    });
  };
}

/**
 * Validates business hours format
 */
@ValidatorConstraint({ async: false })
export class IsBusinessHoursConstraint implements ValidatorConstraintInterface {
  validate(businessHours: any, args: ValidationArguments) {
    if (!businessHours) return true; // Optional field
    
    if (typeof businessHours !== 'object') return false;
    
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    for (const [day, hours] of Object.entries(businessHours)) {
      if (!validDays.includes(day.toLowerCase())) return false;
      
      if (hours && typeof hours === 'object') {
        const { open, close, isOpen } = hours as any;
        
        if (isOpen === false) continue; // Closed day is valid
        
        if (!open || !close) return false;
        if (!timePattern.test(open) || !timePattern.test(close)) return false;
        
        // Validate that close time is after open time
        const [openHour, openMin] = open.split(':').map(Number);
        const [closeHour, closeMin] = close.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;
        
        if (closeMinutes <= openMinutes) return false;
      }
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Business hours must be in valid format with proper time ranges';
  }
}

export function IsBusinessHours(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBusinessHoursConstraint,
    });
  };
}

/**
 * Validates that a value is a positive number
 */
@ValidatorConstraint({ async: false })
export class IsPositiveNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) return true; // Optional field
    
    return typeof value === 'number' && value > 0;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a positive number`;
  }
}

export function IsPositiveNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPositiveNumberConstraint,
    });
  };
}

/**
 * Validates SKU format (alphanumeric with hyphens)
 */
@ValidatorConstraint({ async: false })
export class IsSKUFormatConstraint implements ValidatorConstraintInterface {
  validate(sku: string, args: ValidationArguments) {
    if (!sku) return true; // Optional field
    
    // SKU should be alphanumeric with hyphens, 3-20 characters
    const skuPattern = /^[A-Z0-9-]{3,20}$/;
    
    return skuPattern.test(sku.toUpperCase());
  }

  defaultMessage(args: ValidationArguments) {
    return 'SKU must be 3-20 characters long and contain only letters, numbers, and hyphens';
  }
}

export function IsSKUFormat(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSKUFormatConstraint,
    });
  };
}