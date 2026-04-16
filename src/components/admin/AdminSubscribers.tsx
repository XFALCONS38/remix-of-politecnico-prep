import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Trash2, ShieldCheck, ShieldOff, Gift, Ban, Search, CalendarIcon, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tier {
  id: string;
  name: string;
  duration_days: number;
  price_cents: number;
}

interface Subscriber {
  id: string;
  email: string | null;
  display_name: string | null;
  access_expiry: string | null;
  preferred_lang: string | null;
  created_at: string;
  isActive: boolean;
  roles: string[];
  subscriptions: Array<{ id: string; status: string; amount_cents: number; access_expiry: string; created_at: string; tier?: string | null }>;
  attempts: { total: number; completed: number };
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Subscriber | null>(null);
  const [editTier, setEditTier] = useState<string>("");
  const [editStart, setEditStart] = useState<Date | undefined>(undefined);
  const [editEnd, setEditEnd] = useState<Date | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    const [subsRes, tiersRes] = await Promise.all([
      supabase.functions.invoke("admin-subscribers", { body: { action: "list" } }),
      (supabase as any).from("subscription_tiers").select("*").eq("is_active", true).order("display_order"),
    ]);
    if (subsRes.error || subsRes.data?.error) {
      toast({ title: "Error", description: subsRes.data?.error || subsRes.error?.message, variant: "destructive" });
    } else {
      setSubscribers(subsRes.data.subscribers ?? []);
    }
    if (tiersRes.data) setTiers(tiersRes.data);
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

  const grantTier = (userId: string, tierName: string) => {
    const tier = tiers.find(t => t.name === tierName);
    if (!tier) return;
    invoke({ action: "grant_tier", user_id: userId, tier: tier.name, days: tier.duration_days, amount_cents: tier.price_cents }, `Granted ${tier.name}`);
  };

  const openCustomGrant = (s: Subscriber) => {
    setEditingUser(s);
    setEditTier(tiers[0]?.name ?? "");
    setEditStart(new Date());
    setEditEnd(s.access_expiry ? new Date(s.access_expiry) : new Date(Date.now() + 60 * 86400000));
  };

  const submitCustomGrant = async () => {
    if (!editingUser || !editStart || !editEnd) return;
    await invoke({
      action: "custom_grant",
      user_id: editingUser.id,
      tier: editTier || null,
      access_start: editStart.toISOString(),
      access_expiry: editEnd.toISOString(),
    }, "Custom access granted");
    setEditingUser(null);
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
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <span className="font-medium text-sm">{s.email ?? "No email"}</span>
                    {s.display_name && <span className="text-muted-foreground text-xs ml-2">({s.display_name})</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    {s.roles.includes("admin") && <Badge variant="destructive">Admin</Badge>}
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

                {/* Quick grant by Tier */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Grant tier:</span>
                  <Select onValueChange={(tierName) => grantTier(s.id, tierName)}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Select tier..." /></SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name} — {t.duration_days}d · €{(t.price_cents / 100).toFixed(0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openCustomGrant(s)}>
                    <Settings2 className="h-3 w-3" /> Custom Grant
                  </Button>

                  {s.isActive && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "revoke_access", user_id: s.id }, "Access revoked")}>
                      <Ban className="h-3 w-3" /> Revoke
                    </Button>
                  )}

                  {!s.roles.includes("admin") ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "toggle_role", user_id: s.id, role: "admin", grant: true }, "Admin granted")}>
                      <ShieldCheck className="h-3 w-3" /> Make Admin
                    </Button>
                  ) : s.email !== "admin@tilprep.com" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => invoke({ action: "toggle_role", user_id: s.id, role: "admin", grant: false }, "Admin removed")}>
                      <ShieldOff className="h-3 w-3" /> Remove Admin
                    </Button>
                  )}

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
                            This will permanently delete {s.email} and all their data. This cannot be undone.
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

                {s.subscriptions.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium mb-1">Subscriptions:</p>
                    {s.subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">{sub.status}</Badge>
                        {sub.tier && <Badge variant="outline" className="text-xs">{sub.tier}</Badge>}
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

      {/* Custom Grant Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Access Grant — {editingUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Tier (optional)</label>
              <Select value={editTier} onValueChange={setEditTier}>
                <SelectTrigger><SelectValue placeholder="Select tier..." /></SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editStart ? format(editStart, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editStart} onSelect={setEditStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editEnd ? format(editEnd, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editEnd} onSelect={setEditEnd} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={submitCustomGrant}>Grant Access</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
