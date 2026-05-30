import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Heart, Brain, Sparkles, ShieldCheck, Stethoscope, Settings2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindCare Pakistan — Your Mental Wellness Companion" },
      { name: "description", content: "AI-powered mental wellness for Pakistani youth. Aligned with SDG 3, Vision 2030 & 2035." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) navigate({ to: `/${role}` as "/user" | "/doctor" | "/admin" });
  }, [user, role, navigate]);

  const goAuth = (asRole: "user" | "doctor" | "admin") => {
    navigate({ to: "/auth", search: { role: asRole, redirect: `/${asRole}` } });
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

      <section className="container mx-auto px-4 pt-8 pb-16 md:pt-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> SDG 3 · Vision 2030 · Vision 2035
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Your Mental Wellness <span className="text-gradient">Companion</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              MindCare Pakistan brings compassionate AI-powered mental health support to students,
              patients, and clinicians — in English and Urdu, when you need it most.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4 text-primary" /> Daily mood tracking</div>
              <div className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 text-secondary" /> 24/7 AI assistant</div>
              <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-success" /> Private & secure</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-3xl opacity-30" />
            <Card className="relative p-8 bg-gradient-card shadow-soft border-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">MindCare AI</p>
                    <p className="text-xs text-muted-foreground">Online · just now</p>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted p-4 text-sm">
                  Aaj aap kaisa feel kar rahe hain? 💙 Mujhe batao, main yahan hoon sunne ke liye.
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-primary p-4 text-sm text-primary-foreground ml-8">
                  Thoda stress feel ho raha hai exams ki wajah se…
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted p-4 text-sm">
                  Bilkul samajh sakta hoon. Chalo ek breathing exercise try karte hain — 4 seconds inhale, 7 hold, 8 exhale. ✨
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Choose your space</h2>
        <p className="text-center text-muted-foreground mb-10">Pick the dashboard that fits your role.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { role: "user" as const, icon: Heart, title: "I am a User", subtitle: "Student / Patient", desc: "Track mood, chat with AI, access wellness tips and emergency resources.", color: "from-primary to-secondary" },
            { role: "doctor" as const, icon: Stethoscope, title: "I am a Doctor", subtitle: "Counselor", desc: "View your patients, mood history, AI chat summaries, and add session notes.", color: "from-secondary to-primary" },
            { role: "admin" as const, icon: Settings2, title: "I am an Admin", subtitle: "Hospital / NGO", desc: "Monitor platform stats, flag at-risk users, post announcements.", color: "from-primary to-secondary" },
          ].map(({ role, icon: Icon, title, subtitle, desc, color }) => (
            <button
              key={role}
              onClick={() => goAuth(role)}
              className="group text-left"
            >
              <Card className="p-6 h-full bg-gradient-card border-0 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-soft`}>
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

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p>© MindCare Pakistan · Aligned with SDG 3 · Vision 2030 · Vision 2035</p>
        <p className="mt-1">Dataset powered by Kaggle Mental Health in Tech Survey</p>
      </footer>
    </div>
  );
}
