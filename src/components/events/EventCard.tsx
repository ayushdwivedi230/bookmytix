import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Tag } from 'lucide-react';
import type { ApiEvent } from '../../types';

const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600&h=800';

interface EventCardProps {
  event: ApiEvent;
}

export function EventCard({ event }: EventCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 shrink-0">
        <img
          src={imgError ? FALLBACK : (event.image || FALLBACK)}
          alt={event.title}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-[#F84464] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
          {event.category}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
          ₹{event.price}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{event.title}</h3>

        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[#F84464] shrink-0" aria-hidden />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-[#F84464] shrink-0" aria-hidden />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-[#F84464] shrink-0" aria-hidden />
            <span>{event.category}</span>
          </div>
        </div>

        <Link
          to={`/events/${event.id}`}
          className="mt-auto block w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-[#F84464] hover:text-white hover:border-[#F84464] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464]"
        >
          Reserve Seat
        </Link>
      </div>
    </article>
  );
}
