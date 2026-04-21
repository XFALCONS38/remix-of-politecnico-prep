import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/SiteHeader";
import { toast } from "@/hooks/use-toast";
import {
  User as UserIcon, Mail, Lock, Eye, EyeOff, Pencil, Download,
  CheckCircle2, Sparkles, ArrowRight, Receipt, LifeBuoy, FileText,
} from "lucide-react";

interface Subscription {
  id: string; created_at: string; tier: string | null; amount_cents: number;
  currency: string; status: string; access_expiry: string;
}
interface Tier {
  id: string; slug: string | null; name: string;
  price_cents: number; duration_days: number; features: any;
  display_order: number; is_active: boolean;
}

export default function Settings() {
  const { user, profile } = useAuth();
  const { lang } = useTheme();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [email] = useState(profile?.email ?? "");
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState("");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(profile?.display_name ?? ""); }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, t] = await Promise.all([
        (supabase as any).from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        (supabase as any).from("subscription_tiers").select("*").eq("is_active", true).order("display_order"),
      ]);
      setSubs(s.data ?? []);
      setTiers(t.data ?? []);
    })();
  }, [user]);

  const activeSub = subs.find((s) => s.status === "active" && new Date(s.access_expiry) > new Date());
  const currentTier = tiers.find((t) => activeSub && (t.slug === activeSub.tier || t.name === activeSub.tier))
    || tiers.find((t) => t.slug === "free");

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await (supabase as any).from("profiles").update({ display_name: name }).eq("id", user.id);
      if (pwd.length >= 6) await supabase.auth.updateUser({ password: pwd });
      toast({ title: lang === "it" ? "Salvato" : "Saved" });
      setPwd("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const fmtMoney = (c: number, cur: string) => `${cur.toUpperCase()} ${(c / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader showDashboard={false} />
      <main className="container max-w-6xl px-4 py-8">
        <div className="mb-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{lang === "it" ? "ACCOUNT" : "ACCOUNT"}</span>
          <h1 className="font-display text-3xl font-bold">{lang === "it" ? "Impostazioni" : "Account Settings"}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Personal Identity */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 font-display text-lg font-bold">{lang === "it" ? "Identità Personale" : "Personal Identity"}</h2>
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                      {(name || email || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-card shadow-sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Field icon={UserIcon} label={lang === "it" ? "Nome Completo" : "Full Name"}>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field icon={Mail} label="Email">
                      <Input value={email} disabled />
                    </Field>
                    <Field icon={Lock} label={lang === "it" ? "Nuova Password" : "New Password"} className="sm:col-span-2">
                      <div className="relative">
                        <Input type={showPwd ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={save} disabled={saving}>{lang === "it" ? "Salva Modifiche" : "Save Changes"}</Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing Ledger */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">{lang === "it" ? "Registro Pagamenti" : "Billing Ledger"}</h2>
                  <Link to="#" className="text-xs font-semibold text-primary">{lang === "it" ? "Archivio" : "View Archive"} →</Link>
                </div>
                {subs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{lang === "it" ? "Nessuna transazione." : "No transactions yet."}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-2">{lang === "it" ? "Data" : "Date"}</th>
                          <th className="py-2">{lang === "it" ? "Piano" : "Plan"}</th>
                          <th className="py-2">{lang === "it" ? "Importo" : "Amount"}</th>
                          <th className="py-2">{lang === "it" ? "Stato" : "Status"}</th>
                          <th className="py-2 text-right">{lang === "it" ? "Fattura" : "Invoice"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="py-3">{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className="py-3 font-medium">{s.tier ?? "—"}</td>
                            <td className="py-3 tabular-nums">{fmtMoney(s.amount_cents, s.currency)}</td>
                            <td className="py-3">
                              <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                            </td>
                            <td className="py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Current plan */}
            <div className="rounded-2xl bg-foreground p-5 text-background">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest opacity-70">
                <Sparkles className="h-3 w-3" /> {lang === "it" ? "PIANO ATTUALE" : "CURRENT PLAN"}
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold">{currentTier?.name ?? "Free"}</h3>
              <p className="mt-1 text-xs opacity-70">
                {activeSub
                  ? `${lang === "it" ? "Scade" : "Expires"} ${new Date(activeSub.access_expiry).toLocaleDateString()}`
                  : lang === "it" ? "Nessun abbonamento attivo." : "No active subscription."}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {(Array.isArray((currentTier?.features as any)?.bullets)
                  ? (currentTier!.features as any).bullets.slice(0, 3)
                  : [
                      lang === "it" ? "Simulazioni complete" : "Full-length simulations",
                      lang === "it" ? "Soluzioni dettagliate" : "Detailed solutions",
                      lang === "it" ? "Analisi performance" : "Performance analytics",
                    ]
                ).map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {f}</li>
                ))}
              </ul>
            </div>

            {/* Annual upsell */}
            <div className="rounded-2xl border-2 border-warning/30 bg-warning/5 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-warning">{lang === "it" ? "OFFERTA" : "OFFER"}</div>
              <h3 className="mt-2 font-display text-lg font-bold">{lang === "it" ? "Risparmia il 15% con il piano annuale" : "Save 15% with annual billing"}</h3>
              <Link to="/pricing"><Button className="mt-3 w-full gap-2">{lang === "it" ? "Aggiorna Ora" : "Upgrade Now"} <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>

            {/* Tier Architecture */}
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-4 font-display text-lg font-bold">{lang === "it" ? "Architettura Piani" : "Tier Architecture"}</h3>
                <div className="space-y-2">
                  {tiers.map((t) => {
                    const isCurrent = currentTier?.id === t.id;
                    return (
                      <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isCurrent ? "border-l-4 border-l-success" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{t.name}</span>
                            {isCurrent && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">{lang === "it" ? "ATTUALE" : "CURRENT"}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">€{(t.price_cents / 100).toFixed(0)} · {t.duration_days}d</div>
                        </div>
                        {!isCurrent && (
                          <Link to="/pricing">
                            <Button variant="outline" size="sm">
                              {(t.price_cents > (currentTier?.price_cents ?? 0)) ? (lang === "it" ? "Aggiorna" : "Switch") : (lang === "it" ? "Cambia" : "Change")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-10 rounded-2xl border bg-card p-5 text-center">
          <h4 className="font-semibold">{lang === "it" ? "Serve Assistenza Tecnica?" : "Need Technical Assistance?"}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "it" ? "Il nostro team risponde entro 24h." : "Our team responds within 24h."}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> {lang === "it" ? "Documentazione" : "Documentation"}</Button>
            <Button className="gap-2"><LifeBuoy className="h-4 w-4" /> {lang === "it" ? "Contatta il Supporto" : "Contact Support"}</Button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, children, className }: { icon: any; label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      {children}
    </label>
  );
}