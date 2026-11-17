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

  // Orbit <-> cards. Each logo in the hero orbit maps to a row in a "What we do"
  // card (data-tool). The caption reads its text from that row, so the
  // description lives in one place and editor changes flow through.
  const vis = document.querySelector(".hero-visual");
  const tip = vis && vis.querySelector(".orbit-tip");
  if (vis && tip) {
    const nodes = [...vis.querySelectorAll(".node")];
    const rowFor = (tool) => document.getElementById(`tool-${tool}`);
    let pinned = false;

    function show(node) {
      const row = rowFor(node.dataset.tool);
      if (!row) return;
      tip.querySelector(".tip-cat").textContent = row.closest(".card").querySelector("h3").textContent;
      tip.querySelector(".tip-name").textContent = row.querySelector("dt").textContent;
      tip.querySelector(".tip-desc").textContent = row.querySelector("dd").textContent;
      tip.dataset.tool = node.dataset.tool;
      nodes.forEach((n) => n.classList.toggle("is-on", n === node));
      tip.hidden = false;
      // Sit the caption above a logo in the lower half, below one in the upper half.
      const vr = vis.getBoundingClientRect(), nr = node.getBoundingClientRect();
      const cx = nr.left + nr.width / 2 - vr.left, cy = nr.top + nr.height / 2 - vr.top;
      const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14;
      const left = Math.max(-vr.left + 12, Math.min(cx - tw / 2, innerWidth - vr.left - tw - 12));
      tip.style.left = `${left}px`;
      tip.style.top = `${cy > vr.height / 2 ? cy - nr.height / 2 - th - gap : cy + nr.height / 2 + gap}px`;
    }
    function hide() {
      pinned = false;
      tip.hidden = true;
      vis.classList.remove("paused");
      nodes.forEach((n) => n.classList.remove("is-on"));
    }

    nodes.forEach((node) => {
      node.addEventListener("mouseenter", () => { if (!pinned) show(node); });
      node.addEventListener("focus", () => { if (!pinned) show(node); });
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        if (pinned && tip.dataset.tool === node.dataset.tool) return hide();
        pinned = true;
        vis.classList.add("paused");
        show(node);
      });
    });
    vis.addEventListener("mouseleave", () => { if (!pinned) hide(); });
    vis.addEventListener("focusout", (e) => { if (!vis.contains(e.relatedTarget)) hide(); });
    document.addEventListener("click", (e) => { if (pinned && !tip.contains(e.target)) hide(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });

    tip.querySelector(".tip-more").addEventListener("click", (e) => {
      e.preventDefault();
      const row = rowFor(tip.dataset.tool);
      hide();
      if (!row) return;
      row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      row.classList.remove("flash");
      void row.offsetWidth;
      row.classList.add("flash");
    });

    // Hovering a card lights its logos in the orbit; hovering a row lights just that one.
    const light = (match) => {
      vis.classList.toggle("dim", !!match);
      nodes.forEach((n) => n.classList.toggle("is-lit", !!match && match(n)));
    };
    document.querySelectorAll(".card[data-group]").forEach((card) => {
      const group = (n) => n.dataset.group === card.dataset.group;
      card.addEventListener("mouseenter", () => light(group));
      card.addEventListener("mouseleave", () => light(null));
      card.querySelectorAll("[data-tool]").forEach((row) => {
        row.addEventListener("mouseenter", () => light((n) => n.dataset.tool === row.dataset.tool));
        row.addEventListener("mouseleave", () => light(group));
      });
    });
  }

  // Spotlight that follows the pointer on cards and tiles.
  if (!reduce) document.querySelectorAll(".card, .tile").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
})();
