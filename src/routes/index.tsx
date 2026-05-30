import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Heart, Brain, Sparkles, ShieldCheck, Stethoscope, Settings2, ArrowRight, Database, Loader2 } from "lucide-react";
import heroImg from "@/assets/hero-illustration.jpg";
import { useServerFn } from "@tanstack/react-start";
import { seedDemoData } from "@/lib/seed.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindCare Pakistan — Your Mental Wellness Companion" },
      { name: "description", content: "AI-powered mental wellness for Pakistani youth. Aligned with SDG 3, Vision 2030 & Vision 2035." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const seed = useServerFn(seedDemoData);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (user && role) navigate({ to: `/${role}` as "/user" | "/doctor" | "/admin" });
  }, [user, role, navigate]);

  const goAuth = (asRole: "user" | "doctor" | "admin") => {
    navigate({ to: "/auth", search: { role: asRole, redirect: `/${asRole}` } });
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seed();
      toast.success("Demo data ready! Sign in with any demo account.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth" search={{ role: "user", redirect: "/user" }}>
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-6 pb-16 md:pt-12 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3 w-3" /> SDG 3 · Good Health
              </span>
              <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold">Vision 2030</span>
              <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground px-3 py-1 text-xs font-semibold">Vision 2035</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Your Mental Wellness <span className="text-gradient">Companion</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              MindCare Pakistan brings compassionate AI-powered mental health support to students, patients, and clinicians — in English and Urdu, when you need it most.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4 text-primary" /> Daily mood tracking</div>
              <div className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 text-secondary" /> 24/7 AI assistant</div>
              <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-success" /> Private & secure</div>
            </div>
            <div className="flex flex-wrap gap-3 pt-3">
              <Button size="lg" className="bg-gradient-hero text-white border-0" onClick={() => goAuth("user")}>
                Get started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Load demo data
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-3xl opacity-25" />
            <div className="relative rounded-3xl overflow-hidden shadow-glow border border-border/60">
              <img src={heroImg} alt="Peaceful meditation illustration" width={1024} height={1024} className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Choose your space</h2>
        <p className="text-center text-muted-foreground mb-10">Pick the dashboard that fits your role.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { role: "user" as const, icon: Heart, title: "I am a User", subtitle: "Student / Patient", desc: "Track mood, chat with AI, access wellness tips and emergency resources." },
            { role: "doctor" as const, icon: Stethoscope, title: "I am a Doctor", subtitle: "Counselor", desc: "View your patients, mood history, AI chat summaries, and add session notes." },
            { role: "admin" as const, icon: Settings2, title: "I am an Admin", subtitle: "Hospital / NGO", desc: "Monitor platform stats, flag at-risk users, post announcements." },
          ].map(({ role, icon: Icon, title, subtitle, desc }) => (
            <button key={role} onClick={() => goAuth(role)} className="group text-left">
              <Card className="p-6 h-full bg-gradient-card border-0 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center mb-5 shadow-soft">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{subtitle}</p>
                <h3 className="text-xl font-semibold mt-1 mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Enter <ArrowRight className="h-4 w-4" />
                </span>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Dataset: Kaggle Mental Health in Tech Survey · SDG 3 · MindCare Pakistan
      </footer>
    </div>
  );
}
