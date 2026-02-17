/* ========================================
   Jordan Blum — Main JavaScript V2
   No dependencies, vanilla ES6+
   Enhanced animations & interactions
   ======================================== */

(function() {
  'use strict';

  // --- Nav scroll effect ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  }, { passive: true });

  // --- Smooth scroll for nav links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Advanced scroll reveal with stagger ---
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Add a slight random stagger for more organic feel
        const delay = Math.random() * 100;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with data-animate
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

  // --- Parallax effects ---
  const hero = document.querySelector('.hero');
  const heroGradient = document.querySelector('.hero-gradient');
  
  if (hero) {
    window.addEventListener('scroll', () => {
      const scroll = window.scrollY;
      const windowHeight = window.innerHeight;
      
      if (scroll < windowHeight * 1.2) {
        // Parallax on hero background
        hero.style.backgroundPositionY = `${scroll * 0.5}px`;
        
        // Subtle parallax on gradient overlay
        if (heroGradient) {
          heroGradient.style.transform = `translateY(${scroll * 0.15}px)`;
        }
      }
    }, { passive: true });
  }

  // --- Gallery lightbox with keyboard navigation ---
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  let currentIndex = -1;

  function openLightbox(index) {
    const item = galleryItems[index];
    const img = item.querySelector('img');
    
    if (img) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
      currentIndex = index;
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    currentIndex = -1;
  }

  function nextImage() {
    if (currentIndex < galleryItems.length - 1) {
      openLightbox(currentIndex + 1);
    }
  }

  function prevImage() {
    if (currentIndex > 0) {
      openLightbox(currentIndex - 1);
    }
  }

  // Click on gallery items
  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index));
  });

  // Close lightbox
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('active')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    }
  });

  // --- Smooth hover animations on timeline cards ---
  const timelineCards = document.querySelectorAll('.timeline-card');
  
  timelineCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  });

  // --- Add subtle tilt effect to contact links ---
  const contactLinks = document.querySelectorAll('.contact-link');
  
  contactLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
      const arrow = this.querySelector('.contact-link-arrow');
      if (arrow) {
        arrow.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
    });
  });

  // --- Smooth scroll progress indicator (optional, subtle) ---
  function updateScrollProgress() {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    // Could add a progress bar here if desired
    // For now, just tracking for potential use
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // --- Performance: Pause animations when not in view ---
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (reducedMotionQuery.matches) {
    // Disable animations for users who prefer reduced motion
    document.documentElement.style.setProperty('--animation-duration', '0.01s');
  }

  // --- Initialize: trigger animations for elements already in view ---
  const triggerInitialAnimations = () => {
    const elementsInView = document.querySelectorAll('[data-animate]');
    elementsInView.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.8) {
        el.classList.add('visible');
      }
    });
  };

  // Run on load
  window.addEventListener('load', () => {
    triggerInitialAnimations();
    
    // Add loaded class to body for any CSS transitions
    document.body.classList.add('loaded');
  });

  // --- Utility: smooth reveal for gallery items with intersection observer ---
  const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'scale(1)';
        galleryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'scale(0.95)';
    item.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    galleryObserver.observe(item);
    
    // Add subtle tilt on hover based on cursor position
    item.addEventListener('mousemove', (e) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -3;
      const rotateY = (x - centerX) / centerX * 3;
      
      item.style.transform = `scale(1.05) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'scale(1) perspective(1000px) rotateX(0) rotateY(0)';
    });
  });

  // --- Typing effect for hero tagline ---
  const typedTextElement = document.querySelector('.typed-text');
  
  if (typedTextElement) {
    const phrases = [
      'Product Engineer',
      'Photographer',
      'Artist',
      'Builder'
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function typeEffect() {
      const currentPhrase = phrases[phraseIndex];
      
      if (isDeleting) {
        typedTextElement.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
      } else {
        typedTextElement.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
      }
      
      if (!isDeleting && charIndex === currentPhrase.length) {
        // Pause at end of phrase
        typingSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 500;
      }
      
      setTimeout(typeEffect, typingSpeed);
    }
    
    // Start typing effect after page loads
    setTimeout(typeEffect, 1000);
  }

  // --- Marquee word highlight animation ---
  const marqueeWords = document.querySelectorAll('.marquee-track span');
  
  if (marqueeWords.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      const randomWord = marqueeWords[Math.floor(Math.random() * marqueeWords.length)];
      if (randomWord && !randomWord.textContent.includes('·')) {
        randomWord.style.color = '#F1BE49';
        setTimeout(() => {
          randomWord.style.color = '#FFFBEB';
        }, 800);
      }
    }, 2500);
  }

  // --- About section detail value animations (counter reveal) ---
  const detailValues = document.querySelectorAll('.detail-value');
  const detailObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) both';
        detailObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  detailValues.forEach((value, index) => {
    value.style.opacity = '0';
    value.style.animationDelay = `${index * 0.15}s`;
    detailObserver.observe(value);
  });

  // --- Enhanced scroll indicator pulse ---
  const scrollIndicator = document.querySelector('.hero-scroll');
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      const opacity = 1 - (window.scrollY / 500);
      scrollIndicator.style.opacity = Math.max(0, opacity);
    }, { passive: true });
  }

  // --- Console easter egg ---
  console.log('%c👋 Hey there!', 'font-size: 24px; font-weight: bold; color: #317039;');
  console.log('%cLike what you see? Let\'s build something together.', 'font-size: 14px; color: #F1BE49;');
  console.log('%c📧 jordanblum19@gmail.com', 'font-size: 12px; color: #888;');

})();
