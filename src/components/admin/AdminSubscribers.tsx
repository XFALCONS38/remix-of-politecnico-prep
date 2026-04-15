import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface Subscriber {
  id: string;
  email: string | null;
  display_name: string | null;
  access_expiry: string | null;
  preferred_lang: string | null;
  created_at: string;
  isActive: boolean;
  subscriptions: Array<{ id: string; status: string; amount_cents: number; access_expiry: string; created_at: string }>;
  attempts: { total: number; completed: number };
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccess, setEditingAccess] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-subscribers", {
      body: { action: "list" },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setSubscribers(data.subscribers ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateAccess = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("admin-subscribers", {
      body: { action: "update_access", user_id: userId, access_expiry: newExpiry || null },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      setEditingAccess(null);
      load();
    }
  };

  const updateSubStatus = async (subId: string, status: string) => {
    const { data, error } = await supabase.functions.invoke("admin-subscribers", {
      body: { action: "update_subscription_status", subscription_id: subId, status },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      load();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Users & Subscribers ({subscribers.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No users found.</p>
        ) : (
          <div className="space-y-3">
            {subscribers.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <span className="font-medium text-sm">{s.email ?? "No email"}</span>
                    {s.display_name && <span className="text-muted-foreground text-xs ml-2">({s.display_name})</span>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{s.preferred_lang ?? "en"}</Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                  <span>Joined: {new Date(s.created_at).toLocaleDateString()}</span>
                  <span>Exams: {s.attempts.total} ({s.attempts.completed} completed)</span>
                  {s.access_expiry && (
                    <span>Access until: {new Date(s.access_expiry).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {editingAccess === s.id ? (
                    <>
                      <Input
                        type="datetime-local"
                        className="w-52 h-8 text-xs"
                        value={newExpiry}
                        onChange={(e) => setNewExpiry(e.target.value)}
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateAccess(s.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingAccess(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                      setEditingAccess(s.id);
                      setNewExpiry(s.access_expiry ? s.access_expiry.slice(0, 16) : "");
                    }}>
                      Edit Access
                    </Button>
                  )}
                </div>

                {s.subscriptions.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-medium mb-1">Subscriptions:</p>
                    {s.subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 text-xs">
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">{sub.status}</Badge>
                        <span>€{(sub.amount_cents / 100).toFixed(2)}</span>
                        <span className="text-muted-foreground">expires {new Date(sub.access_expiry).toLocaleDateString()}</span>
                        {sub.status === "active" && (
                          <Button size="sm" variant="destructive" className="h-6 text-xs ml-auto" onClick={() => updateSubStatus(sub.id, "cancelled")}>
                            Cancel
                          </Button>
                        )}
                        {sub.status === "cancelled" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs ml-auto" onClick={() => updateSubStatus(sub.id, "active")}>
                            Reactivate
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
