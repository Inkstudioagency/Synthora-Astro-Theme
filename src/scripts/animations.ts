/**
 * Animation runtime: GSAP for the Webflow interactions, Lenis smooth scrolling and the
 * number counters (`data-counter`). This is the template's footer code, bundled.
 *
 * Webflow Interactions (IX3, inside public/js/webflow.js) read GSAP from `window.gsap`
 * once the DOM is ready. This module runs before DOMContentLoaded, so exposing GSAP here
 * keeps the template's load order (jQuery -> webflow.js -> GSAP -> plugins -> Lenis).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
Object.assign(window, { gsap, ScrollTrigger, SplitText });

// ---------- smooth scroll

const lenis = new Lenis({
  smoothWheel: true,
  lerp: 0.1,
  wheelMultiplier: 1,
  infinite: false,
});
function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ---------- counters: elements with data-counter count up from 0 when they scroll into view

window.Webflow ||= [];
window.Webflow.push(() => {
  // Keep ScrollTrigger in sync with Lenis smooth scroll
  lenis.on('scroll', ScrollTrigger.update);
  const pending: Array<{ counter: Element; started: boolean; start: () => void }> = [];
  document.querySelectorAll('[data-counter]').forEach((counter) => {
    const textEl = counter.firstElementChild || counter;
    const original = (textEl.textContent ?? '').trim();
    const match = original.match(/^([^0-9.-]*)([0-9.,-]+)(.*)$/);
    if (!match) return;
    const prefix = match[1];
    const number = match[2].replace(/,/g, '');
    const suffix = match[3];
    const target = parseFloat(number);
    if (Number.isNaN(target)) return;
    const hasDecimal = number.includes('.');
    const hasComma = original.includes(',');
    const value = { current: 0 };
    const render = () => {
      let formattedValue: string | number = hasDecimal ? value.current.toFixed(1) : Math.floor(value.current);
      if (hasComma && !hasDecimal) {
        formattedValue = Number(formattedValue).toLocaleString();
      }
      textEl.textContent = prefix + formattedValue + suffix;
    };
    const finish = () => {
      textEl.textContent = original;
    };
    const item = {
      counter,
      started: false,
      start: () => {
        if (item.started) return;
        item.started = true;
        gsap.to(value, {
          current: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: render,
          onComplete: finish,
        });
      },
    };
    // Already scrolled past this counter: show the real number, no animation
    if (counter.getBoundingClientRect().bottom < 0) return;
    // Start at 0 until the counter scrolls into view
    render();
    pending.push(item);
    // The trigger only starts the tween; refreshes can never reset it
    ScrollTrigger.create({
      trigger: counter,
      start: 'top 88%',
      onEnter: item.start,
      onEnterBack: item.start,
      onLeave: item.start,
    });
  });
  // Fallback: start any counter that is on (or above) the screen but was missed
  const check = () => {
    pending.forEach((item) => {
      if (!item.started && item.counter.getBoundingClientRect().top < window.innerHeight * 0.95) item.start();
    });
  };
  setInterval(check, 1500);
  // Recalculate trigger positions after lazy images and layout settle
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  document.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', refresh, { once: true });
  });
  setTimeout(refresh, 1500);
});
