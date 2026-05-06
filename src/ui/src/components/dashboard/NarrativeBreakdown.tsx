import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const NARRATIVE_META: Record<string, { color: string; desc: string }> = {
  Dominance: { color: "#22c55e", desc: "Won, big rating gain" },
  "Standard Win": { color: "#94a3b8", desc: "Normal win" },
  "Rough Win": { color: "#eab308", desc: "Won but lost rating" },
  "The Grinder": { color: "#3b82f6", desc: "Lost but gained rating" },
  "Soft Loss": { color: "#6b7280", desc: "Normal loss" },
  Underperformance: { color: "#ef4444", desc: "Lost, big rating drop" },
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const { name, value } = payload[0];
  const meta = NARRATIVE_META[name];
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 text-sm shadow-xl">
      <p className="font-medium text-text-primary">{name}</p>
      <p className="text-text-secondary">{meta?.desc}</p>
      <p className="text-accent font-bold">{value} matches</p>
    </div>
  );
}

export function NarrativeBreakdown({
  narratives,
}: {
  narratives: Record<string, number>;
}) {
  const data = Object.entries(narratives)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4">Match Narratives</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={NARRATIVE_META[entry.name]?.color ?? "#64748b"}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-text-secondary text-xs">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
