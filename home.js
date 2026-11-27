// Motion for the home page and the product pages: the globe in the headline, the wheel, scroll and
// pointer effects. All of it is optional; the pages read fine without this file. (The scroll reveal
// and the headline's word split are inline in the pages, so they never wait for this file.)
(() => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  // The site editor saves the page's markup, so leave the markup as written while it is loaded.
  const editing = !!window.buuEditor;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const bar = $(".bar");

  // Links within the page scroll to their section, clear of the floating bar.
  for (const a of $$('a[href^="#"]')) a.addEventListener("click", (e) => {
    const to = document.getElementById(a.getAttribute("href").slice(1));
    if (!to) return;
    e.preventDefault();
    let y = -(bar ? bar.offsetHeight + 10 : 0);
    for (let el = to; el; el = el.offsetParent) y += el.offsetTop;   // layout position: ignores the reveal's transform
    scrollTo({ top: Math.max(0, y), behavior: still ? "auto" : "smooth" });
    history.replaceState(null, "", a.getAttribute("href"));
  });

  // On the home page a whole product tile opens its page, not just its button.
  if (!editing) for (const tile of $$(".grid > .tile")) {
    const go = tile.querySelector("a.btn[href^='/']");
    if (!go) continue;
    tile.style.cursor = "pointer";
    tile.addEventListener("click", (e) => { if (!e.target.closest("a, button")) location.assign(go.href); });
  }

  // The quote fills in word by word as it scrolls up the screen.
  const quote = !editing && !still && $(".about blockquote");
  const qWords = [];
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

  // Bool's wheel: tap it to pick who drives. The chat below also spins it once when it has played.
  const bindWheel = (card) => {
    const wheel = card.querySelector(".wheel"), out = card.querySelector("strong"), hint = card.querySelector("small");
    const faces = [...wheel.children];
    let turn = -45, busy = false, last = 0;
    const spin = () => {
      if (busy) return;
      let pick; do { pick = Math.floor(Math.random() * faces.length); } while (pick === last);
      last = pick; busy = true;
      const rest = -parseFloat(faces[pick].style.getPropertyValue("--a"));   // the turn that puts this face on top
      turn += 1440 + ((rest - turn) % 360 + 360) % 360;
      wheel.style.setProperty("--turn", turn + "deg");
      out.textContent = "Spinning…";
      setTimeout(() => { out.textContent = faces[pick].dataset.name + " drives"; hint.textContent = "Tap to spin again"; busy = false; }, still ? 60 : 3450);
    };
    card.addEventListener("click", spin);
    card.autoSpin = spin;
  };
  $$("[data-wheel]").forEach(bindWheel);

  // ---- Bool's phone ----
  // Scenes play on the phone's screen. Each gets `wait`, which throws once the scene has been replaced (the
  // visitor picked another feature), so a scene simply stops where it is.
  const STOP = {};
  const runner = () => { const run = { live: true }; run.wait = (ms) => new Promise((ok, no) => setTimeout(() => (run.live ? ok() : no(STOP)), ms)); return run; };
  const again = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const typeIn = async (run, el, ms = 1700) => { el.classList.add("on", "typing"); await run.wait(ms); el.classList.remove("typing"); };
  const press = async (run, el, ms = 260) => { el.classList.add("press"); await run.wait(ms); el.classList.remove("press"); };
  // The phone has two screens: the space (its channels, apps and direct messages) and whatever is open over it.
  const go = async (run, screen, at) => { screen.querySelector(".nav").dataset.at = at; await run.wait(650); };
  // Type into the composer, which grows as the words wrap, then send.
  const write = async (run, screen, text) => {
    const box = screen.querySelector(".compose"), line = box.querySelector("span"), hint = line.textContent;
    box.classList.add("typed"); line.textContent = "";
    for (let i = 1; i <= text.length; i++) {
      line.innerHTML = text.slice(0, i).replace(/^@Bool/, '<b class="at">@Bool</b>');
      await run.wait(text[i - 1] === " " ? 95 : 50);
    }
    await run.wait(450);
    await press(run, box.querySelector(".send"), 170);
    box.classList.remove("typed"); line.textContent = hint;
  };

  // "Start with a chat": a message lands in big-yums, you open it and reply, Sam answers; Maya likes it; you
  // press and hold it, Bool's message sheet shows who liked it, you tap the heart; then the wheel spins.
  async function sceneChat(run, screen, view) {
    const chat = view.querySelector(".chat"), [first, mine, ...rest] = chat.children;
    const door = screen.querySelector('.space [data-chan="yums"]');
    const row = chat.querySelector("[data-react]"), like = row.querySelector(".like"), count = like.querySelector("b");
    const heart = screen.querySelector(".reacts .heart"), liked = screen.querySelector(".liked");
    const burst = () => {
      const s = screen.getBoundingClientRect(), r = like.getBoundingClientRect(), k = s.width / screen.offsetWidth;   // the phone may be drawn larger
      for (let k = 0; k < 6; k++) {
        const b = document.createElement("i"); b.className = "burst"; b.textContent = "❤️";
        b.style.left = (r.left - s.left) / k + 6 + "px"; b.style.top = (r.top - s.top) / k + 4 + "px";
        const ang = -Math.PI / 2 + (k - 2.5) * 0.45;
        b.style.setProperty("--bx", Math.cos(ang) * 34 + "px"); b.style.setProperty("--by", Math.sin(ang) * 34 + "px");
        screen.append(b); setTimeout(() => b.remove(), 950);
      }
    };
    first.classList.add("on", "was");
    await run.wait(1100);
    door.classList.add("unread"); await run.wait(1500);
    await press(run, door); await go(run, screen, "room"); door.classList.remove("unread");
    await run.wait(900);
    await write(run, screen, mine.querySelector(".bubble").textContent);
    mine.classList.add("on"); await run.wait(1300);
    for (const el of rest) {
      if (el.querySelector(".dots")) await typeIn(run, el); else el.classList.add("on");
      if (el === row) {
        await run.wait(1900);
        like.classList.add("some"); count.textContent = "1"; again(like, "bump");
        await run.wait(1800);
        row.classList.add("hold"); await run.wait(650);
        row.classList.remove("hold"); screen.classList.add("sheeted");
        await run.wait(1900);
        heart.classList.add("pick"); await run.wait(450);
        screen.classList.remove("sheeted"); await run.wait(420);
        heart.classList.remove("pick");
        like.classList.add("on"); count.textContent = "2"; again(like, "bump"); again(like, "pop"); burst();
        liked.insertAdjacentHTML("beforeend", '<em style="--c:#b8b8c0">🙂</em>You');
      }
      await run.wait(el.querySelector(".dots") ? 1300 : 1500);
    }
    await run.wait(400);
    const wheel = chat.querySelector("[data-wheel]");
    if (wheel && wheel.autoSpin) { wheel.autoSpin(); await run.wait(3800); }
  }

  // "Add what you need": from the space, open Apps; switch two on, drag one to the top, switch one off; back in
  // the space they are in the Apps list and on the tab bar, in that order.
  async function sceneApps(run, screen, view) {
    const space = screen.querySelector(".space"), list = view.querySelector(".list");
    const item = (a) => list.querySelector(`[data-app="${a}"]`);
    const flip = async (a, on) => { await press(run, item(a), 220); item(a).classList.toggle("in", on); };
    await run.wait(1100);
    await press(run, space.querySelector(".adder")); await go(run, screen, "room");
    await run.wait(400);
    await flip("sign", true); await run.wait(900);
    await flip("split", true); await run.wait(1000);
    const k = screen.getBoundingClientRect().width / screen.offsetWidth;   // the phone may be drawn larger
    const rows = [...list.querySelectorAll("[data-app]")], move = item("split"), was = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    move.classList.add("lift"); await run.wait(380);
    list.insertBefore(move, rows[0]);
    for (const r of rows) { r.style.transition = "none"; r.style.transform = `translateY(${(was.get(r) - r.getBoundingClientRect().top) / k}px) scale(${r === move ? 1.04 : 1})`; }
    void list.offsetWidth;
    for (const r of rows) { r.style.transition = ""; r.style.transform = ""; }
    await run.wait(750); move.classList.remove("lift");
    await run.wait(800);
    await flip("tasks", false); await run.wait(1000);
    const on = [...list.querySelectorAll("[data-app].in")].map((r) => r.dataset.app);
    for (const bar of space.querySelectorAll(".apps, .tabbar")) for (const el of bar.querySelectorAll("[data-app]")) {
      const k = on.indexOf(el.dataset.app), show = k >= 0 && (k < 3 || bar.classList.contains("apps"));
      el.style.order = k;
      if (show && !el.classList.contains("in")) el.classList.add("in", "new"); else if (!show) el.classList.remove("in");
    }
    await go(run, screen, "space");
    await run.wait(2600);
  }

  // "Just ask Bool": you mention @Bool, it sets up a sign-up sheet, and people fill it in.
  async function sceneAsk(run, screen, view) {
    const chat = view.querySelector(".chat"), [ask, reply, card] = chat.children;
    await run.wait(800);
    await write(run, screen, "@Bool make a potluck sign-up for friday");
    ask.classList.add("on"); await run.wait(800);
    await typeIn(run, reply, 1500);
    await run.wait(700); card.classList.add("on"); await run.wait(1100);
    for (const em of card.querySelectorAll("[data-who]")) { em.textContent = em.dataset.who; em.classList.add("taken"); await run.wait(900); }
    await run.wait(1500);
  }

  // "Private means private": open the private channel; it says what can't see it, and @Bool can't read it.
  async function scenePrivate(run, screen, view) {
    const chat = view.querySelector(".chat");
    await run.wait(1100);
    await press(run, screen.querySelector('.space [data-chan="santa"]')); await go(run, screen, "room");
    for (const s of view.querySelectorAll(".lock span")) { s.classList.add("in"); await run.wait(650); }
    await run.wait(500);
    for (const el of chat.children) { el.classList.add("on"); await run.wait(1100); }
    await run.wait(1600);
  }

  // "Make it yours": the like button becomes your own, a sticker lands, then the looks change.
  async function sceneYours(run, screen, view) {
    const chat = view.querySelector(".chat"), chip = view.querySelector(".chip"), like = view.querySelector(".like i"), sticker = view.querySelector(".sticker");
    const say = async (t) => { chip.classList.add("swap"); await run.wait(250); chip.textContent = t; chip.classList.remove("swap"); };
    for (const el of chat.children) el.classList.add("on");
    await run.wait(900);
    for (const e of ["🥒", "🍕", "🔥"]) { like.textContent = e; again(like.parentNode, "swap"); await run.wait(1100); }
    await say("Your stickers"); await run.wait(400); sticker.classList.add("in"); await run.wait(1400);
    // the looks: Paper in the channel, Gray and Black back in the space, then home to White
    await say("Paper"); screen.dataset.look = "paper"; await run.wait(1300);
    screen.dataset.look = "gray"; await go(run, screen, "space"); await run.wait(900);
    screen.dataset.look = "black"; await run.wait(1500);
    delete screen.dataset.look; await run.wait(1400);
  }

  // "Works with what you use": calendar sync, Slack and Discord webhooks, then sign in with a passkey.
  async function sceneWorks(run, screen, view) {
    await run.wait(1100);
    await press(run, screen.querySelector(".space .gear")); await go(run, screen, "room");
    for (const s of view.querySelectorAll("[data-link]")) {
      s.classList.add("in"); await run.wait(650);
      if (s.querySelector("u")) { s.classList.add("done"); await run.wait(500); }
    }
    await run.wait(700);
    const pk = view.querySelector(".passkey");
    screen.classList.add("dim"); pk.classList.add("in"); await run.wait(500); pk.classList.add("scan"); await run.wait(1600);
    pk.classList.remove("scan"); pk.classList.add("done"); await run.wait(1800);
  }

  const SCENES = { chat: sceneChat, apps: sceneApps, ask: sceneAsk, private: scenePrivate, yours: sceneYours, works: sceneWorks };
  const LENGTH = { chat: 23300, apps: 11300, ask: 12100, private: 9500, yours: 12400, works: 10800 };   // for the progress bar
  const START = { ask: "room", yours: "room" };   // the others begin in the space
  // What the open screen's header says, where it isn't big-yums. `page` screens have no composer.
  const ROOM = {
    apps: { emoji: "🧩", name: "Apps", sub: "Home Team", page: true },
    private: { emoji: "🎁", name: "secret-santa", sub: "🔒 Private · 4 people", stack: '<em style="--c:#64d2ff">🐼</em><em style="--c:#ffb340">🦉</em><em style="--c:#a8e6a3">🐸</em>', hint: "Message #secret-santa" },
    works: { emoji: "🔗", name: "Connections", sub: "Home Team", page: true },
  };

  for (const phone of $$(".phone")) {
    if (editing || still) continue;
    const screen = phone.querySelector(".screen"), nav = screen.querySelector(".nav"), room = screen.querySelector(".room"), views = screen.querySelector(".views");
    const pick = document.querySelector(".pick");
    // Remember how everything starts, so each play begins from a clean screen.
    const roots = [...screen.querySelectorAll(".space, .head, .view, .compose, .sheet")];
    const reset = new Map(roots.map((el) => [el, el.innerHTML]));
    const restore = (el) => { el.innerHTML = reset.get(el); el.querySelectorAll("[data-wheel]").forEach(bindWheel); };
    const jump = (at) => { nav.classList.add("cut"); nav.dataset.at = at; void nav.offsetWidth; nav.classList.remove("cut"); again(nav, "fade"); };
    let run = null;
    const play = async (name) => {
      if (run) run.live = false;
      run = runner();
      const me = run, view = views.querySelector(`[data-view="${name}"]`), r = ROOM[name];
      screen.classList.remove("sheeted", "dim"); delete screen.dataset.look;
      roots.forEach(restore);
      for (const v of views.children) v.classList.toggle("on", v === view);
      room.classList.toggle("page", !!(r && r.page));
      if (r) {
        room.querySelector(".head-emoji").textContent = r.emoji; room.querySelector(".head-text b").textContent = r.name; room.querySelector(".head-text small").textContent = r.sub;
        if (r.stack) room.querySelector(".stack").innerHTML = r.stack;
        if (r.hint) room.querySelector(".compose span").textContent = r.hint;
      }
      jump(START[name] || "space");
      view.querySelectorAll(".chat").forEach((c) => c.classList.add("play"));
      try { await SCENES[name](me, screen, view); return me.live; } catch (e) { if (e !== STOP) throw e; return false; }
    };
    nav.classList.add("cut"); nav.dataset.at = "space"; void nav.offsetWidth; nav.classList.remove("cut");   // waits on the space until it plays

    if (!pick) {   // the home page: the chat plays once when it comes into view
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); play("chat"); } }, { threshold: 0.5 }).observe(screen);
      continue;
    }

    // The Bool page: the picker chooses the scene; when one finishes, the next one starts.
    const tabs = [...pick.querySelectorAll("[data-scene]")], desc = document.querySelector(".pick-desc");
    let current = 0, t0 = 0, raf = 0;
    const progress = () => {
      const tab = tabs[current], p = Math.min(1, (performance.now() - t0) / LENGTH[tab.dataset.scene]);
      tab.style.setProperty("--p", p.toFixed(3)); raf = requestAnimationFrame(progress);
    };
    const choose = async (i, user) => {
      current = i;
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.style.setProperty("--p", 0); });
      if (desc) desc.textContent = tabs[i].querySelector("span").textContent;
      if (user && matchMedia("(max-width: 860px)").matches) tabs[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      cancelAnimationFrame(raf); t0 = performance.now(); progress();
      const finished = await play(tabs[i].dataset.scene);
      if (finished && current === i) {
        tabs[i].style.setProperty("--p", 1); cancelAnimationFrame(raf);
        phone.dataset.took = Math.round(performance.now() - t0);
        await new Promise((r) => setTimeout(r, 1800));
        if (current === i) choose((i + 1) % tabs.length);
      }
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => choose(i, true)));
    pick.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return; e.preventDefault();
      const i = (current + d + tabs.length) % tabs.length; tabs[i].focus(); choose(i, true);
    });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); choose(0); } }, { threshold: 0.4 }).observe(screen);
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
      let speed = CRUISE, dir = 1, last = 0, running = false, seen = true, grab = null;   // dir: the way it turns on its own
      const tick = (t) => {
        if (!running) return;
        requestAnimationFrame(tick);
        const dt = t - last;
        if (dt < 30 && !grab) return;   // 30 frames a second is plenty for a slow turn
        last = t;
        if (!grab) { speed += (dir * CRUISE - speed) * Math.min(1, dt / 1400); turn += speed * Math.min(50, dt); }
        draw();
      };
      const sync = () => {
        const go = seen && !document.hidden && !still;
        if (go && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
        running = go;
      };
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }).observe(cv);
      document.addEventListener("visibilitychange", sync);
      new ResizeObserver(() => { build(); draw(); }).observe(cv);

      // Drag to spin it: it coasts down to its own pace and keeps turning the way you flicked it.
      const perPx = () => W / (Math.PI * cv.offsetWidth);
      cv.addEventListener("pointerdown", (e) => { grab = { x: e.clientX, t: e.timeStamp }; speed = 0; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", (e) => {
        if (!grab) return;
        const dx = (e.clientX - grab.x) * perPx(), dt = Math.max(1, e.timeStamp - grab.t);
        turn += dx; speed = 0.6 * speed + 0.4 * dx / dt;
        grab = { x: e.clientX, t: e.timeStamp };
        if (!running) draw();
      });
      const drop = () => {
        grab = null; speed = Math.max(-0.6, Math.min(0.6, speed));
        if (Math.abs(speed) > CRUISE * 0.25) dir = Math.sign(speed);
      };
      cv.addEventListener("pointerup", drop); cv.addEventListener("pointercancel", drop);

      build(); draw(); sync();
    };
    // The land map is small enough to carry here, so the globe never waits for a second download.
    map.src = "data:image/png;base64,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";
  }
})();
