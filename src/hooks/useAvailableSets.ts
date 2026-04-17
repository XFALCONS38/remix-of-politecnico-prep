import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the dynamic list of set_ids that exist in the database
 * (union of sets used in questions + passages). No hardcoded limit —
 * however many sets the admin has uploaded will appear.
 */
export function useAvailableSets() {
  const [sets, setSets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, pRes] = await Promise.all([
      supabase.from("questions").select("set_id").limit(10000),
      supabase.from("passages").select("set_id").limit(10000),
    ]);
    const all = new Set<string>();
    (qRes.data ?? []).forEach((r: any) => r.set_id && all.add(r.set_id));
    (pRes.data ?? []).forEach((r: any) => r.set_id && all.add(r.set_id));
    setSets(Array.from(all).sort());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { sets, loading, reload: load };
}
