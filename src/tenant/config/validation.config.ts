import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Custom validation pipe configuration for tenant module
 */
export const createTenantValidationPipe = () => {
  return new ValidationPipe({
    // Transform incoming data to DTO instances
    transform: true,
    
    // Automatically transform primitive types
    transformOptions: {
      enableImplicitConversion: true,
    },
    
    // Strip properties that don't have decorators
    whitelist: true,
    
    // Throw error if non-whitelisted properties are present
    forbidNonWhitelisted: true,
    
    // Validate nested objects
    validateCustomDecorators: true,
    
    // Custom error message formatting
    exceptionFactory: (errors: ValidationError[]) => {
      const formattedErrors = formatValidationErrors(errors);
      return new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: formattedErrors,
          timestamp: new Date().toISOString(),
        },
      });
    },
  });
};

/**
 * Format validation errors into a structured format
 */
function formatValidationErrors(errors: ValidationError[]): any[] {
  return errors.map(error => ({
    field: error.property,
    value: error.value,
    constraints: error.constraints,
    children: error.children && error.children.length > 0 
      ? formatValidationErrors(error.children)
      : undefined,
  }));
}

/**
 * Validation groups for different scenarios
 */
export const ValidationGroups = {
  CREATE: 'create',
  UPDATE: 'update',
  PARTIAL_UPDATE: 'partial-update',
  ADMIN: 'admin',
  PUBLIC: 'public',
} as const;

/**
 * Common validation messages in Spanish and English
 */
export const ValidationMessages = {
  es: {
    required: 'Este campo es requerido',
    email: 'Debe ser un email válido',
    minLength: 'Debe tener al menos {min} caracteres',
    maxLength: 'No puede tener más de {max} caracteres',
    min: 'Debe ser mayor o igual a {min}',
    max: 'Debe ser menor o igual a {max}',
    isNumber: 'Debe ser un número',
    isBoolean: 'Debe ser verdadero o falso',
    isUUID: 'Debe ser un ID válido',
    isEnum: 'Debe ser uno de los valores permitidos: {values}',
    isArray: 'Debe ser una lista',
    isString: 'Debe ser texto',
    isDate: 'Debe ser una fecha válida',
    matches: 'El formato no es válido',
    phone: 'Debe ser un número de teléfono válido',
    nit: 'Debe ser un NIT válido',
    coordinates: 'Las coordenadas deben estar dentro de Colombia',
    businessHours: 'Los horarios de negocio no son válidos',
    sku: 'El SKU debe tener entre 3-20 caracteres alfanuméricos',
    positiveNumber: 'Debe ser un número positivo',
    afterDate: 'Debe ser posterior a la fecha de inicio',
  },
  en: {
    required: 'This field is required',
    email: 'Must be a valid email',
    minLength: 'Must be at least {min} characters long',
    maxLength: 'Cannot be more than {max} characters long',
    min: 'Must be greater than or equal to {min}',
    max: 'Must be less than or equal to {max}',
    isNumber: 'Must be a number',
    isBoolean: 'Must be true or false',
    isUUID: 'Must be a valid ID',
    isEnum: 'Must be one of the allowed values: {values}',
    isArray: 'Must be an array',
    isString: 'Must be a string',
    isDate: 'Must be a valid date',
    matches: 'Format is not valid',
    phone: 'Must be a valid phone number',
    nit: 'Must be a valid NIT',
    coordinates: 'Coordinates must be within Colombia',
    businessHours: 'Business hours are not valid',
    sku: 'SKU must be 3-20 alphanumeric characters',
    positiveNumber: 'Must be a positive number',
    afterDate: 'Must be after the start date',
  },
};

/**
 * Get validation message in specified language
 */
export function getValidationMessage(
  key: keyof typeof ValidationMessages.en,
  language: 'es' | 'en' = 'es',
  params?: Record<string, any>
): string {
  let message = ValidationMessages[language][key] || ValidationMessages.en[key];
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      message = message.replace(`{${param}}`, value);
    });
  }
  
  return message;
}

/**
 * Validation options for different entity types
 */
export const EntityValidationOptions = {
  customer: {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: [ValidationGroups.CREATE, ValidationGroups.UPDATE],
  },
  product: {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: [ValidationGroups.CREATE, ValidationGroups.UPDATE],
  },
  order: {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: [ValidationGroups.CREATE, ValidationGroups.UPDATE],
  },
  task: {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: [ValidationGroups.CREATE, ValidationGroups.UPDATE],
  },
};

/**
 * Common regex patterns
 */
export const ValidationPatterns = {
  phone: /^[\+]?[0-9\s\-\(\)]+$/,
  colombianPhone: /^(\+57|57)?[\s]?[0-9]{7,10}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  nit: /^[0-9]{8,10}(-?[0-9])?$/,
  sku: /^[A-Z0-9-]{3,20}$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  coordinates: {
    latitude: /^-?([1-8]?[0-9](\.[0-9]+)?|90(\.0+)?)$/,
    longitude: /^-?((1[0-7]|[0-9])?[0-9](\.[0-9]+)?|180(\.0+)?)$/,
  },
};

/**
 * Validation constraints for Colombian context
 */
export const ColombianConstraints = {
  coordinates: {
    latitude: { min: -4.5, max: 13.5 },
    longitude: { min: -81.5, max: -66.5 },
  },
  currency: 'COP',
  country: 'CO',
  timezone: 'America/Bogota',
  taxRate: {
    default: 19.0,
    min: 0,
    max: 50,
  },
};