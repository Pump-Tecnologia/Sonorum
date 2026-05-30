import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

export const registerSchema = z
  .object({
    schoolName: z.string().min(2, 'Informe o nome da escola').max(255),
    name: z.string().min(2, 'Informe seu nome').max(255),
    email: z.string().email('E-mail inválido').max(255),
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'As senhas não conferem',
    path: ['passwordConfirmation'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'As senhas não conferem',
    path: ['passwordConfirmation'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

// Estado de retorno padrão dos Server Actions de formulário.
export type ActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}
