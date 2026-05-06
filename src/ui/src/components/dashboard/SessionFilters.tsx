import { useState } from "react";

interface SessionFiltersProps {
  years: string[];
  organizers: string[];
  locations: string[];
  formats: string[];
  organizerCounts: Record<string, number>;
  locationCounts: Record<string, number>;
  filterYear: string;
  filterOrganizer: string;
  filterLocation: string;
  filterFormat: string;
  onYearChange: (v: string) => void;
  onOrganizerChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onFormatChange: (v: string) => void;
  onClear: () => void;
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
        active
          ? "bg-accent text-bg-primary border-accent font-medium"
          : "bg-bg-primary text-text-secondary border-border hover:border-text-muted hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary w-full appearance-none cursor-pointer hover:border-text-muted transition-colors"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SessionFilters({
  years,
  organizers,
  locations,
  formats,
  organizerCounts,
  locationCounts,
  filterYear,
  filterOrganizer,
  filterLocation,
  filterFormat,
  onYearChange,
  onOrganizerChange,
  onLocationChange,
  onFormatChange,
  onClear,
}: SessionFiltersProps) {
  const [showMore, setShowMore] = useState(false);
  const hasFilters =
    filterYear || filterOrganizer || filterLocation || filterFormat;

  return (
    <div className="space-y-3">
      {/* Quick filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Year pills */}
        <Pill
          label="All Time"
          active={!filterYear}
          onClick={() => onYearChange("")}
        />
        {years.map((y) => (
          <Pill
            key={y}
            label={y}
            active={filterYear === y}
            onClick={() => onYearChange(filterYear === y ? "" : y)}
          />
        ))}

        <span className="w-px h-5 bg-border mx-1" />

        {/* Top organizer pills (3+ sessions) */}
        {organizers
          .filter((o) => (organizerCounts[o] ?? 0) >= 3)
          .map((o) => (
            <Pill
              key={o}
              label={o}
              active={filterOrganizer === o}
              onClick={() => onOrganizerChange(filterOrganizer === o ? "" : o)}
            />
          ))}

        <span className="w-px h-5 bg-border mx-1" />

        {/* Top location pills (3+ sessions) */}
        {locations
          .filter((l) => (locationCounts[l] ?? 0) >= 3)
          .map((l) => (
            <Pill
              key={l}
              label={l}
              active={filterLocation === l}
              onClick={() => onLocationChange(filterLocation === l ? "" : l)}
            />
          ))}

        <span className="w-px h-5 bg-border mx-1" />

        <button
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {showMore ? "Less filters" : "More filters"}
        </button>

        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs text-accent hover:text-accent-dim transition-colors ml-auto"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filter dropdowns */}
      {showMore && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-bg-card rounded-lg border border-border">
          <FilterSelect
            label="Year"
            value={filterYear}
            options={years}
            onChange={onYearChange}
          />
          <FilterSelect
            label="Organizer"
            value={filterOrganizer}
            options={organizers}
            onChange={onOrganizerChange}
          />
          <FilterSelect
            label="Location"
            value={filterLocation}
            options={locations}
            onChange={onLocationChange}
          />
          <FilterSelect
            label="Format"
            value={filterFormat}
            options={formats}
            onChange={onFormatChange}
          />
        </div>
      )}
    </div>
  );
}
