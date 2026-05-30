import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Activity, TrendingDown, AlertTriangle, Megaphone, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — MindCare" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: moods = [] } = useQuery({
    queryKey: ["all-moods"],
    queryFn: async () => (await supabase.from("mood_logs").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  // Per-user averages
  const avgByUser = new Map<string, { sum: number; n: number; last: string }>();
  moods.forEach((m) => {
    const cur = avgByUser.get(m.user_id) ?? { sum: 0, n: 0, last: m.created_at };
    cur.sum += m.mood; cur.n += 1;
    if (m.created_at > cur.last) cur.last = m.created_at;
    avgByUser.set(m.user_id, cur);
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const activeToday = new Set(moods.filter((m) => new Date(m.created_at) >= today).map((m) => m.user_id)).size;
  const allAvg = moods.length ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length) : 0;
  const flaggedCount = Array.from(avgByUser.values()).filter((v) => v.sum / v.n < 4).length;

  // Distribution chart (mood 1..10)
  const dist = Array.from({ length: 10 }, (_, i) => ({ mood: i + 1, count: moods.filter((m) => m.mood === i + 1).length }));

  // Usage last 30 days
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const count = moods.filter((m) => { const t = new Date(m.created_at); return t >= d && t < next; }).length;
    return { day: d.toLocaleDateString("en", { month: "short", day: "numeric" }), usage: count };
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, flagged }: { id: string; flagged: boolean }) => {
      const { error } = await supabase.from("profiles").update({ flagged }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-profiles"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const postAnn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ author_id: user!.id, title: annTitle, body: annBody });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posted"); setAnnTitle(""); setAnnBody(""); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = [
    { label: "Total Users", value: profiles.length, icon: Users, color: "from-primary to-secondary" },
    { label: "Active Today", value: activeToday, icon: Activity, color: "from-secondary to-primary" },
    { label: "Avg Mood Score", value: allAvg.toFixed(1), icon: TrendingDown, color: "from-primary to-secondary" },
    { label: "Flagged Users", value: flaggedCount, icon: AlertTriangle, color: "from-destructive to-warning" },
  ];

  return (
    <AppShell title="Admin Dashboard">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 bg-gradient-card border-0 shadow-soft">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3">Mood distribution</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mood" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3">Platform usage (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={days30}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={10} interval={4} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="usage" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 bg-gradient-card border-0 shadow-soft mb-6">
        <h3 className="font-semibold mb-3">Users</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Last active</TableHead><TableHead>Avg mood</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const stats = avgByUser.get(p.id);
                const avg = stats ? stats.sum / stats.n : null;
                const last = stats ? new Date(stats.last).toLocaleDateString() : "—";
                const atRisk = avg !== null && avg < 4;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">{last}</TableCell>
                    <TableCell>{avg !== null ? avg.toFixed(1) : "—"}</TableCell>
                    <TableCell>
                      {p.flagged || atRisk
                        ? <Badge variant="destructive">At risk</Badge>
                        : <Badge variant="secondary">Normal</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => toggleFlag.mutate({ id: p.id, flagged: !p.flagged })}>
                        {p.flagged ? "Unflag" : "Flag"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {profiles.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No users yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</h3>
          <div className="space-y-2">
            <Input placeholder="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
            <Textarea placeholder="Body" value={annBody} onChange={(e) => setAnnBody(e.target.value)} rows={3} />
            <Button onClick={() => postAnn.mutate()} disabled={!annTitle || !annBody || postAnn.isPending} className="bg-gradient-hero text-white border-0">Post</Button>
          </div>
          <div className="mt-4 space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-semibold">{a.title}</p>
                <p className="text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Database className="h-4 w-4" /> Data source</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Insights are informed by the <strong>Kaggle Mental Health in Tech Survey</strong> dataset,
            a publicly available study on mental health attitudes in workplace populations.
          </p>
          <Button variant="outline" asChild>
            <a href="https://www.kaggle.com/datasets/osmi/mental-health-in-tech-survey" target="_blank" rel="noreferrer">View on Kaggle →</a>
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
