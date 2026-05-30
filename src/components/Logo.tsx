import { Heart } from "lucide-react";

export function Logo({ size = "md", showSub = true }: { size?: "sm" | "md" | "lg"; showSub?: boolean }) {
  const dim = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  const sub = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dim} rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft`}>
        <Heart className="h-1/2 w-1/2 text-white" fill="white" />
      </div>
      <div className="leading-tight">
        <div className={`${text} font-bold tracking-tight text-gradient`}>MindCare</div>
        {showSub && <div className={`${sub} text-muted-foreground -mt-0.5 tracking-wider uppercase`}>Pakistan</div>}
      </div>
    </div>
  );
}
