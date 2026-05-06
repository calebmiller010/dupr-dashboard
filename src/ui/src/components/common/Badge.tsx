interface BadgeProps {
  text: string;
  variant?: "win" | "loss" | "neutral" | "accent";
}

const variants = {
  win: "bg-win-dim text-win",
  loss: "bg-loss-dim text-loss",
  neutral: "bg-bg-card-hover text-text-secondary",
  accent: "bg-accent/20 text-accent",
};

export function Badge({ text, variant = "neutral" }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {text}
    </span>
  );
}
