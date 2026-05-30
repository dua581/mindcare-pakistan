import { Heart } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex items-center gap-2">
      <div className={`${dim} rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft`}>
        <Heart className="h-1/2 w-1/2 text-white" fill="white" />
      </div>
      <span className={`${text} font-bold tracking-tight text-gradient`}>MindCare</span>
    </div>
  );
}
