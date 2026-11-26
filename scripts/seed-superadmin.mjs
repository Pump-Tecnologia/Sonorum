// Seed de um usuário superadmin (role='superadmin', school_id=null).
// Uso: node scripts/seed-superadmin.mjs <email> <senha>
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Uso: node scripts/seed-superadmin.mjs <email> <senha>')
  console.error('A senha é obrigatória — não existe senha padrão.')
  process.exit(1)
}
if (password.length < 12) {
  console.error('❌ Senha muito curta: use ao menos 12 caracteres.')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: 'Super Admin' },
  app_metadata: { role: 'superadmin', school_id: null },
})
if (error) {
  console.error('❌ createUser:', error.message)
  process.exit(1)
}

const { error: e2 } = await admin
  .from('users')
  .update({ role: 'superadmin', school_id: null, name: 'Super Admin' })
  .eq('id', data.user.id)
if (e2) {
  console.error('❌ update profile:', e2.message)
  process.exit(1)
}

console.log('✓ Superadmin criado')
console.log('  id   :', data.user.id)
console.log('  email:', email)
