import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search movies...' }: SearchBarProps) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-[#F84464] focus-within:ring-2 focus-within:ring-[#F84464]/20">
      <Search size={16} className="text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-slate-700 outline-none"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={14} />
        </button>
      ) : null}
    </label>
  );
}
