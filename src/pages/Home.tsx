import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';

const Stats = lazy(() => import('../components/Stats'));
const About = lazy(() => import('../components/About'));
const Projects = lazy(() => import('../components/Projects'));
const FeaturedArticle = lazy(() => import('../components/FeaturedArticle'));
const Experience = lazy(() => import('../components/Experience'));
const Skills = lazy(() => import('../components/Skills'));
const Blog = lazy(() => import('../components/Blog'));
const Contact = lazy(() => import('../components/Contact'));
const Footer = lazy(() => import('../components/Footer'));

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    if (state?.scrollTo) {
      setTimeout(() => {
        document.getElementById(state.scrollTo!)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <Stats />
        <About />
        <Projects />
        <FeaturedArticle />
        <Experience />
        <Skills />
        <Blog />
        <Contact />
        <Footer />
      </Suspense>
    </>
  );
}
