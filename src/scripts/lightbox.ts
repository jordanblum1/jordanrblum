const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
if (dialog) {
  const img = dialog.querySelector<HTMLImageElement>('.lb-img')!;
  const caption = dialog.querySelector<HTMLElement>('.lb-caption')!;
  const frames = [...document.querySelectorAll<HTMLAnchorElement>('.sheet-frame')];
  let idx = 0;
  const show = (i: number) => {
    idx = (i + frames.length) % frames.length;
    img.src = frames[idx].dataset.full!;
    img.alt = frames[idx].dataset.alt!;
    caption.textContent = frames[idx].dataset.caption ?? frames[idx].dataset.alt!;
  };
  frames.forEach((f, i) => f.addEventListener('click', (event) => {
    event.preventDefault();
    show(i);
    dialog.showModal();
  }));
  dialog.querySelector('.lb-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
}
