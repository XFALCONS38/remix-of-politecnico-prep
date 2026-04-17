import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the dynamic list of set_ids available in the database.
 * Uses a SECURITY DEFINER RPC so it works for both admins and regular
 * users (who can't read the questions table directly). Whatever sets
 * the admin uploads will appear automatically — no hardcoded limit.
 */
export function useAvailableSets() {
  const [sets, setSets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_available_sets" as any);
    if (!error && Array.isArray(data)) {
      setSets((data as any[]).map((r) => r.set_id).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { sets, loading, reload: load };
}
