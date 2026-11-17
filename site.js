// Small progressive enhancements for the landing page. The page works without it.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header: border + compact logo once scrolled; mobile menu toggle.
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const menu = header.querySelector(".menu");
  menu.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    menu.setAttribute("aria-expanded", open);
  });
  header.querySelectorAll("nav a").forEach((a) =>
    a.addEventListener("click", () => { header.classList.remove("open"); menu.setAttribute("aria-expanded", false); }));

  // Reveal on scroll.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Spotlight that follows the pointer on cards and tiles.
  if (!reduce) document.querySelectorAll(".card, .tile").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
})();
