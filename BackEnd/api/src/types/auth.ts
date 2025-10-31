import { z } from 'zod';

try {
  export const LoginSchema = z.object({ 
    email: z.string().email('Invalid email format'), 
    password: z.string().min(8, 'Password must be at least 8 characters') 
  });
  export const RegisterSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    school_slug: z.string().min(2, 'School slug must be at least 2 characters')
  });
} catch (error) {
  console.error('Schema definition error:', error);
  throw new Error('Failed to initialize auth schemas');
}

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;