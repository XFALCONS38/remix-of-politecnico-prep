import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the list of set_ids available to the current context.
 *  - scope "user" (default): only sets the user's active tier owns
 *    (with bonus flag). Falls back to free tier, then to all sets.
 *  - scope "all": every set in the database. Used by admin pages.
 */
export type SetEntry = { set_id: string; is_bonus: boolean };

export function useAvailableSets(opts: { scope?: "all" | "user" } = {}) {
  const scope = opts.scope ?? "user";
  const { user } = useAuth();
  const [sets, setSets] = useState<string[]>([]);
  const [entries, setEntries] = useState<SetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (scope === "user" && user) {
      const { data, error } = await supabase.rpc("get_user_allowed_sets" as any, { _user_id: user.id });
      if (!error && Array.isArray(data)) {
        const rows = (data as any[]).filter((r) => r?.set_id);
        setEntries(rows.map((r) => ({ set_id: r.set_id, is_bonus: !!r.is_bonus })));
        setSets(rows.map((r) => r.set_id));
      }
    } else {
      const { data, error } = await supabase.rpc("get_available_sets" as any);
      if (!error && Array.isArray(data)) {
        const ids = (data as any[]).map((r) => r.set_id).filter(Boolean);
        setSets(ids);
        setEntries(ids.map((id) => ({ set_id: id, is_bonus: false })));
      }
    }
    setLoading(false);
  }, [scope, user?.id]);

  useEffect(() => { load(); }, [load]);

  return { sets, entries, loading, reload: load };
}
