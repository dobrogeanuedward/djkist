// Decorative accents pause outside the viewport; the arcade remains a separate local scene.
const targets=document.querySelectorAll<HTMLElement>('.frequency-sculpture,.session-stage,.event-viewer,.about-photo,.contact-orbits,.prismatic-title,.hero-listen,#diary');
const watcher=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-visible',entry.isIntersecting)),{rootMargin:'80px'});
targets.forEach(element=>watcher.observe(element));
export {};
