import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './hooks/useTheme';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="bg-themed min-h-screen font-sans antialiased" style={{ color: 'var(--text-primary)' }}>
          {/* Skip to content — accessibility */}
          <a href="#about" className="skip-to-content">
            Skip to main content
          </a>

          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Routes>
        </div>
        <Analytics />
      </BrowserRouter>
    </ThemeProvider>
  );
}
