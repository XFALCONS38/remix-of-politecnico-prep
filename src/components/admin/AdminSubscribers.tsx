import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Trash2, ShieldCheck, ShieldOff, Gift, Ban, Search } from "lucide-react";

interface Subscriber {
  id: string;
  email: string | null;
  display_name: string | null;
  access_expiry: string | null;
  preferred_lang: string | null;
  created_at: string;
  isActive: boolean;
  roles: string[];
  subscriptions: Array<{ id: string; status: string; amount_cents: number; access_expiry: string; created_at: string }>;
  attempts: { total: number; completed: number };
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingAccess, setEditingAccess] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState("");
  const [grantDays, setGrantDays] = useState("60");
  const [grantingUser, setGrantingUser] = useState<string | null>(null);

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

  const invoke = async (body: any, msg: string) => {
    const { data, error } = await supabase.functions.invoke("admin-subscribers", { body });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: msg });
      load();
    }
  };

  const filtered = subscribers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email?.toLowerCase().includes(q)) || (s.display_name?.toLowerCase().includes(q));
  });

  const activeCount = subscribers.filter(s => s.isActive).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Users & Subscribers ({subscribers.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{activeCount} active · {subscribers.length - activeCount} inactive</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search email or name..."
                className="pl-8 h-9 w-52 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No users found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-3">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <span className="font-medium text-sm">{s.email ?? "No email"}</span>
                    {s.display_name && <span className="text-muted-foreground text-xs ml-2">({s.display_name})</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {s.roles.includes("admin") && <Badge variant="destructive">Admin</Badge>}
                    <Badge variant="outline">{s.preferred_lang ?? "en"}</Badge>
                  </div>
                </div>

                {/* Stats row */}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                  <span>Joined: {new Date(s.created_at).toLocaleDateString()}</span>
                  <span>Exams: {s.attempts.total} ({s.attempts.completed} completed)</span>
                  {s.access_expiry && (
                    <span>Access until: {new Date(s.access_expiry).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Edit access expiry */}
                  {editingAccess === s.id ? (
                    <>
                      <Input
                        type="datetime-local"
                        className="w-52 h-8 text-xs"
                        value={newExpiry}
                        onChange={(e) => setNewExpiry(e.target.value)}
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                        invoke({ action: "update_access", user_id: s.id, access_expiry: newExpiry || null }, "Access updated");
                        setEditingAccess(null);
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingAccess(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                      setEditingAccess(s.id);
                      setNewExpiry(s.access_expiry ? s.access_expiry.slice(0, 16) : "");
                    }}>Edit Access</Button>
                  )}

                  {/* Grant access */}
                  {grantingUser === s.id ? (
                    <>
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs"
                        value={grantDays}
                        onChange={(e) => setGrantDays(e.target.value)}
                        placeholder="Days"
                      />
                      <Button size="sm" className="h-8 text-xs gap-1" onClick={() => {
                        invoke({ action: "grant_access", user_id: s.id, days: Number(grantDays) }, `Granted ${grantDays} days`);
                        setGrantingUser(null);
                      }}>
                        <Gift className="h-3 w-3" /> Grant
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setGrantingUser(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setGrantingUser(s.id)}>
                      <Gift className="h-3 w-3" /> Grant Access
                    </Button>
                  )}

                  {/* Revoke access */}
                  {s.isActive && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "revoke_access", user_id: s.id }, "Access revoked")}>
                      <Ban className="h-3 w-3" /> Revoke
                    </Button>
                  )}

                  {/* Toggle admin */}
                  {!s.roles.includes("admin") ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "toggle_role", user_id: s.id, role: "admin", grant: true }, "Admin granted")}>
                      <ShieldCheck className="h-3 w-3" /> Make Admin
                    </Button>
                  ) : s.email !== "admin@tilprep.com" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "toggle_role", user_id: s.id, role: "admin", grant: false }, "Admin removed")}>
                      <ShieldOff className="h-3 w-3" /> Remove Admin
                    </Button>
                  )}

                  {/* Delete user */}
                  {s.email !== "admin@tilprep.com" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-8 text-xs gap-1 ml-auto">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {s.email} and all their data (attempts, subscriptions, history). This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => invoke({ action: "delete_user", user_id: s.id }, "User deleted")}>
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Subscriptions */}
                {s.subscriptions.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium mb-1">Subscriptions:</p>
                    {s.subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 text-xs mb-1">
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">{sub.status}</Badge>
                        <span>€{(sub.amount_cents / 100).toFixed(2)}</span>
                        <span className="text-muted-foreground">expires {new Date(sub.access_expiry).toLocaleDateString()}</span>
                        {sub.status === "active" && (
                          <Button size="sm" variant="destructive" className="h-6 text-xs ml-auto" onClick={() => invoke({ action: "update_subscription_status", subscription_id: sub.id, status: "cancelled" }, "Cancelled")}>
                            Cancel
                          </Button>
                        )}
                        {sub.status === "cancelled" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs ml-auto" onClick={() => invoke({ action: "update_subscription_status", subscription_id: sub.id, status: "active" }, "Reactivated")}>
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
