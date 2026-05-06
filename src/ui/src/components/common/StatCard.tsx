import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  color?: "default" | "win" | "loss" | "accent";
}

const colorMap = {
  default: "text-text-primary",
  win: "text-win",
  loss: "text-loss",
  accent: "text-accent",
};

export function StatCard({
  label,
  value,
  sub,
  color = "default",
}: StatCardProps) {
  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <p className="text-text-muted text-xs uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-text-secondary text-sm mt-1">{sub}</p>}
    </div>
  );
}
