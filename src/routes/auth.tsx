import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const Search = z.object({
  role: z.enum(["user", "doctor", "admin"]).default("user"),
  redirect: z.string().default("/user"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: Search,
  head: () => ({ meta: [{ title: "Sign in — MindCare Pakistan" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const afterAuth = () => navigate({ to: search.redirect as "/user" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back!"); afterAuth(); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, role: search.role },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created!"); afterAuth(); }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + search.redirect });
    if (result.error) toast.error("Google sign-in failed");
  };

  const fillDemo = (r: "user" | "doctor" | "admin") => {
    setEmail(`${r}@mindcare.pk`);
    setPassword("demo123");
    setTab("login");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center"><Link to="/"><Logo size="lg" /></Link></div>
        <Card className="p-6 bg-gradient-card shadow-soft border-0">
          <p className="text-center text-sm text-muted-foreground mb-4">
            Signing in as <span className="font-semibold capitalize text-foreground">{search.role}</span>
          </p>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" className="w-full bg-gradient-hero text-white border-0" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" className="w-full bg-gradient-hero text-white border-0" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </Card>

        <Card className="p-4 bg-gradient-card border-0 shadow-soft">
          <p className="text-xs font-semibold mb-2 text-foreground">🔑 Demo credentials (click to fill)</p>
          <div className="space-y-1.5 text-xs">
            {(["user", "doctor", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => fillDemo(r)}
                className="w-full flex justify-between items-center p-2 rounded-lg bg-muted hover:bg-accent transition-colors"
              >
                <span className="capitalize font-medium">{r}</span>
                <span className="text-muted-foreground font-mono">{r}@mindcare.pk / demo123</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">First time? Click "Load demo data" on the home page.</p>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to home</Link>
        </p>
        <footer className="text-center text-[11px] text-muted-foreground pt-2">
          Dataset: Kaggle Mental Health in Tech Survey · SDG 3 · MindCare Pakistan
        </footer>
      </div>
    </div>
  );
}
