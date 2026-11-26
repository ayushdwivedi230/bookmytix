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
import { CinemasPage } from './pages/CinemasPage';
import { OffersPage } from './pages/OffersPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { TicketVerificationPage } from './pages/TicketVerificationPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SupportPage } from './pages/SupportPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AiAssistantModal } from './components/ai/AiAssistantModal';

function AppShell() {
  const [selectedCity, setSelectedCity] = useState<string>(
    () => localStorage.getItem('selectedCity') || 'Mumbai',
  );

  return (
    <div className="dark bg-[#08090D] text-slate-100 font-sans selection:bg-[#F84464]/30 selection:text-white flex flex-col min-h-screen">
      <Navbar selectedCity={selectedCity} setSelectedCity={setSelectedCity} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage selectedCity={selectedCity} />} />
          <Route path="/search" element={<SearchResultsPage selectedCity={selectedCity} />} />
          <Route path="/movies" element={<MoviesPage selectedCity={selectedCity} />} />
          <Route path="/movies/:id" element={<MovieDetailsPage selectedCity={selectedCity} />} />
          <Route path="/cinemas" element={<CinemasPage selectedCity={selectedCity} />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<DashboardPage />} />
          <Route path="/bookings" element={<DashboardPage />} />
          <Route path="/my-bookings" element={<DashboardPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-ticket" element={<TicketVerificationPage />} />
          <Route path="/scan" element={<TicketVerificationPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      <AiAssistantModal />
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
