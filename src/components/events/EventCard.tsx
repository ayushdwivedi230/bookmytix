import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Tag, Ticket } from 'lucide-react';
import type { ApiEvent } from '../../types';

const FALLBACK_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800&h=600';

interface EventCardProps {
  event: ApiEvent;
}

export function EventCard({ event }: EventCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0F1118] overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#F84464]/10 hover:border-[#F84464]/40">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#161925] shrink-0">
        <img
          src={imgError ? FALLBACK_EVENT_IMAGE : event.image || FALLBACK_EVENT_IMAGE}
          alt={event.title}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1118] via-transparent to-transparent pointer-events-none" />

        {/* Category tag */}
        <span className="absolute top-3 left-3 rounded-full bg-[#F84464] px-3 py-1 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-sm">
          {event.category}
        </span>

        {/* Price tag */}
        <span className="absolute top-3 right-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 text-xs font-bold text-white">
          ₹{event.price} onwards
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3 justify-between">
        <div>
          <h3 className="font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-[#F84464] transition-colors">
            {event.title}
          </h3>

          <div className="mt-2.5 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-[#F84464] shrink-0" aria-hidden="true" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[#F84464] shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-[#F84464] shrink-0" aria-hidden="true" />
              <span>{event.category}</span>
            </div>
          </div>
        </div>

        <Link
          to={`/events/${event.id}`}
          className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-xl bg-white/[0.06] hover:bg-[#F84464] text-slate-200 hover:text-white py-2.5 text-xs font-bold transition-all duration-200 border border-white/10 hover:border-[#F84464] active:scale-95"
        >
          <Ticket size={14} />
          <span>Book Tickets</span>
        </Link>
      </div>
    </article>
  );
}
