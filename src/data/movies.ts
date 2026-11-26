import type { Movie } from '../types';

const titlePool = [
  'Pushpa 2', 'Kalki 2898 AD', 'Stree 2', 'Aarohan', 'Bhoomi 9', 'Chasing Shadows', 'Dance of Dust', 'Echoes of Jaipur',
  'Flicker Point', 'Gulmohar Nights', 'Horizon City', 'Inked Moonlight', 'Jalsaa', 'Kaal Vela', 'Lighthouse Road',
  'Maya in Motion', 'Neon Chennai', 'Open Sky', 'Pancham', 'Quarry of Dreams', 'Raga of Rain', 'Saffron Lane',
  'Tale of the Tides', 'Udaan Heights', 'Viraasat', 'Waves of Summer', 'Xenon', 'Yeh Kaisa Safar', 'Zara House',
  'After the Rain', 'Beneath the Metro', 'Cobalt Echo', 'Dhoom City', 'Eclipse Roads', 'Frosted Palm', 'Golden Hour',
  'Haveli Lights', 'Inner Current', 'Jungle Letters', 'Kites Over Pune', 'Last Lantern', 'Misterium', 'Night Market',
  'Orbit of Love', 'Pavement Stories', 'Queen of the Coast', 'Rainline', 'Skyline Parade', 'Tender Iron',
  'Under the Banyan', 'Violet Station', 'Wanderlust', 'Xtra Time', 'Year of Fire', 'Zonal Shift', 'Avenue of Stars',
  'Backstage City', 'Cinder & Silk', 'Dawn in Delhi', 'Evergreen Pulse', 'Firefly Express', 'Garden of Glass',
  'Hills of Hyderabad', 'Iris in Bloom', 'Junction 14', 'Karthik Returns', 'Laughter Lines', 'Midnight Biryani',
  'Nagar Vibes', 'Oyster Dream', 'Pine & Pepper', 'Quiet Parade', 'Riverlight', 'Shades of Kolkata', 'The Last Mile',
];

const cityPool = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur',
  'Ahmedabad', 'Kochi', 'Lucknow', 'Bhopal', 'Goa', 'Indore', 'Nagpur',
];

const CITY_OVERRIDES: Record<string, string> = {
  'Pushpa 2': 'Hyderabad',
  'Kalki 2898 AD': 'Mumbai',
  'Stree 2': 'Delhi',
  'Echoes of Jaipur': 'Jaipur',
  'Neon Chennai': 'Chennai',
  'Dawn in Delhi': 'Delhi',
  'Hills of Hyderabad': 'Hyderabad',
  'Kites Over Pune': 'Pune',
  'Shades of Kolkata': 'Kolkata',
  'Midnight Biryani': 'Hyderabad',
  'Dhoom City': 'Mumbai',
};

const genrePool = ['Action', 'Sci-Fi', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Family', 'Crime'];
const languagePool = ['Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

const GENRE_OVERRIDES: Record<string, string> = {
  'Pushpa 2': 'Action',
  'Kalki 2898 AD': 'Sci-Fi',
  'Stree 2': 'Comedy',
  'Aarohan': 'Drama',
  'Bhoomi 9': 'Thriller',
  'Chasing Shadows': 'Crime',
  'Dance of Dust': 'Romance',
  'Echoes of Jaipur': 'Drama',
};

const LANGUAGE_OVERRIDES: Record<string, string> = {
  'Pushpa 2': 'Telugu',
  'Kalki 2898 AD': 'Telugu',
  'Stree 2': 'Hindi',
  'Echoes of Jaipur': 'Hindi',
  'Neon Chennai': 'Tamil',
  'Dawn in Delhi': 'Hindi',
  'Hills of Hyderabad': 'Telugu',
  'Kites Over Pune': 'Marathi',
  'Shades of Kolkata': 'Bengali',
};

const directorPool = [
  'Sukumar', 'Nag Ashwin', 'Amar Kaushik', 'Ananya Rao', 'Rohan Mehta', 'Sanjay Dutta', 'Nivedita S.',
  'Arun Bhatia', 'Mira Kapoor', 'Vikram Sood', 'Pallavi Sen', 'Karthik Menon', 'Shalini Iyer', 'Nikhil Vyas',
];

const castPool = [
  ['Allu Arjun', 'Rashmika Mandanna', 'Fahadh Faasil'],
  ['Prabhas', 'Amitabh Bachchan', 'Deepika Padukone', 'Kamal Haasan'],
  ['Shraddha Kapoor', 'Rajkummar Rao', 'Pankaj Tripathi'],
  ['Aditya Sharma', 'Meera Iyer', 'Raghav Nair'],
  ['Sanjana Rawat', 'Ishaan Khanna', 'Nimisha Varma'],
  ['Karan Bhatia', 'Aditi Rao', 'Pranav Menon'],
  ['Riya Malhotra', 'Aniket Das', 'Trisha Sethi'],
  ['Devansh Kapoor', 'Madhavi Rao', 'Vikram D'],
];

const posterPool = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800&h=600',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800&h=600',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800&h=600',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516280030429-27679b7f7f6e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1485095329183-d0797cdc5676?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=80',
];

const bannerPool = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80',
];

/**
 * Embed URLs for verified trailers — provides clean YouTube embed previews.
 */
const TRAILER_OVERRIDES: Record<string, string | null> = {
  'Pushpa 2': 'https://www.youtube.com/embed/1kVK0MZlbI4?rel=0&modestbranding=1',
  'Kalki 2898 AD': 'https://www.youtube.com/embed/kQDd1AhGIHk?rel=0&modestbranding=1',
  'Stree 2': 'https://www.youtube.com/embed/KVnheGhrRAw?rel=0&modestbranding=1',
  'Aarohan': 'https://www.youtube.com/embed/ScMzIvxBSi4?rel=0&modestbranding=1',
  'Bhoomi 9': 'https://www.youtube.com/embed/uVdV-lxR7h8?rel=0&modestbranding=1',
  'Chasing Shadows': 'https://www.youtube.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1',
  'Dance of Dust': 'https://www.youtube.com/embed/9bZkp7q19f0?rel=0&modestbranding=1',
  'Echoes of Jaipur': 'https://www.youtube.com/embed/2Vv-BfVoq4g?rel=0&modestbranding=1',
};

const theatrePool = [
  ['PVR Hyderabad', 'Cinepolis Hitec City', 'INOX Gachibowli'],
  ['PVR Jio World', 'INOX Andheri', 'Cinepolis Infinity'],
  ['PVR Plaza', 'INOX City Centre', 'Cinepolis Chanakyapuri'],
  ['PVR Icon', 'Cinepolis Skywalk', 'INOX Wadala'],
  ['PVR Saket', 'INOX DLF', 'Cinepolis Gurugram'],
  ['PVR Orion', 'INOX NEXUS', 'Cinepolis Mantri'],
  ['PVR Phoenix', 'INOX Westend', 'Cinepolis Vimannagar'],
  ['PVR Pink City', 'INOX World Trade Park', 'Cinepolis Mansarovar'],
];

const timingPool = [
  ['10:00 AM', '01:30 PM', '05:30 PM', '09:00 PM'],
  ['11:00 AM', '02:30 PM', '06:15 PM', '09:45 PM'],
  ['10:30 AM', '01:45 PM', '05:00 PM', '08:45 PM'],
  ['12:00 PM', '03:30 PM', '07:00 PM', '10:15 PM'],
  ['09:30 AM', '12:45 PM', '04:00 PM', '08:30 PM'],
];

const descriptionPool = [
  'A high-octane spectacle with intense action sequences, dramatic story beats, and premium sound design.',
  'An immersive sci-fi spectacle with grand world-building and groundbreaking visual effects.',
  'A laugh-out-loud horror-comedy packed with thrills, memorable characters, and big screen energy.',
  'A heartfelt drama that follows a family trying to rebuild its future after a life-changing event.',
  'An edge-of-the-seat thriller about a group drawn into a dangerous, unexpected conspiracy.',
  'A charming romance set against the vibrant energy of a fast-growing metropolitan city.',
  'A pulse-pounding action film filled with twists, stunts, and emotional stakes.',
];

function seedRating(index: number): number {
  const base = 4.0 + (((index * 37 + 13) % 10) / 10);
  return Math.round(base * 10) / 10;
}

export const movies: Movie[] = titlePool.map((title, index) => ({
  id: `movie-${index + 1}`,
  title,
  city: CITY_OVERRIDES[title] ?? cityPool[index % cityPool.length],
  genre: GENRE_OVERRIDES[title] ?? genrePool[index % genrePool.length],
  language: LANGUAGE_OVERRIDES[title] ?? languagePool[index % languagePool.length],
  duration: ['2h 08m', '2h 18m', '2h 24m', '2h 31m', '2h 42m', '2h 49m', '2h 56m'][index % 7],
  certificate: ['U', 'UA', 'A', 'PG-13'][index % 4],
  rating: seedRating(index),
  votes: 12000 + ((index * 3821) % 45000),
  releaseDate: new Date(Date.now() - index * 86400000 * 3).toISOString().slice(0, 10),
  director: directorPool[index % directorPool.length],
  cast: castPool[index % castPool.length],
  description: descriptionPool[index % descriptionPool.length],
  poster: posterPool[index % posterPool.length],
  banner: bannerPool[index % bannerPool.length],
  trailer: TRAILER_OVERRIDES[title] ?? null,
  availableTheatres: theatrePool[index % theatrePool.length],
  showTimings: timingPool[index % timingPool.length],
  formats: ['2D', '3D', 'IMAX'][index % 3] === '3D' ? ['2D', '3D'] : ['2D', 'IMAX'],
}));
