'use strict';
(() => {
  const { $, $$ } = window.SV;

  /* قائمة الجوال */
  const toggle = $('#navToggle');
  const nav = $('#siteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  /* الأسئلة الشائعة */
  $$('.faq-item').forEach((item) => {
    $('.faq-q', item).addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      $$('.faq-item').forEach((i) => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ظهور العناصر عند التمرير */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));
})();
