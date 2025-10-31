import { z } from 'zod';

export const LoginSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(8) 
});
export const RegisterSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  school_slug: z.string().min(2)
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;