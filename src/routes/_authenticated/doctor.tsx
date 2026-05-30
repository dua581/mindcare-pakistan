import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar, Plus, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({ meta: [{ title: "Counselor Dashboard — MindCare" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["my-patients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*, profile:profiles!patients_patient_id_fkey(*)").eq("doctor_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Add patient by user_id (admin can supply IDs; for demo, accept the patient's profile id)
  const addPatient = useMutation({
    mutationFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("id").eq("id", addEmail.trim()).maybeSingle();
      if (!prof) throw new Error("Patient not found. Use their User ID (UUID).");
      const { error } = await supabase.from("patients").insert({ doctor_id: user!.id, patient_id: prof.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Patient added"); setAddEmail(""); qc.invalidateQueries({ queryKey: ["my-patients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const upcoming = patients.filter((p) => p.next_appointment && new Date(p.next_appointment) > new Date());

  return (
    <AppShell title="Counselor Dashboard">
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 bg-gradient-card border-0 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">My patients</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-hero text-white border-0"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a patient</DialogTitle></DialogHeader>
                <Label>Patient User ID</Label>
                <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="UUID" />
                <p className="text-xs text-muted-foreground">Patients can share their User ID from their profile.</p>
                <Button onClick={() => addPatient.mutate()} className="bg-gradient-hero text-white border-0">Add patient</Button>
              </DialogContent>
            </Dialog>
          </div>
          {patients.length === 0
            ? <p className="text-sm text-muted-foreground py-8 text-center">No patients yet. Click "Add" to link one.</p>
            : (
              <div className="space-y-2">
                {patients.map((p: any) => (
                  <button key={p.id} onClick={() => setSelectedPatient(p.patient_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedPatient === p.patient_id ? "border-primary bg-accent" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.profile?.full_name ?? "Patient"}</p>
                        <p className="text-xs text-muted-foreground">Last session: {p.last_session_at ? new Date(p.last_session_at).toLocaleDateString() : "—"}</p>
                      </div>
                      {p.profile?.flagged && <Badge variant="destructive">At risk</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
        </Card>

        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Upcoming appointments</h3>
          {upcoming.length === 0
            ? <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            : upcoming.map((p: any) => (
              <div key={p.id} className="p-3 rounded-lg bg-muted mb-2 text-sm">
                <p className="font-medium">{p.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.next_appointment).toLocaleString()}</p>
              </div>
            ))}
        </Card>

        {selectedPatient && <PatientDetail patientId={selectedPatient} doctorId={user!.id} />}
      </div>
    </AppShell>
  );
}

function PatientDetail({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const { data: moods = [] } = useQuery({
    queryKey: ["patient-moods", patientId],
    queryFn: async () => (await supabase.from("mood_logs").select("*").eq("user_id", patientId).order("created_at").limit(30)).data ?? [],
  });
  const { data: chats = [] } = useQuery({
    queryKey: ["patient-chats", patientId],
    queryFn: async () => (await supabase.from("chat_history").select("*").eq("user_id", patientId).order("created_at", { ascending: false }).limit(6)).data ?? [],
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: async () => (await supabase.from("session_notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: false })).data ?? [],
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("session_notes").insert({ doctor_id: doctorId, patient_id: patientId, note });
      if (error) throw error;
      await supabase.from("patients").update({ last_session_at: new Date().toISOString() }).eq("doctor_id", doctorId).eq("patient_id", patientId);
    },
    onSuccess: () => { toast.success("Note added"); setNote(""); qc.invalidateQueries({ queryKey: ["patient-notes"] }); qc.invalidateQueries({ queryKey: ["my-patients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const chartData = moods.map((m) => ({ day: new Date(m.created_at).toLocaleDateString("en", { month: "short", day: "numeric" }), mood: m.mood }));

  return (
    <Card className="lg:col-span-3 p-5 bg-gradient-card border-0 shadow-soft">
      <h3 className="font-semibold mb-4">Patient details</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Mood history</h4>
          <div className="h-56">
            {chartData.length === 0
              ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No mood data yet.</div>
              : (
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={10} />
                    <YAxis domain={[0, 10]} stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="mood" stroke="var(--color-primary)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent AI chat</h4>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {chats.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
            {chats.slice().reverse().map((c) => (
              <div key={c.id} className={`text-xs p-2 rounded ${c.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                <span className="font-semibold capitalize">{c.role}: </span>{c.content.slice(0, 200)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Add session note</h4>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes from today's session…" />
          <Button className="mt-2 bg-gradient-hero text-white border-0" onClick={() => addNote.mutate()} disabled={!note || addNote.isPending}>Save note</Button>
          <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {notes.map((n) => (
              <div key={n.id} className="p-2 rounded bg-muted text-xs">
                <p className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                <p>{n.note}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Quick message</h4>
          <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Send a short check-in message…" />
          <Button className="mt-2" variant="outline" onClick={() => { toast.success("Message queued (demo)"); setMsg(""); }}>Send</Button>
        </div>
      </div>
    </Card>
  );
}
