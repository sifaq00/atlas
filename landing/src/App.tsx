import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import TechStack from './components/TechStack';
import Features from './components/Features';
import BentoGrid from './components/BentoGrid';
import HowItWorks from './components/HowItWorks';
import CTA from './components/CTA';
import Footer from './components/Footer';
import ScrollReveal from './components/ScrollReveal';
import { AtlasApp } from './viewer/AtlasApp';

function getIsAppRoute(): boolean {
  const path = window.location.pathname;
  const hash = window.location.hash;
  return path.startsWith('/app') || hash === '#app' || window.location.search.includes('repo=');
}

function App() {
  const [isAppView, setIsAppView] = useState<boolean>(getIsAppRoute());

  useEffect(() => {
    const handlePopState = () => {
      setIsAppView(getIsAppRoute());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToApp = (repo?: string) => {
    const targetUrl = repo ? `/app?repo=${encodeURIComponent(repo)}` : '/app';
    window.history.pushState({}, '', targetUrl);
    setIsAppView(true);
    window.scrollTo(0, 0);
  };

  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setIsAppView(false);
    window.scrollTo(0, 0);
  };

  if (isAppView) {
    return <AtlasApp onBackToLanding={navigateToLanding} />;
  }

  return (
    <>
      <Navbar onOpenApp={() => navigateToApp()} />
      <main>
        <Hero onOpenApp={() => navigateToApp()} />
        <TechStack />
        <ScrollReveal direction="up" delay={0.1}>
          <Features onOpenApp={() => navigateToApp()} />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.15}>
          <BentoGrid onOpenApp={() => navigateToApp()} />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.1}>
          <HowItWorks />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.1}>
          <CTA onOpenApp={() => navigateToApp()} />
        </ScrollReveal>
      </main>
      <Footer onOpenApp={() => navigateToApp()} />
    </>
  );
}

export default App;
