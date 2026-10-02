import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { MoviesPage } from './pages/MoviesPage';
import { MovieDetailsPage } from './pages/MovieDetailsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { BookingsPage } from './pages/BookingsPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';

function AppShell() {
  const [selectedCity, setSelectedCity] = useState<string>(
    () => localStorage.getItem('selectedCity') || '',
  );

  return (
    <div className="font-sans text-slate-900 selection:bg-[#F84464]/20 flex flex-col min-h-screen">
      <Navbar selectedCity={selectedCity} setSelectedCity={setSelectedCity} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage selectedCity={selectedCity} />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/:id" element={<MovieDetailsPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
