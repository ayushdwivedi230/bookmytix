import { MapPin, Sparkles, Navigation } from 'lucide-react';

export interface CinemaChain {
  id: string;
  name: string;
  city: string;
  location: string;
  amenities: string[];
  formats: string[];
  image: string;
}

export const POPULAR_CINEMAS: CinemaChain[] = [
  {
    id: 'pvr-jio',
    name: 'PVR INOX: Maison PVR, Jio World Drive',
    city: 'Mumbai',
    location: 'BKC, Bandra East, Mumbai',
    amenities: ['Recliner Seats', 'Gourmet Food', 'Dolby Atmos', 'Valet Parking'],
    formats: ['IMAX Laser', '4DX', 'P[XL]'],
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cinepolis-hitec',
    name: 'Cinepolis: Nexus Mall, Hitec City',
    city: 'Hyderabad',
    location: 'Kukatpally, Hyderabad',
    amenities: ['VIP Lounge', 'Seat-side Service', 'Dolby 7.1', 'Wheelchair Access'],
    formats: ['VIP Cinema', 'RealD 3D', 'Macro XE'],
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'inox-nexus',
    name: 'PVR INOX: Nexus Mall, Koramangala',
    city: 'Bengaluru',
    location: 'Koramangala 7th Block, Bengaluru',
    amenities: ['Inox Insignia', 'Dolby Atmos', 'Live Concession Kitchen'],
    formats: ['IMAX 3D', 'Insignia', 'Laser Projection'],
    image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pvr-plaza',
    name: 'PVR: Plaza Heritage, Connaught Place',
    city: 'Delhi-NCR',
    location: 'H-Block, Connaught Circus, New Delhi',
    amenities: ['Heritage Architecture', 'Prime Recliners', 'Classic Ambiance'],
    formats: ['4K Laser', 'Dolby 7.1'],
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
  },
];

interface CinemaCardProps {
  cinema: CinemaChain;
  onSelect?: (cinema: CinemaChain) => void;
}

export function CinemaCard({ cinema, onSelect }: CinemaCardProps) {
  return (
    <article className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0F1118] overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#F84464]/30 hover:shadow-2xl">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#161925]">
        <img
          src={cinema.image}
          alt={cinema.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1118] via-transparent to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
          <MapPin size={11} className="text-[#F84464]" />
          {cinema.city}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3 justify-between">
        <div>
          <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#F84464] transition-colors">
            {cinema.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Navigation size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{cinema.location}</span>
          </p>

          {/* Formats */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cinema.formats.map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded-md bg-[#F84464]/10 text-[#F84464] text-[10px] font-bold border border-[#F84464]/20"
              >
                {fmt}
              </span>
            ))}
          </div>

          {/* Amenities */}
          <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400">
            {cinema.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="flex items-center gap-1">
                <Sparkles size={10} className="text-amber-400" />
                {amenity}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.(cinema)}
          className="w-full flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] hover:bg-[#F84464] text-slate-200 hover:text-white py-2 text-xs font-bold transition-colors border border-white/10 hover:border-[#F84464] cursor-pointer mt-1"
        >
          View Movies &amp; Showtimes
        </button>
      </div>
    </article>
  );
}
