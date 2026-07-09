import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEngineerSuggestions(): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('assigned_engineer').not('assigned_engineer', 'is', null),
      supabase.from('service_reports').select('serviced_by').not('serviced_by', 'is', null),
    ]).then(([{ data: svc }, { data: reports }]) => {
      const set = new Set<string>()
      svc?.forEach(s => s.assigned_engineer && set.add(s.assigned_engineer))
      reports?.forEach(r => r.serviced_by && set.add(r.serviced_by))
      setNames([...set].sort())
    })
  }, [])

  return names
}
