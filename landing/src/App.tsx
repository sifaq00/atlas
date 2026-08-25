import Hero from './components/Hero';
import Navbar from './components/Navbar';
import TechStack from './components/TechStack';
import Features from './components/Features';
import BentoGrid from './components/BentoGrid';
import HowItWorks from './components/HowItWorks';
import CTA from './components/CTA';
import Footer from './components/Footer';
import ScrollReveal from './components/ScrollReveal';

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TechStack />
        <ScrollReveal direction="up" delay={0.1}>
          <Features />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.15}>
          <BentoGrid />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.1}>
          <HowItWorks />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.1}>
          <CTA />
        </ScrollReveal>
      </main>
      <Footer />
    </>
  );
}

export default App;
