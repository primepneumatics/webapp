import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEngineerSuggestions(): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    supabase.from('service_reports').select('serviced_by').not('serviced_by', 'is', null).then(({ data }) => {
      const set = new Set<string>()
      data?.forEach(r => r.serviced_by && set.add(r.serviced_by))
      setNames([...set].sort())
    })
  }, [])

  return names
}
