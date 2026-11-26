import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, X, Film } from 'lucide-react';
import { POPULAR_CINEMAS, CinemaCard, CinemaChain } from '../components/cinemas/CinemaCard';
import { cinemasApi } from '../services/api';

const CITIES = ['All Cities', 'Mumbai', 'Delhi-NCR', 'Bengaluru', 'Hyderabad', 'Pune'];
const FORMATS = ['All Formats', 'IMAX Laser', 'IMAX 3D', '4DX', 'Dolby Atmos', 'Standard'];

export function CinemasPage({ selectedCity: initialCity = 'All Cities' }: { selectedCity?: string } = {}) {
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedFormat, setSelectedFormat] = useState('All Formats');
  const [searchQuery, setSearchQuery] = useState('');
  const [backendCinemas, setBackendCinemas] = useState<CinemaChain[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    cinemasApi
      .list({
        city: selectedCity,
        format: selectedFormat,
        search: searchQuery,
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: CinemaChain[] = data.map((t) => ({
            id: String(t.id),
            name: t.name,
            city: t.city || 'Mumbai',
            location: t.address || t.location,
            amenities: t.amenities || ['4K Dolby Atmos', 'Parking', 'Food Court'],
            formats: t.formats || ['Standard', 'IMAX 3D'],
            image:
              t.name.toLowerCase().includes('inox')
                ? 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80'
                : t.name.toLowerCase().includes('cinepolis')
                ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'
                : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
          }));
          setBackendCinemas(mapped);
        } else {
          setBackendCinemas([]);
        }
      })
      .catch(() => {
        // Fallback to static
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedCity, selectedFormat, searchQuery]);

  const filteredCinemas = useMemo(() => {
    if (backendCinemas.length > 0) {
      return backendCinemas;
    }
    return POPULAR_CINEMAS.filter((c) => {
      if (selectedCity !== 'All Cities' && !c.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      if (selectedFormat !== 'All Formats' && !c.formats.includes(selectedFormat)) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [backendCinemas, selectedCity, selectedFormat, searchQuery]);

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── Page Header Banner ── */}
      <div className="border-b border-white/[0.08] bg-[#0A0C13] py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-2">
                <Film size={14} />
                <span>Multiplexes &amp; Theatres</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Cinemas Near You
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Discover world-class cinema halls featuring IMAX with Laser, Dolby Atmos 3D sound, and luxury recliner lounges.
              </p>
            </div>

            {/* Cinema Search */}
            <div className="w-full sm:w-72">
              <div className="flex items-center bg-[#161925] border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="search"
                  placeholder="Search cinema or area…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ml-2.5 flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Section ── */}
      <div className="border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-md sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* City tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
              City:
            </span>
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedCity === city
                    ? 'bg-[#F84464] text-white shadow-md shadow-[#F84464]/20'
                    : 'bg-[#161925] text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Format pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
              Format:
            </span>
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  selectedFormat === fmt
                    ? 'bg-white text-black font-extrabold'
                    : 'bg-[#161925] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cinemas Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredCinemas.length}</strong> multiplexe{filteredCinemas.length !== 1 ? 's' : ''}
          </p>
          {(selectedCity !== 'All Cities' || selectedFormat !== 'All Formats' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCity('All Cities');
                setSelectedFormat('All Formats');
                setSearchQuery('');
              }}
              className="text-xs text-[#F84464] hover:underline font-bold flex items-center gap-1"
            >
              <X size={12} /> Reset filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#F84464] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Discovering local cinemas…</p>
          </div>
        ) : filteredCinemas.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-[#0F1118] border border-white/10 max-w-lg mx-auto">
            <MapPin size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="font-extrabold text-white text-lg">No Cinemas Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              We couldn't find any theatres matching your selected filters or city.
            </p>
            <button
              onClick={() => {
                setSelectedCity('All Cities');
                setSelectedFormat('All Formats');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCinemas.map((cinema) => (
              <CinemaCard key={cinema.id} cinema={cinema} />
            ))}
          </div>
        )}
      </div>

      {/* ── Multiplex Technology Highlights ── */}
      <div className="border-t border-white/[0.08] bg-[#0A0C13] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Cinematic Technologies We Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Step into the future of storytelling with cutting-edge audiovisual systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 space-y-2">
              <span className="px-2.5 py-1 rounded-md bg-[#F84464]/20 text-[#F84464] text-xs font-black border border-[#F84464]/30">
                IMAX with Laser
              </span>
              <h3 className="text-base font-bold text-white pt-2">Next-Gen Laser Projection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crystal-clear images and 12-channel immersive sound engineered specifically for massive curved auditoriums.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 space-y-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-black border border-indigo-500/30">
                Dolby Atmos
              </span>
              <h3 className="text-base font-bold text-white pt-2">Multidimensional Sound</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sound that moves all around you with breathtaking realism, putting you directly inside the film's action.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 space-y-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/30">
                VIP Recliner Lounges
              </span>
              <h3 className="text-base font-bold text-white pt-2">Ultimate Luxury Seating</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Plush leather recliners, at-seat waiter service, and gourmet concession dining menus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
