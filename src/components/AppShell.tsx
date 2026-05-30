import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

export function AppShell({ title, children, nav }: { title: string; children: ReactNode; nav?: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/"><Logo size="sm" /></Link>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">{nav}</div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground capitalize">{role}</span>
            <ThemeToggle />
            {user && (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{title}</h1>
        {children}
      </main>
      <footer className="border-t border-border/60 mt-12 py-6 text-center text-xs text-muted-foreground">
        MindCare Pakistan · Aligned with SDG 3 · Vision 2030 · Vision 2035 ·{" "}
        <span>Dataset powered by Kaggle Mental Health in Tech Survey</span>
      </footer>
    </div>
  );
}
