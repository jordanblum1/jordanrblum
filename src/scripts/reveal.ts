// Below-the-fold sections develop in as they enter the viewport, echoing the
// hero's page-develop-in. Elements opt in with data-reveal; siblings stagger
// via an inline --reveal-order. CSS keeps everything visible when JS is absent.
const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.classList.add('is-revealed');
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  elements.forEach((element) => observer.observe(element));
} else {
  elements.forEach((element) => element.classList.add('is-revealed'));
}
