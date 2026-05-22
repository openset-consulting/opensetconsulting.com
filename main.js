(function () {
  'use strict';

  // ---------- Mobile menu toggle ----------
  const menuBtn = document.getElementById('menu-btn');
  const primaryNav = document.getElementById('primary-nav');
  if (menuBtn && primaryNav) {
    menuBtn.addEventListener('click', function () {
      const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!isOpen));
      menuBtn.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
      menuBtn.textContent = isOpen ? 'MENU' : 'CLOSE';
      if (isOpen) {
        primaryNav.removeAttribute('data-open');
      } else {
        primaryNav.setAttribute('data-open', 'true');
      }
    });

    // Close menu on link click (mobile)
    primaryNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (menuBtn.getAttribute('aria-expanded') === 'true') {
          menuBtn.click();
        }
      });
    });
  }

  // ---------- Scroll spy: highlight current section in nav ----------
  const navLinks = document.querySelectorAll('.navlinks a[href^="#"]');
  const sectionIds = Array.from(navLinks)
    .map(function (a) { return a.getAttribute('href').slice(1); })
    .filter(function (id) { return id && document.getElementById(id); });

  if (sectionIds.length && 'IntersectionObserver' in window) {
    const linkById = {};
    navLinks.forEach(function (a) {
      const id = a.getAttribute('href').slice(1);
      if (id) linkById[id] = a;
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const link = linkById[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sectionIds.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // ---------- Contact form: client-side validation + submit UX ----------
  const form = document.getElementById('contact-form');
  if (form) {
    const submitBtn = document.getElementById('submit-btn');
    const fields = [
      { input: document.getElementById('f-name'), wrap: 'f-name', required: true, validate: function (v) { return v.trim().length > 0; } },
      { input: document.getElementById('f-email'), wrap: 'f-email', required: true, validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { input: document.getElementById('f-message'), wrap: 'f-message', required: true, validate: function (v) { return v.trim().length >= 10; } }
    ];

    function getFieldWrapper(input) {
      return input ? input.closest('.field') : null;
    }

    function setError(input, hasError) {
      const wrapper = getFieldWrapper(input);
      if (!wrapper) return;
      if (hasError) {
        wrapper.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
      } else {
        wrapper.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
      }
    }

    // Clear error on input
    fields.forEach(function (f) {
      if (!f.input) return;
      f.input.addEventListener('input', function () {
        if (f.validate(f.input.value)) {
          setError(f.input, false);
        }
      });
      f.input.addEventListener('blur', function () {
        if (f.required && !f.validate(f.input.value)) {
          setError(f.input, true);
        }
      });
    });

    form.addEventListener('submit', function (e) {
      let firstInvalid = null;
      fields.forEach(function (f) {
        if (!f.input) return;
        const valid = f.validate(f.input.value);
        setError(f.input, !valid);
        if (!valid && !firstInvalid) firstInvalid = f.input;
      });

      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SENDING…';
      }
      // Let the form submit naturally to Netlify
    });
  }
})();
