// Motion for the home page and the product pages: scroll reveals, the globe in the headline and
// pointer effects. All of it is optional; the pages read fine without this file.
(() => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  // The site editor saves the page's markup, so leave the markup as written while it is loaded.
  const editing = !!$('script[src*="_editor"]');
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Fade things in as they scroll into view; tiles also start their own little scenes.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.1 });
  $$(".rise, .tile").forEach((el) => io.observe(el));

  // Headline: one word at a time.
  const h1 = $(".hero h1");
  if (h1 && editing) h1.classList.add("plain");
  else if (h1) {
    let i = 0;
    for (const node of [...h1.childNodes]) {
      if (node.nodeType === 1) { node.classList.add("w"); node.style.setProperty("--i", i++); continue; }
      const words = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part.trim()) { if (part) words.append(" "); continue; }
        const w = document.createElement("span");
        w.className = "w"; w.style.setProperty("--i", i++); w.textContent = part;
        words.append(w);
      }
      node.replaceWith(words);
    }
    h1.classList.add("split");
  }

  // The quote fills in word by word as it scrolls up the screen.
  const quote = !editing && !still && $(".about blockquote");
  let qWords = [];
  if (quote) {
    const text = quote.textContent.trim().split(/\s+/);
    quote.setAttribute("aria-label", quote.textContent.trim());
    quote.textContent = "";
    text.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "q"; s.textContent = w; s.setAttribute("aria-hidden", "true");
      quote.append(s, i < text.length - 1 ? " " : "");
      qWords.push(s);
    });
  }

  const bar = $(".bar");
  let queued = false;
  const onScroll = () => {
    queued = false;
    if (bar) bar.classList.toggle("scrolled", scrollY > 10);
    if (quote) {
      const r = quote.getBoundingClientRect(), vh = innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.5))) * (qWords.length + 1);
      qWords.forEach((s, i) => { s.style.opacity = 0.18 + 0.82 * Math.max(0, Math.min(1, p - i)); });
    }
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  // Pointer: tiles lean toward it and catch the light; the hero's colour wash drifts away from it.
  if (mouse && !still) {
    for (const el of $$(".tile, .feat")) {
      const lean = el.classList.contains("tile") ? (el.offsetWidth > 700 ? 1.6 : 3) : 0;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add("lit");
        el.style.setProperty("--mx", x.toFixed(3)); el.style.setProperty("--my", y.toFixed(3));
        if (lean) { el.style.setProperty("--rx", ((0.5 - y) * lean).toFixed(2) + "deg"); el.style.setProperty("--ry", ((x - 0.5) * lean).toFixed(2) + "deg"); }
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("lit");
        for (const v of ["--mx", "--my", "--rx", "--ry"]) el.style.removeProperty(v);
      });
    }
    const hero = $(".hero");
    if (hero) hero.addEventListener("pointermove", (e) => {
      hero.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
      hero.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
    });
  }

  // The globe: the "o" in "world". A flat land map (256x128, light = land) is wrapped onto a sphere
  // pixel by pixel; the table of which map point each pixel shows is built once per size.
  const slot = !editing && $(".globe");
  if (slot) {
    const map = new Image();
    map.onload = () => {
      const W = map.width, H = map.height;
      const flat = document.createElement("canvas"); flat.width = W; flat.height = H;
      const fc = flat.getContext("2d", { willReadFrequently: true });
      fc.drawImage(map, 0, 0);
      const rgba = fc.getImageData(0, 0, W, H).data, land = new Uint8Array(W * H);
      for (let i = 0; i < land.length; i++) land[i] = rgba[i * 4];

      const cv = document.createElement("canvas"), cx = cv.getContext("2d");
      cv.setAttribute("aria-hidden", "true");
      const letter = document.createElement("span"); letter.className = "o"; letter.textContent = slot.textContent;
      slot.textContent = ""; slot.append(letter, cv); slot.classList.add("on");

      const SEA = [[72, 152, 255], [10, 48, 158]], LAND = [[168, 240, 160], [28, 120, 76]];   // [lit, shaded]
      const TILT = -20 * Math.PI / 180, NOD = 16 * Math.PI / 180;
      let N = 0, at, U, V, shade, gloss, alpha, frame;
      const build = () => {
        const size = Math.max(24, Math.round(cv.offsetWidth * Math.min(devicePixelRatio || 1, 3)));
        if (size === N) return;
        N = size; cv.width = cv.height = N;
        const R = N / 2, ct = Math.cos(TILT), st = Math.sin(TILT), cn = Math.cos(NOD), sn = Math.sin(NOD);
        const a = [], u = [], v = [], sh = [], gl = [], al = [];
        for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
          const x = (px + 0.5 - R) / R, y = (R - py - 0.5) / R, r2 = x * x + y * y, edge = (1 - Math.sqrt(r2)) * R + 0.5;
          if (edge <= 0) continue;
          const z = Math.sqrt(Math.max(0, 1 - r2));
          const x1 = x * ct + y * st, y1 = y * ct - x * st, y2 = y1 * cn - z * sn, z2 = y1 * sn + z * cn;
          a.push(py * N + px);
          u.push((Math.atan2(x1, z2) / (2 * Math.PI) + 0.5) * W);
          v.push(Math.min(H - 1.001, Math.max(0, (0.5 - Math.asin(Math.max(-1, Math.min(1, y2))) / Math.PI) * H - 0.5)));
          sh.push(Math.min(1, 0.14 + 0.95 * Math.max(0, -0.48 * x + 0.58 * y + 0.66 * z)));                    // sun from upper left
          gl.push(255 * (0.5 * Math.pow(Math.max(0, -0.26 * x + 0.31 * y + 0.91 * z), 30) + 0.3 * Math.pow(1 - z, 3)));   // highlight + hazy rim
          al.push(255 * Math.min(1, edge));
        }
        at = Int32Array.from(a); U = Float32Array.from(u); V = Float32Array.from(v);
        shade = Float32Array.from(sh); gloss = Float32Array.from(gl); alpha = Float32Array.from(al);
        frame = cx.createImageData(N, N);
      };
      let turn = W * 0.3;   // map columns scrolled so far
      const draw = () => {
        const d = frame.data;
        for (let i = 0; i < at.length; i++) {
          let uu = (U[i] - turn) % W; if (uu < 0) uu += W;
          const u0 = uu | 0, u1 = u0 + 1 === W ? 0 : u0 + 1, fu = uu - u0, v0 = V[i] | 0, fv = V[i] - v0, r0 = v0 * W, r1 = r0 + W;
          const m = ((land[r0 + u0] * (1 - fu) + land[r0 + u1] * fu) * (1 - fv) + (land[r1 + u0] * (1 - fu) + land[r1 + u1] * fu) * fv) / 255;
          const s = shade[i], g = gloss[i], p = at[i] * 4;
          for (let c = 0; c < 3; c++) {
            const sea = SEA[1][c] + (SEA[0][c] - SEA[1][c]) * s;
            d[p + c] = sea + (LAND[1][c] + (LAND[0][c] - LAND[1][c]) * s - sea) * m + g;   // clamped by the array
          }
          d[p + 3] = alpha[i];
        }
        cx.putImageData(frame, 0, 0);
      };

      const CRUISE = W / 15000;   // one turn every 15 s, in map columns per millisecond
      let speed = CRUISE, last = 0, running = false, seen = true, grab = null;
      const tick = (t) => {
        if (!running) return;
        const dt = Math.min(50, t - last); last = t;
        if (!grab) { speed += (CRUISE - speed) * Math.min(1, dt / 1100); turn += speed * dt; }
        draw();
        requestAnimationFrame(tick);
      };
      const sync = () => {
        const go = seen && !document.hidden && !still;
        if (go && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
        running = go;
      };
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }).observe(cv);
      document.addEventListener("visibilitychange", sync);
      new ResizeObserver(() => { build(); draw(); }).observe(cv);

      // Drag to spin it; it coasts back to its own pace.
      const perPx = () => W / (Math.PI * cv.offsetWidth);
      cv.addEventListener("pointerdown", (e) => { grab = { x: e.clientX, t: e.timeStamp }; speed = 0; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", (e) => {
        if (!grab) return;
        const dx = (e.clientX - grab.x) * perPx(), dt = Math.max(1, e.timeStamp - grab.t);
        turn += dx; speed = 0.6 * speed + 0.4 * dx / dt;
        grab = { x: e.clientX, t: e.timeStamp };
        if (!running) draw();
      });
      const drop = () => { grab = null; speed = Math.max(-0.6, Math.min(0.6, speed)); };
      cv.addEventListener("pointerup", drop); cv.addEventListener("pointercancel", drop);

      build(); draw(); sync();
    };
    map.src = "/assets/earth.png";
  }
})();
