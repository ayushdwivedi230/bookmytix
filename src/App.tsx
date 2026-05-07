import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronRight, Ticket, CreditCard, CheckCircle, Download, Menu, Star, Calendar, MonitorPlay, X, Headphones, RefreshCcw, Mail, Play, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = '/api';

const api = {
  get: async (url: string, token?: string | null) => {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}${url}`, { headers }).then(r => r.json());
  },
  post: async (url: string, body: any, token?: string | null) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  }
};

const THEME = {
  primary: '#F84464',
  primaryHover: '#e03b5a',
  bgDark: '#2B314B',
  bgLight: '#F5F5F5'
};

const Navbar = ({ token, user, onLogOut }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" style={{ color: THEME.primary }}>
              <div className="flex flex-col items-end">
                  <span className="font-extrabold text-2xl tracking-tighter leading-none">bookmytix</span>
              </div>
            </Link>
            
            <div className="hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded px-3 py-2 w-[500px]">
              <Search size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search for Movies, Events, Plays, Sports and Activities" 
                className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-gray-500 text-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-1 text-sm text-gray-700 hover:text-black cursor-pointer font-medium">
              <span>Select Location</span>
              <ChevronRight size={14} className="rotate-90 text-gray-400" />
            </div>

            {token ? (
              <div className="hidden lg:flex items-center gap-6">
                <Link to="/bookings" className="text-sm font-medium text-gray-700 hover:text-black">
                  Hi, {user?.name?.split(' ')[0] || 'User'}
                </Link>
                <Link to="/admin" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Admin
                </Link>
                <button onClick={onLogOut} className="text-sm text-gray-500 hover:text-red-500">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="hidden lg:inline-block text-sm font-medium px-5 py-1.5 text-white rounded cursor-pointer" style={{ backgroundColor: THEME.primary }}>
                Sign in
              </Link>
            )}
            <button className="lg:hidden" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/50" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl flex flex-col transform transition-transform animate-in fade-in slide-in-from-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-[#2B314B] text-white">
              <span className="font-bold text-lg">Hey! {token && user?.name?.split(' ')[0]}</span>
              <button onClick={() => setIsMenuOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-gray-800">
               {token ? (
                  <>
                     <Link to="/bookings" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-100 p-2 rounded">My Bookings</Link>
                     <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-100 p-2 rounded">Admin Dashboard</Link>
                     <button onClick={() => { onLogOut(); setIsMenuOpen(false); }} className="text-left text-red-500 hover:bg-red-50 p-2 rounded">Logout</button>
                  </>
               ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-100 p-2 rounded font-medium">Login / Register</Link>
               )}
               <hr />
               <a href="#" className="hover:bg-gray-100 p-2 rounded">Movies</a>
               <a href="#" className="hover:bg-gray-100 p-2 rounded">Events</a>
               <a href="#" className="hover:bg-gray-100 p-2 rounded">Plays</a>
               <a href="#" className="hover:bg-gray-100 p-2 rounded">Sports</a>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Nav */}
      <div className="bg-[#222539] hidden lg:block border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-10 items-center text-sm">
          <div className="flex gap-6 text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Movies</a>
            <a href="#" className="hover:text-white transition-colors">Stream</a>
            <Link to="/" className="text-white font-medium">Events</Link>
            <a href="#" className="hover:text-white transition-colors">Plays</a>
            <a href="#" className="hover:text-white transition-colors">Sports</a>
            <a href="#" className="hover:text-white transition-colors">Activities</a>
          </div>
          <div className="flex gap-6 text-gray-300 text-xs tracking-wider">
            <a href="#" className="hover:text-white transition-colors">ListYourShow</a>
            <a href="#" className="hover:text-white transition-colors">Corporates</a>
            <a href="#" className="hover:text-white transition-colors">Offers</a>
            <a href="#" className="hover:text-white transition-colors">Gift Cards</a>
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Components ---
const HeroSlider = ({ onBookNow, onExplore }: { onBookNow: () => void, onExplore: () => void }) => {
  const images = [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&h=800&q=80', // Concert
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&h=800&q=80', // Cinema
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1920&h=800&q=80'  // Sports
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[400px] lg:h-[500px] overflow-hidden bg-[#1A1A1A]">
      <AnimatePresence mode="wait">
        <motion.div 
          key={images[current]} 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img src={images[current]} className="w-full h-full object-cover opacity-60" alt="Hero background" />
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
      
      <div className="absolute inset-0 flex items-center z-10 w-full">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl text-white backdrop-blur-xl bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F84464]/30 rounded-full blur-[80px] transition-all duration-[3000ms] animate-pulse"></div>
               <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] transition-all duration-[3000ms] animate-pulse delay-1000"></div>
               
               <div className="relative z-10">
                 <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-tight drop-shadow-lg text-white">
                   Book Your Next <br/> Experience <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F84464] to-pink-400 drop-shadow-md">Instantly</span>
                 </h1>
                 <p className="text-gray-300 text-lg md:text-xl mb-8 font-medium max-w-lg drop-shadow">
                   Fast, secure, and hassle-free ticket booking for concerts, movies, and the most vibrant global festivals.
                 </p>
                 <div className="flex flex-wrap gap-4">
                   <button onClick={onBookNow} className="px-8 py-3.5 rounded-xl font-bold text-white transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(248,68,100,0.5)] bg-gradient-to-r from-[#F84464] to-[#e03b5a] shadow-[0_0_20px_rgba(248,68,100,0.3)]">
                     Book Now
                   </button>
                   <button onClick={onExplore} className="px-8 py-3.5 rounded-xl font-bold text-white transition-all transform hover:scale-105 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md">
                     Explore Events
                   </button>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const Home = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    api.get('/events').then(data => {
      if (Array.isArray(data)) {
         setEvents(data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-32 text-gray-500 bg-[#0a0a0b] min-h-screen">Loading the best events for you...</div>;

  const categories = ["All", "Movies", "Concerts", "Sports", "Comedy", "Tech Events"];
  const filteredEvents = activeCategory === "All" ? events : events.filter(e => e.category === activeCategory);

  return (
    <div className="bg-[#0a0a0b] min-h-screen text-white">
      <HeroSlider onBookNow={() => scrollTo('booking-section')} onExplore={() => scrollTo('explore-section')} />

      {/* Booking Section */}
      <section id="booking-section" className="py-24 relative bg-gradient-to-b from-[#1A1A1A] to-[#0a0a0b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Ticket className="text-[#F84464]" /> Ticket Booking
              </h2>
              <p className="text-gray-400">Reserve your seats for trending experiences.</p>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                {categories.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setActiveCategory(c)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === c ? 'bg-[#F84464] text-white shadow-[0_0_15px_rgba(248,68,100,0.5)]' : 'hover:text-white text-gray-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="md:ml-2 flex items-center bg-white/5 rounded-full px-4 py-2.5 border border-white/10 backdrop-blur-md">
                 <Search size={16} className="text-gray-400 mr-2" />
                 <input type="text" placeholder="Search events..." className="bg-transparent border-none outline-none text-sm text-white w-32 md:w-48 placeholder-gray-500" />
              </div>
            </div>
          </div>

          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
            {filteredEvents.map((event, i) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                key={event.id}
                className="group relative bg-[#131521]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/5 transition-all duration-300 shadow-lg hover:border-white/20 hover:shadow-[#F84464]/20"
              >
                <div className="aspect-[4/3] overflow-hidden relative bg-black/50">
                   <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600&h=800'} loading="lazy" alt={event.title} className="w-full h-full object-cover opacity-80 transform group-hover:scale-110 group-hover:opacity-100 transition duration-700 ease-out" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#131521] to-transparent opacity-90"></div>
                   
                   <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold border border-white/10">
                     ₹{event.price}
                   </div>
                   <div className="absolute top-3 left-3 bg-gradient-to-r from-[#F84464] to-[#e03b5a] px-3 py-1 text-xs font-bold shadow-[0_0_15px_rgba(248,68,100,0.5)] rounded-full">
                     {event.category}
                   </div>
                </div>
                <div className="p-4 relative -mt-6 z-10">
                  <h3 className="font-bold text-lg mb-1 text-white group-hover:text-[#F84464] transition-colors truncate drop-shadow-md">{event.title}</h3>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center text-gray-400 text-xs gap-2">
                       <Calendar size={12} className="text-[#F84464]" /> {event.date}
                    </div>
                    <div className="flex items-center text-gray-400 text-xs gap-2">
                       <MapPin size={12} className="text-[#F84464]" /> {event.location}
                    </div>
                  </div>
                  <Link to={`/events/${event.id}`} className="block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all bg-white/10 hover:bg-[#F84464] hover:shadow-[0_0_20px_rgba(248,68,100,0.5)] border border-white/10 hover:border-transparent text-white group-hover:scale-[1.02]">
                    Reserve Seat
                  </Link>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore-section" className="py-24 relative bg-[#0a0a0b] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                 <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-2">
                   <Sparkles className="text-[#F84464]" /> Showcase Events
                 </h2>
                 <p className="text-gray-400">Discover premium events and live experiences near you.</p>
              </div>
              <button className="flex items-center gap-2 text-sm text-[#F84464] font-semibold hover:text-white transition group border border-[#F84464]/30 px-4 py-2 rounded-full hover:bg-[#F84464] hover:border-[#F84464]">
                View Full Showcase <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Main Feature */}
              <motion.div whileHover={{ scale: 1.01 }} className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]">
                 <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition duration-700 ease-out transform group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-0"></div>
                 <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex justify-between items-end z-10">
                    <div className="pr-4 border-l-4 border-[#F84464] pl-4">
                      <div className="bg-[#F84464] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mb-2 tracking-wider uppercase">Live Concert</div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-1 leading-tight drop-shadow-md">Sunburn Festival <br/> Goa 2026</h3>
                      <p className="text-gray-300 text-xs md:text-sm font-medium drop-shadow max-w-[250px]">Experience Asia's biggest electronic dance music festival.</p>
                    </div>
                    <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 group-hover:bg-[#F84464] transition-all duration-300 group-hover:border-transparent group-hover:shadow-[0_0_20px_rgba(248,68,100,0.6)] group-hover:scale-110">
                      <Play size={20} className="text-white ml-0.5" fill="currentColor" />
                    </button>
                 </div>
              </motion.div>
              
              {/* Secondary Features */}
              <div className="grid grid-cols-1 gap-6">
                 <motion.div whileHover={{ scale: 1.02 }} className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]">
                   <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition duration-700 ease-out transform group-hover:scale-105 absolute inset-0" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                   <div className="relative p-6 h-full flex items-end justify-between min-h-[200px]">
                         <div className="border-l-2 border-blue-500 pl-3">
                            <div className="text-[10px] text-blue-400 font-bold mb-1 tracking-wider uppercase">Movie Premiere</div>
                            <h3 className="text-xl font-bold text-white drop-shadow-md">Pushpa 2: The Rule</h3>
                         </div>
                         <div className="bg-white/10 p-2.5 rounded-full backdrop-blur border border-white/10 group-hover:bg-blue-600 transition-colors group-hover:border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                            <ArrowRight className="text-white" size={18} />
                         </div>
                   </div>
                 </motion.div>

                 <motion.div whileHover={{ scale: 1.02 }} className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]">
                   <img src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition duration-700 ease-out transform group-hover:scale-105 absolute inset-0" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                   <div className="relative p-6 h-full flex items-end justify-between min-h-[200px]">
                         <div className="border-l-2 border-yellow-400 pl-3">
                            <div className="text-[10px] text-yellow-400 font-bold mb-1 tracking-wider uppercase">Live Sports</div>
                            <h3 className="text-xl font-bold text-white drop-shadow-md">IPL Finals Live</h3>
                         </div>
                         <div className="bg-white/10 p-2.5 rounded-full backdrop-blur border border-white/10 group-hover:bg-yellow-500 transition-colors group-hover:border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0)] group-hover:shadow-[0_0_15px_rgba(234,179,8,0.6)]">
                            <ArrowRight className="text-white" size={18} />
                         </div>
                   </div>
                 </motion.div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

const EventDetails = ({ token }: { token: string | null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/events/${id}/seats`)
    ]).then(([evtData, seatsData]) => {
      setEvent(evtData);
      setSeats(seatsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const toggleSeat = (seatId: number, status: string) => {
    if (status !== 'available') return;
    setSelectedSeats(prev => 
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const handleBook = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setBooking(true);
    try {
      const totalPrice = selectedSeats.length * event.price;
      await api.post('/bookings', { event_id: event.id, seat_ids: selectedSeats, total_price: totalPrice }, token);
      alert('Booking Successful!');
      navigate('/bookings');
    } catch (e: any) {
      alert(`Booking failed: ${e.message}`);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="text-center py-32 text-gray-500">Loading details...</div>;
  if (!event) return <div className="text-center py-32 text-red-500">Event not found.</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-20">
      {/* Top Banner section */}
      <div className="bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
           <div className="w-full md:w-64 shrink-0 rounded-xl overflow-hidden shadow-2xl relative border border-gray-800">
             <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600&h=800'} alt={event.title} className="w-full h-[340px] object-cover" />
           </div>
           
           <div className="flex flex-col justify-center flex-1">
             <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{event.title}</h1>
             
             <div className="bg-[#333333] inline-flex items-center gap-4 px-4 py-3 rounded-lg mb-6 max-w-fit">
                <div className="flex items-center gap-1.5 text-lg font-semibold">
                   <Star size={20} className="text-[#F84464] fill-current" />
                   <span>4.8/5</span>
                </div>
                <div className="w-px h-6 bg-gray-600"></div>
                <div className="text-sm font-medium">Add your rating & review</div>
             </div>

             <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-lg inline-block text-sm">
                 <div className="flex items-center gap-2">
                   <Calendar size={18} className="text-[#F84464]" />
                   <span className="font-semibold">{event.date}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <MapPin size={18} className="text-[#F84464]" />
                   <span>{event.location}</span>
                 </div>
             </div>

             <div className="mt-auto pt-4 border-t border-gray-800 w-full flex items-center justify-between">
                <div className="text-2xl font-bold">
                   ₹{event.price}
                </div>
                <button
                  onClick={() => document.getElementById('seat-selector')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-3 rounded-lg font-bold text-white shadow-lg transform transition hover:scale-105"
                  style={{ backgroundColor: THEME.primary }}
                >
                  Book Tickets
                </button>
             </div>
           </div>
        </div>
      </div>

      {/* Seat Selection */}
      <div id="seat-selector" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold mb-8 text-gray-900 border-b pb-4">Select Seats</h2>
          
          <div className="w-full relative py-12">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-8 border-t-[8px] border-gray-200 rounded-t-[100%] shadow-[0_-15px_15px_-15px_rgba(0,0,0,0.1)]">
                 <p className="text-center text-xs text-gray-400 mt-2 uppercase tracking-widest font-semibold">Stage Or Screen This Way</p>
              </div>

              <div className="mt-16 bg-gray-50/50 p-8 rounded-xl border border-gray-100">
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-x-2 gap-y-3 justify-center">
                  {seats.map(seat => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const isBooked = seat.status === 'booked';
                    return (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeat(seat.id, seat.status)}
                        disabled={isBooked}
                        className={`
                          w-8 h-8 sm:w-10 sm:h-10 rounded border text-xs font-semibold flex items-center justify-center transition-all
                          ${isBooked ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' : ''}
                          ${!isBooked && !isSelected ? 'bg-white border-green-500 text-green-600 hover:bg-green-50 hover:scale-105' : ''}
                          ${isSelected ? 'bg-green-500 border-green-500 text-white shadow-md transform scale-110' : ''}
                        `}
                      >
                        {seat.seat_number}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-8 text-sm bg-gray-50 py-3 rounded border border-gray-100">
                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-white border border-green-500 rounded text-green-600 flex items-center justify-center text-[10px]">1</div> Available</div>
                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-500 border border-green-500 rounded text-white flex items-center justify-center text-[10px]">1</div> Selected</div>
                <div className="flex items-center gap-2"><div className="w-5 h-5 bg-gray-200 border border-gray-300 rounded text-gray-400 flex items-center justify-center text-[10px]">1</div> Sold</div>
              </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar for Booking Checkout */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 transform transition-transform">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <div>
                 <span className="text-gray-500 text-sm font-medium">Total Amount ({selectedSeats.length} Tickets)</span>
                 <div className="text-2xl font-bold text-gray-900">
                   ₹{(selectedSeats.length * event.price)}
                 </div>
              </div>
              <button
                onClick={handleBook}
                disabled={booking}
                className="px-10 py-3 rounded-lg font-bold text-white disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: THEME.primary }}
              >
                {booking ? 'Processing...' : 'Pay Amount & Book'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const Bookings = ({ token }: { token: string | null }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get('/bookings', token).then(data => {
      setBookings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  if (loading) return <div className="text-center py-32 text-gray-500">Loading your tickets...</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight mb-8 text-gray-900">Your Tickets</h1>
        
        {bookings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Looks empty here!</h2>
            <p className="text-gray-500 mb-6 text-sm">Grab tickets for your favorite movies and events.</p>
            <Link to="/" className="inline-flex py-2 px-6 text-white font-medium rounded shadow-sm transition-colors" style={{ backgroundColor: THEME.primary }}>
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map(b => (
              <div key={b.id} className="bg-white border rounded-xl overflow-hidden flex flex-col md:flex-row group transition-all shadow-sm hover:shadow-md">
                
                <div className="w-full md:w-32 bg-gray-100 shrink-0 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-dashed border-gray-300 relative">
                   <div className="text-center">
                     <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Booking ID</span>
                     <span className="font-mono font-bold text-lg text-gray-800">#{b.id.toString().padStart(5, '0')}</span>
                   </div>
                   {/* Ticket cutouts */}
                   <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F5F5] border-r border-gray-200 hidden md:block"></div>
                   <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F5F5] border-l border-gray-200 hidden md:block"></div>
                </div>

                <div className="flex-1 p-6 relative">
                   <div className="absolute top-6 right-6 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200">
                     <CheckCircle size={14} /> Confirmed
                   </div>

                  <h3 className="text-xl font-bold mb-4 pr-32 text-gray-900">{b.event_title}</h3>
                  <div className="flex justify-start items-center gap-8 mb-6 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1 font-semibold">Date & Time</div>
                      <div className="font-medium text-gray-900 flex items-center gap-1"><Calendar size={14}/> {b.event_date}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1 font-semibold">Venue</div>
                      <div className="font-medium text-gray-900 flex items-center gap-1"><MapPin size={14}/> {b.event_location}</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="text-xs uppercase font-bold text-gray-500 mb-3">Seats & QR ({b.tickets?.length || 0} Tickets)</div>
                    <div className="flex flex-wrap gap-4">
                      {b.tickets?.map((t: any) => (
                        <div key={t.id} className="flex flex-col items-center p-3 border rounded-lg bg-gray-50 relative group">
                          <div className="font-bold text-gray-800 border-b border-gray-200 w-full text-center pb-2 mb-2">
                            {t.seat_number}
                          </div>
                          {/* Pseudo QR */}
                          <div className="w-16 h-16 bg-gray-800 p-1 flex flex-wrap gap-0.5">
                             {Array.from({length: 16}).map((_, i) => <div key={i} className={`w-[3px] h-[3px] ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}></div>)}
                             <p className="text-[6px] text-white w-full text-center mt-1 truncate">{t.qr_code.substring(0,6)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ token }: { token: string | null }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('20');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    api.get('/admin/stats', token)
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, navigate]);

  const handleCreateEvent = async (e: any) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/events', { title, location, date, price: parseFloat(price), num_seats: parseInt(seats) }, token);
      alert('Event Created Successfully!');
      setTitle(''); setLocation(''); setDate(''); setPrice(''); setSeats('20');
      
      api.get('/admin/stats', token).then(setStats);
    } catch (err: any) {
      alert(`Error creating event: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!token) return null;
  if (loading) return <div className="text-center py-20 text-gray-500">Loading admin data...</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-blue-500">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Events</div>
            <div className="text-4xl font-bold text-gray-900">{stats?.events || 0}</div>
          </div>
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-green-500">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Bookings</div>
            <div className="text-4xl font-bold text-gray-900">{stats?.bookings || 0}</div>
          </div>
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-[#F84464]">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Revenue</div>
            <div className="text-4xl font-bold text-gray-900">₹{(stats?.revenue || 0)}</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm max-w-3xl">
          <h2 className="text-lg font-bold mb-6 pb-4 border-b">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. AI Conf 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. New York, NY" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price (₹)</label>
                <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="1499" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Seats (Max capacity)</label>
                <input type="number" required value={seats} onChange={e => setSeats(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="20" />
              </div>
            </div>
            <button type="submit" disabled={creating} className="w-full py-3 text-white font-semibold rounded bg-gray-900 hover:bg-black transition-colors mt-6">
              {creating ? 'Creating...' : 'Publish Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Auth = ({ setAuth }: { setAuth: (token: string, user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { name, email, password };
      const data = await api.post(endpoint, body);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">{isLogin ? 'Get Started' : 'Register'}</h2>
          <p className="text-gray-500 text-xs mt-1">Please enter your details to continue</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs mb-4 font-medium text-center border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="John Doe" />
            </div>
          )}
          <div>
             <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-2.5 text-white font-bold rounded text-sm transition-colors mt-2" style={{ backgroundColor: THEME.primary }}>
            {isLogin ? 'Continue' : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-600 mt-6 border-t pt-4">
          {isLogin ? "I agree to the Terms & Conditions and Privacy Policy." : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-black hover:underline cursor-pointer block w-full mt-2">
            {isLogin ? 'Create an account instead' : 'Login instead'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#333338] text-gray-400 text-sm mt-auto">
      <div className="bg-[#2B314B] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white font-semibold">
             <span>List your Show</span>
             <span className="text-gray-300 font-normal hidden lg:inline">Got a show, event, activity or a great experience? Partner with us & get listed on BookMyTix</span>
          </div>
          <button className="bg-[#F84464] text-white px-6 py-2 rounded font-semibold hover:bg-[#e03b5a] transition">Contact today!</button>
        </div>
      </div>
      
      <div className="bg-[#404043] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-around items-center text-center text-gray-300 gap-8">
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <Headphones size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">24/7 Customer Care</span>
           </div>
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <RefreshCcw size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Resend Booking Confirmation</span>
           </div>
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <Mail size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Subscribe to the Newsletter</span>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-16">
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">MOVIES NOW SHOWING</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Rata Shivaji</a> | <a href="#" className="hover:text-white transition-colors">The Devil Wears Prada 2</a> | <a href="#" className="hover:text-white transition-colors">Bhoothi Bangla</a> | <a href="#" className="hover:text-white transition-colors">Michael</a> | <a href="#" className="hover:text-white transition-colors">Mortal Kombat II</a> | <a href="#" className="hover:text-white transition-colors">Dhurandhar The Revenge</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">UPCOMING MOVIES PER WEEK</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Upcoming Movies Today</a> | <a href="#" className="hover:text-white transition-colors">Upcoming Movies Tomorrow</a> | <a href="#" className="hover:text-white transition-colors">Upcoming Movies This Weekend</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">MOVIES BY GENRE</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Drama Movies</a> | <a href="#" className="hover:text-white transition-colors">Comedy Movies</a> | <a href="#" className="hover:text-white transition-colors">Romantic Movies</a> | <a href="#" className="hover:text-white transition-colors">Action Movies</a> | <a href="#" className="hover:text-white transition-colors">Thriller Movies</a> | <a href="#" className="hover:text-white transition-colors">Mystery Movies</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">EVENTS IN TOP CITIES</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Events in Mumbai</a> | <a href="#" className="hover:text-white transition-colors">Events in Delhi-NCR</a> | <a href="#" className="hover:text-white transition-colors">Events in Chennai</a> | <a href="#" className="hover:text-white transition-colors">Events in Bengaluru</a> | <a href="#" className="hover:text-white transition-colors">Events in Hyderabad</a> | <a href="#" className="hover:text-white transition-colors">Events in Pune</a>
            </div>
         </div>
         <div className="pt-8 text-center text-xs border-t border-gray-700">
            <p>Copyright 2026 © Bigtree Entertainment Pvt. Ltd. All Rights Reserved.</p>
            <p className="mt-2 text-gray-600">The content and images used on this site are copyright protected and copyrights vests with the respective owners. The usage of the content and images on this website is intended to promote the works and no endorsement of the artist shall be implied. Unauthorized use is prohibited and punishable by law.</p>
         </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleSetAuth = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="font-sans text-gray-900 selection:bg-[#F84464]/20 selection:text-black flex flex-col min-h-screen">
        <Navbar token={token} user={user} onLogOut={handleLogOut} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events/:id" element={<EventDetails token={token} />} />
            <Route path="/bookings" element={<Bookings token={token} />} />
            <Route path="/admin" element={<AdminDashboard token={token} />} />
            <Route path="/login" element={<Auth setAuth={handleSetAuth} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
