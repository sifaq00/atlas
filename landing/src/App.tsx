import Hero from './components/Hero';
import MarqueeStrip from './components/MarqueeStrip';
import Features from './components/Features';
import BentoGrid from './components/BentoGrid';
import HowItWorks from './components/HowItWorks';
import CTA from './components/CTA';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <main>
        <Hero />
        <MarqueeStrip />
        <Features />
        <BentoGrid />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

export default App;
