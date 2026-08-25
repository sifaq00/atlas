import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import Lenis from 'lenis'

export const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  prevent: (node) => {
    // Prevent Lenis from hijacking wheel events inside sidebars, inspector, canvas, or anything marked with data-lenis-prevent
    return (
      node.hasAttribute('data-lenis-prevent') ||
      !!node.closest('[data-lenis-prevent]') ||
      !!node.closest('aside') ||
      !!node.closest('canvas') ||
      !!node.closest('.no-scrollbar')
    );
  },
})

function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
