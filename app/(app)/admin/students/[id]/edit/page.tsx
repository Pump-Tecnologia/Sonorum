import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { EditStudentForm } from '@/components/admin/EditStudentForm'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar aluno' }

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('users')
    .select('id, name, email, phone, parent_contact, instrument_category, instrument, status, notify_to, notify_email, permanent_notes')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle()

  if (!student) notFound()

  return (
    <>
      <PageHeader title="Editar aluno" subtitle={student.name} />
      <EditStudentForm student={student} />
    </>
  )
}
