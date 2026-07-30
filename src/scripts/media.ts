// Shared capability gates for interactive scripts, so every surface agrees on
// what "has a real cursor" means (hover AND fine pointer — a stylus or a
// trackpad-less touch laptop should get the touch behaviors).
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
