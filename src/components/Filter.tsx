interface FilterProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function Filter({ label, value, options, onChange }: FilterProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
