import type { Movie } from '../types';

const titlePool = [
  'Aarohan', 'Bhoomi 9', 'Chasing Shadows', 'Dance of Dust', 'Echoes of Jaipur', 'Flicker Point', 'Gulmohar Nights',
  'Horizon City', 'Inked Moonlight', 'Jalsaa', 'Kaal Vela', 'Lighthouse Road', 'Maya in Motion', 'Neon Chennai',
  'Open Sky', 'Pancham', 'Quarry of Dreams', 'Raga of Rain', 'Saffron Lane', 'Tale of the Tides', 'Udaan Heights',
  'Viraasat', 'Waves of Summer', 'Xenon', 'Yeh Kaisa Safar', 'Zara House', 'After the Rain', 'Beneath the Metro',
  'Cobalt Echo', 'Dhoom City', 'Eclipse Roads', 'Frosted Palm', 'Golden Hour', 'Haveli Lights', 'Inner Current',
  'Jungle Letters', 'Kites Over Pune', 'Last Lantern', 'Misterium', 'Night Market', 'Orbit of Love', 'Pavement Stories',
  'Queen of the Coast', 'Rainline', 'Skyline Parade', 'Tender Iron', 'Under the Banyan', 'Violet Station', 'Wanderlust',
  'Xtra Time', 'Year of Fire', 'Zonal Shift', 'Avenue of Stars', 'Backstage City', 'Cinder & Silk', 'Dawn in Delhi',
  'Evergreen Pulse', 'Firefly Express', 'Garden of Glass', 'Hills of Hyderabad', 'Iris in Bloom', 'Junction 14',
  'Karthik Returns', 'Laughter Lines', 'Midnight Biryani', 'Nagar Vibes', 'Oyster Dream', 'Pine & Pepper', 'Quiet Parade',
  'Riverlight', 'Shades of Kolkata', 'The Last Mile',
];

const cityPool = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur',
  'Ahmedabad', 'Kochi', 'Lucknow', 'Bhopal', 'Goa', 'Indore', 'Nagpur',
];

const CITY_OVERRIDES: Record<string, string> = {
  'Echoes of Jaipur': 'Jaipur',
  'Neon Chennai': 'Chennai',
  'Dawn in Delhi': 'Delhi',
  'Hills of Hyderabad': 'Hyderabad',
  'Kites Over Pune': 'Pune',
  'Shades of Kolkata': 'Kolkata',
  'Midnight Biryani': 'Hyderabad',
  'Dhoom City': 'Mumbai',
};

const genrePool = ['Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Sci-Fi', 'Family', 'Crime'];
const languagePool = ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

const LANGUAGE_OVERRIDES: Record<string, string> = {
  'Echoes of Jaipur': 'Hindi',
  'Neon Chennai': 'Tamil',
  'Dawn in Delhi': 'Hindi',
  'Hills of Hyderabad': 'Telugu',
  'Kites Over Pune': 'Marathi',
  'Shades of Kolkata': 'Bengali',
};

const directorPool = [
  'Ananya Rao', 'Rohan Mehta', 'Sanjay Dutta', 'Nivedita S.', 'Arun Bhatia', 'Mira Kapoor', 'Vikram Sood',
  'Pallavi Sen', 'Karthik Menon', 'Shalini Iyer', 'Nikhil Vyas', 'Zoya Qureshi', 'Harsha Dilip', 'Rajat Nair', 'Asha Dev',
];

const castPool = [
  ['Aditya Sharma', 'Meera Iyer', 'Raghav Nair'],
  ['Sanjana Rawat', 'Ishaan Khanna', 'Nimisha Varma'],
  ['Karan Bhatia', 'Aditi Rao', 'Pranav Menon'],
  ['Riya Malhotra', 'Aniket Das', 'Trisha Sethi'],
  ['Devansh Kapoor', 'Madhavi Rao', 'Vikram D'],
  ['Aarohi Singh', 'Siddhant Jain', 'Neha V'],
  ['Rohan K', 'Shreya N', 'Farhan K'],
  ['Pooja Anand', 'Rahul Verma', 'Ila D'],
  ['Aryan K', 'Radhika S', 'Jatin M'],
];

const posterPool = [
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516280030429-27679b7f7f6e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1485095329183-d0797cdc5676?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
];

const bannerPool = [
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
];

/**
 * Embed URLs for known titles — null means no trailer available (shows clean unavailable state).
 * All others get null so we don't show unrelated videos.
 */
const TRAILER_OVERRIDES: Record<string, string | null> = {
  'Aarohan': 'https://www.youtube.com/embed/ScMzIvxBSi4?rel=0&modestbranding=1',
  'Bhoomi 9': 'https://www.youtube.com/embed/uVdV-lxR7h8?rel=0&modestbranding=1',
  'Chasing Shadows': 'https://www.youtube.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1',
  'Dance of Dust': 'https://www.youtube.com/embed/9bZkp7q19f0?rel=0&modestbranding=1',
  'Echoes of Jaipur': 'https://www.youtube.com/embed/2Vv-BfVoq4g?rel=0&modestbranding=1',
};

const theatrePool = [
  ['Cinepolis Aura', 'INOX Nexus', 'PVR Sapphire'],
  ['PVR Icon', 'Cinepolis Metro', 'INOX High Street'],
  ['PVR Forum', 'INOX Central', 'Cinepolis Mall'],
  ['PVR Cinemas', 'INOX City', 'Cinepolis Downtown'],
  ['Cinepolis North', 'PVR Plaza', 'INOX Orbit'],
  ['PVR Downtown', 'Cinepolis Grand', 'INOX City'],
  ['INOX Galaxy', 'PVR Riverview', 'Cinepolis Prime'],
  ['PVR Avenue', 'INOX Vegas', 'Cinepolis Arc'],
  ['Cinepolis Lido', 'PVR 24x7', 'INOX One'],
];

const timingPool = [
  ['09:30 AM', '12:45 PM', '04:00 PM', '08:30 PM'],
  ['10:00 AM', '01:15 PM', '05:15 PM', '09:00 PM'],
  ['11:00 AM', '02:30 PM', '06:30 PM', '10:15 PM'],
  ['08:45 AM', '12:15 PM', '03:30 PM', '07:45 PM'],
  ['09:15 AM', '01:00 PM', '04:30 PM', '08:15 PM'],
];

const descriptionPool = [
  'A heartfelt drama that follows a family trying to rebuild its future after a life-changing loss.',
  'An edge-of-the-seat thriller about a group of friends drawn into a dangerous conspiracy.',
  'A charming romance set against the vibrant energy of a fast-growing city.',
  'A high-energy comedy that turns an ordinary day into a series of unexpected adventures.',
  'A gripping crime saga that explores ambition, loyalty, and betrayal.',
  'An inspiring story about resilience, art, and finding your voice.',
  'A pulse-pounding action film filled with twists, stunts, and emotional stakes.',
];

/** Numeric ratings seeded deterministically per index (3.5–4.9) */
function seedRating(index: number): number {
  const base = 3.5 + (((index * 37 + 13) % 15) / 10);
  return Math.round(base * 10) / 10;
}

export const movies: Movie[] = titlePool.map((title, index) => ({
  id: `movie-${index + 1}`,
  title,
  city: CITY_OVERRIDES[title] ?? cityPool[index % cityPool.length],
  genre: genrePool[index % genrePool.length],
  language: LANGUAGE_OVERRIDES[title] ?? languagePool[index % languagePool.length],
  duration: ['2h 08m', '2h 18m', '2h 24m', '2h 31m', '2h 42m', '2h 49m', '2h 56m'][index % 7],
  certificate: ['U', 'UA', 'A', 'PG-13'][index % 4],
  rating: seedRating(index),
  director: directorPool[index % directorPool.length],
  cast: castPool[index % castPool.length],
  description: descriptionPool[index % descriptionPool.length],
  poster: posterPool[index % posterPool.length],
  banner: bannerPool[index % bannerPool.length],
  trailer: title in TRAILER_OVERRIDES ? TRAILER_OVERRIDES[title] : null,
  availableTheatres: theatrePool[index % theatrePool.length],
  showTimings: timingPool[index % timingPool.length],
  formats: ['2D', '3D', 'IMAX'][index % 3] === '3D' ? ['2D', '3D'] : ['2D', 'IMAX'],
}));
