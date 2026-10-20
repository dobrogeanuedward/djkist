// Section accents share the city's motion preference; the world owns the backdrop.
const targets=document.querySelectorAll<HTMLElement>('.frequency-sculpture,.session-stage,.event-viewer,.about-photo,.contact-orbits');
const watcher=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-visible',entry.isIntersecting)),{rootMargin:'80px'});
targets.forEach(element=>watcher.observe(element));
export {};
