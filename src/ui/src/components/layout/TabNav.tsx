interface TabNavProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              active === tab
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-secondary hover:border-border"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
