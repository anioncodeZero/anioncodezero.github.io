// ============================================================
// VANILLA JAVASCRIPT - PORTFOLIO ANDIKA HARSEL
// Fitur: Loading Screen, Sticky Nav, Scroll Progress, 
//        Particle Canvas, Typing Effect, Reveal Animation,
//        Counter Animation, Mobile Nav, Ripple Effect,
//        Smooth Scroll, Active Menu, Back to Top
// ============================================================

(function() {
  'use strict';

  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const loadingScreen = document.getElementById('loading-screen');
  const navbar = document.getElementById('navbar');
  const scrollProgress = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const navToggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  const typedTextElement = document.getElementById('typed-text');
  const contactForm = document.getElementById('contact-form');
  const downloadCvBtn = document.getElementById('download-cv');
  const particleCanvas = document.getElementById('particle-canvas');

  // ============================================================
  // 1. LOADING SCREEN
  // ============================================================
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 600);
  });

  // ============================================================
  // 2. STICKY NAVBAR
  // ============================================================
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    
    // Sticky navbar background
    if (scrollTop > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Scroll progress bar
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    if (scrollProgress) {
      scrollProgress.style.width = scrollPercent + '%';
    }
    
    // Back to top button visibility
    if (scrollTop > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
    
    // Active nav link
    updateActiveNavLink();
  });

  // ============================================================
  // 3. BACK TO TOP
  // ============================================================
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============================================================
  // 4. ACTIVE NAV LINK UPDATER
  // ============================================================
  function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  // ============================================================
  // 5. MOBILE NAVIGATION
  // ============================================================
  navToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
    const expanded = navList.classList.contains('active');
    navToggle.setAttribute('aria-expanded', expanded);
  });
  
  // Close mobile menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navList.classList.remove('active');
      navToggle.setAttribute('aria-expanded', false);
    });
  });
  
  // Close mobile menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('active')) {
      navList.classList.remove('active');
      navToggle.setAttribute('aria-expanded', false);
      navToggle.focus();
    }
  });

  // ============================================================
  // 6. SCROLL REVEAL ANIMATION
  // ============================================================
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  
  revealElements.forEach(el => revealObserver.observe(el));

  // ============================================================
  // 7. COUNTER ANIMATION
  // ============================================================
  const statNumbers = document.querySelectorAll('.stat-number');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const targetValue = parseInt(target.getAttribute('data-target'));
        const duration = 1500;
        const step = targetValue / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
          current += step;
          if (current < targetValue) {
            target.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
          } else {
            target.textContent = targetValue;
          }
        };
        updateCounter();
        counterObserver.unobserve(target);
      }
    });
  }, { threshold: 0.5 });
  
  statNumbers.forEach(num => counterObserver.observe(num));

  // ============================================================
  // 8. TYPING EFFECT
  // ============================================================
  const roles = [
    'Web Developer',
    'Python Developer',
    'Cyber Security Enthusiast',
    'Software Developer'
  ];
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;
  
  function typeEffect() {
    if (!typedTextElement) return;
    
    const currentRole = roles[roleIndex];
    
    if (isDeleting) {
      typedTextElement.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 50;
    } else {
      typedTextElement.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 120;
    }
    
    if (!isDeleting && charIndex === currentRole.length) {
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typeSpeed = 500; // Pause before next word
    }
    
    setTimeout(typeEffect, typeSpeed);
  }
  
  // Start typing effect after a short delay
  setTimeout(typeEffect, 1000);

  // ============================================================
  // 9. PARTICLE CANVAS
  // ============================================================
  if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    let animationFrame;
    
    function resizeCanvas() {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });
    
    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * particleCanvas.width;
        this.y = Math.random() * particleCanvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.4 + 0.1;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > particleCanvas.width || 
            this.y < 0 || this.y > particleCanvas.height) {
          this.reset();
        }
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96, 165, 250, ${this.opacity})`;
        ctx.fill();
      }
    }
    
    function initParticles() {
      const particleCount = Math.min(80, Math.floor(particleCanvas.width * 0.08));
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }
    
    function connectParticles() {
      const maxDistance = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.12})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    }
    
    function animateParticles() {
      ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      connectParticles();
      animationFrame = requestAnimationFrame(animateParticles);
    }
    
    resizeCanvas();
    initParticles();
    animateParticles();
  }

  // ============================================================
  // 10. SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================================
  // 11. CONTACT FORM HANDLING
  // ============================================================
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      
      if (name && email && message) {
        // Simulasi pengiriman (dalam production, ganti dengan endpoint sebenarnya)
        alert(`Terima kasih ${name}! Pesan Anda telah diterima. Saya akan menghubungi Anda segera melalui ${email}.`);
        contactForm.reset();
      } else {
        alert('Mohon isi semua bidang yang wajib diisi (Nama, Email, Pesan).');
      }
    });
  }

  // ============================================================
  // 12. RIPPLE EFFECT
  // ============================================================
  document.addEventListener('click', function(e) {
    const rippleTarget = e.target.closest('.ripple');
    if (!rippleTarget) return;
    
    // Hapus ripple sebelumnya
    const existingRipple = rippleTarget.querySelector('.ripple-effect');
    if (existingRipple) existingRipple.remove();
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    
    const rect = rippleTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    
    rippleTarget.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  });

  // ============================================================
  // 13. DOWNLOAD CV PLACEHOLDER
  // ============================================================
  if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Fitur Download CV akan segera tersedia. Silakan hubungi saya langsung untuk mendapatkan CV terbaru.');
    });
  }

  // ============================================================
  // 14. LAZY LOADING FALLBACK
  // ============================================================
  if ('loading' in HTMLImageElement.prototype) {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(img => {
      img.src = img.dataset.src || img.src;
    });
  }

  // ============================================================
  // LOG
  // ============================================================
  console.log('%c✨ Portfolio Andika Harsel %cSiap! %c🚀', 
    'color: #60A5FA; font-weight: bold;', 
    'color: #F8FAFC;', 
    'font-size: 1.2em;');
  console.log('%cDibangun dengan HTML, CSS, dan Vanilla JavaScript.', 'color: #94A3B8;');

})();