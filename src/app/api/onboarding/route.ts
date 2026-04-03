import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  try {
    const [storesRes, docsRes, convosRes, summariesRes, riskRes, profileRes] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }).eq('tenant_id', uid),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('tenant_id', uid),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', uid),
      supabase.from('lease_summaries').select('id', { count: 'exact', head: true }).eq('tenant_id', uid),
      supabase.from('lease_risk_scores').select('id', { count: 'exact', head: true }).eq('tenant_id', uid),
      supabase.from('tenant_profiles').select('onboarding_completed').eq('id', uid).maybeSingle(),
    ])

    const steps = {
      add_location: (storesRes.count ?? 0) > 0,
      upload_document: (docsRes.count ?? 0) > 0,
      ask_question: (convosRes.count ?? 0) > 0,
      review_summary: (summariesRes.count ?? 0) > 0,
      check_risk: (riskRes.count ?? 0) > 0,
    }

    const completed = Object.values(steps).filter(Boolean).length
    const total = Object.keys(steps).length

    return NextResponse.json({
      steps,
      completed,
      total,
      all_done: completed === total,
      onboarding_completed: (profileRes.data as Record<string, unknown>)?.onboarding_completed === true,
    })
  } catch {
    // If tables don't exist yet, return all-false
    return NextResponse.json({
      steps: {
        add_location: false,
        upload_document: false,
        ask_question: false,
        review_summary: false,
        check_risk: false,
      },
      completed: 0,
      total: 5,
      all_done: false,
      onboarding_completed: false,
    })
  }
}
