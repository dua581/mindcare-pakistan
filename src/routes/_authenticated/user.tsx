import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendChatMessage } from "@/lib/ai-chat.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { Phone, Sparkles, Send, Heart } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/user")({
  head: () => ({ meta: [{ title: "Your Dashboard — MindCare" }] }),
  component: UserDashboard,
});

const EMOJIS = ["😢","😟","😕","😐","🙂","😊","😄","😁","🤩","🥳"];
const TIPS = [
  "Take 5 deep breaths — 4s in, 7s hold, 8s out.",
  "Write down 3 things you're grateful for today.",
  "Step outside for 10 minutes of sunlight.",
  "Drink a glass of water — hydration affects mood.",
  "Stretch your shoulders and neck for 2 minutes.",
  "Text a friend you haven't spoken to in a while.",
];

function UserDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Mood history
  const { data: moods = [] } = useQuery({
    queryKey: ["moods", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("mood_logs").select("*").eq("user_id", user!.id).gte("created_at", since).order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Mood logging
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState("");
  const logMood = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mood_logs").insert({ user_id: user!.id, mood, emoji: EMOJIS[mood - 1], note });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mood logged 💙");
      setNote("");
      qc.invalidateQueries({ queryKey: ["moods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Profile update
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [uni, setUni] = useState("");
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setAge(profile.age?.toString() ?? "");
      setUni(profile.university ?? "");
    }
  }, [profile]);
  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({
        id: user!.id, full_name: name, age: age ? parseInt(age) : null, university: uni,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // AI Chat
  const chat = useServerFn(sendChatMessage);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Assalam-o-alaikum! 💙 Aaj aap kaisa feel kar rahe hain? Main yahan hoon aapki baat sunne ke liye." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const newMsgs = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(newMsgs);
    setInput("");
    setSending(true);
    try {
      const res = await chat({ data: { messages: newMsgs } });
      setMessages([...newMsgs, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setSending(false);
    }
  };

  const chartData = moods.map((m) => ({
    day: new Date(m.created_at).toLocaleDateString("en", { weekday: "short" }),
    mood: m.mood,
  }));

  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <AppShell title={`Hello, ${profile?.full_name ?? "friend"} 💙`}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI Chat */}
        <Card className="lg:col-span-2 p-0 bg-gradient-card border-0 shadow-soft overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b bg-background/50 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <div><p className="font-semibold text-sm">MindCare AI</p><p className="text-xs text-muted-foreground">Compassionate support · Hinglish</p></div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-muted-foreground italic">MindCare is typing…</div>}
          </div>
          <div className="p-3 border-t bg-background/50 flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type your message…" disabled={sending} />
            <Button onClick={send} disabled={sending} className="bg-gradient-hero text-white border-0"><Send className="h-4 w-4" /></Button>
          </div>
        </Card>

        {/* Mood logger */}
        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> How are you feeling?</h3>
          <div className="text-center text-5xl mb-3">{EMOJIS[mood - 1]}</div>
          <Slider value={[mood]} min={1} max={10} step={1} onValueChange={(v) => setMood(v[0])} />
          <p className="text-center text-sm text-muted-foreground mt-2">Mood: {mood}/10</p>
          <Textarea className="mt-3" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <Button className="w-full mt-3 bg-gradient-hero text-white border-0" onClick={() => logMood.mutate()} disabled={logMood.isPending}>
            {logMood.isPending ? "Saving…" : "Log mood"}
          </Button>
        </Card>

        {/* Mood chart */}
        <Card className="lg:col-span-2 p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3">Last 7 days</h3>
          <div className="h-56">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Log your mood to see the trend.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 10]} stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="mood" stroke="var(--color-primary)" strokeWidth={3} dot={{ fill: "var(--color-primary)", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Wellness tip */}
        <Card className="p-5 bg-gradient-hero text-white border-0 shadow-soft">
          <Sparkles className="h-6 w-6 mb-2" />
          <h3 className="font-semibold mb-2">Daily wellness tip</h3>
          <p className="text-sm opacity-95">{tip}</p>
        </Card>

        {/* Emergency */}
        <Card className="p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Phone className="h-4 w-4 text-destructive" /> Emergency resources</h3>
          <div className="space-y-2 text-sm">
            <a href="tel:03174288665" className="block p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors">
              <p className="font-semibold">Umang Helpline</p>
              <p className="text-muted-foreground">0317-4288665</p>
            </a>
            <a href="https://rozan.org" target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
              <p className="font-semibold">Rozan Pakistan</p>
              <p className="text-muted-foreground">rozan.org</p>
            </a>
          </div>
        </Card>

        {/* Profile */}
        <Card className="lg:col-span-2 p-5 bg-gradient-card border-0 shadow-soft">
          <h3 className="font-semibold mb-3">Your profile</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div><Label>University</Label><Input value={uni} onChange={(e) => setUni(e.target.value)} /></div>
          </div>
          <Button className="mt-3" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Save profile</Button>
        </Card>
      </div>
    </AppShell>
  );
}
