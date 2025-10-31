import { z } from 'zod';

export const LoginSchema = z.object({ 
  email: z.string().email().max(255), 
  password: z.string().min(8).max(128) 
});
export const RegisterSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  school_slug: z.string().min(2).max(50)
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;