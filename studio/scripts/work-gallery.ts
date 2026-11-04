export function initWorkGallery(root: ParentNode = document): void {
  const gallery = root.querySelector<HTMLElement>('[data-work-gallery]');
  if (!gallery || gallery.dataset.enhanced) return;
  const collections = [...gallery.querySelectorAll<HTMLElement>('[data-work-collection]')];
  const filters = [...gallery.querySelectorAll<HTMLButtonElement>('[data-work-category]')];
  const previous = gallery.querySelector<HTMLButtonElement>('[data-work-previous]');
  const next = gallery.querySelector<HTMLButtonElement>('[data-work-next]');
  const position = gallery.querySelector<HTMLElement>('[data-work-position]');
  const controls = gallery.querySelector<HTMLElement>('[data-work-pagination]');
  const categories = gallery.querySelector<HTMLElement>('[data-work-filters]');
  const rails = collections.map(collection => collection.querySelector<HTMLElement>('[data-work-rail]'));
  if (!collections.length || rails.some(rail => !rail) || !previous || !next || !position || !controls || !categories) return;
  let selected = 0;
  const activeRail = (): HTMLElement => rails[selected]!;
  const examples = (): HTMLElement[] => [...activeRail().querySelectorAll<HTMLElement>('[data-work-example]')];
  const currentItem = (): number => {
    const rail = activeRail();
    const padding = Number.parseFloat(getComputedStyle(rail).paddingLeft);
    const target = rail.getBoundingClientRect().left + padding;
    const distances = examples().map(example => Math.abs(example.getBoundingClientRect().left - target));
    return distances.indexOf(Math.min(...distances));
  };
  const updateControls = (): void => {
    const rail = activeRail();
    const items = examples();
    const item = currentItem();
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    previous.disabled = rail.scrollLeft <= 2;
    next.disabled = atEnd;
    const edge = rail.getBoundingClientRect().right;
    const lastVisible = items.findLastIndex(example => {
      const bounds = example.getBoundingClientRect();
      return bounds.left + bounds.width / 2 <= edge;
    });
    const range = lastVisible > item ? `${item + 1}–${lastVisible + 1}` : String(item + 1);
    const label = `${collections[selected].getAttribute('aria-label')} · ${range} of ${items.length}`;
    if (position.textContent !== label) position.textContent = label;
  };
  const navigate = (direction: number): void => {
    const rail = activeRail();
    const items = examples();
    const item = Math.max(0, Math.min(items.length - 1, currentItem() + direction));
    const padding = Number.parseFloat(getComputedStyle(rail).paddingLeft);
    rail.scrollBy({ left: items[item].getBoundingClientRect().left - rail.getBoundingClientRect().left - padding, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  filters.forEach((filter, index) => filter.addEventListener('click', () => {
    selected = index;
    collections.forEach((collection, collectionIndex) => { collection.hidden = collectionIndex !== selected; });
    filters.forEach((button, filterIndex) => button.setAttribute('aria-pressed', String(filterIndex === selected)));
    activeRail().scrollTo({ left: 0, behavior: 'instant' });
    updateControls();
  }));
  rails.forEach(rail => {
    rail?.addEventListener('scroll', updateControls, { passive: true });
    rail?.addEventListener('keydown', event => {
      if (event.target !== rail || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home' || event.key === 'End') {
        rail.scrollTo({ left: event.key === 'Home' ? 0 : rail.scrollWidth, behavior: 'instant' });
      } else navigate(event.key === 'ArrowLeft' ? -1 : 1);
    });
  });
  previous.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  window.addEventListener('resize', updateControls);
  gallery.dataset.enhanced = 'true';
  categories.hidden = false;
  controls.hidden = false;
  collections.forEach((collection, index) => { collection.hidden = index !== selected; });
  updateControls();
}
