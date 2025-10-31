import type { Request, Response, NextFunction } from 'express';

// POPIA compliance middleware
export function popiaCompliance(req: Request, res: Response, next: NextFunction) {
  // Add POPIA headers
  res.setHeader('X-Data-Protection', 'POPIA-Compliant');
  res.setHeader('X-Privacy-Policy', '/privacy-policy');
  
  next();
}

// Mask sensitive data in responses
export function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object') {
    const masked = { ...data };
    
    // Mask ID numbers
    if (masked.id_number) {
      masked.id_number = masked.id_number.replace(/(\d{6})\d{6}(\d)/, '$1******$2');
    }
    
    // Mask bank details
    if (masked.account_number) {
      masked.account_number = masked.account_number.replace(/\d(?=\d{4})/g, '*');
    }
    
    // Mask phone numbers
    if (masked.phone) {
      masked.phone = masked.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    }
    
    // Mask email partially
    if (masked.email && !masked.is_current_user) {
      const [local, domain] = masked.email.split('@');
      masked.email = `${local.slice(0, 2)}***@${domain}`;
    }
    
    return masked;
  }
  
  return data;
}

// Data subject request types
export enum DataSubjectRequestType {
  ACCESS = 'access',
  CORRECTION = 'correction',
  DELETION = 'deletion',
  OBJECTION = 'objection',
  PORTABILITY = 'portability'
}

// Lawful basis for processing
export enum LawfulBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract', 
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}