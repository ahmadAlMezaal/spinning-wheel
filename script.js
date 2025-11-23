document.addEventListener("DOMContentLoaded", () => {
  const apiKey = ""; // Gemini Key handled by environment
  async function callGemini(prompt) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      return "The stars are cloudy today... try again later.";
    }
  }

  // --- AUDIO ---
  let audioCtx = null;
  function initAudio() {
    try {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  function playSound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    if (type === "pop") {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    } else if (type === "tick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.03);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    } else if (type === "shake") {
      osc.type = "square";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.5);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(now + 1);
  }

  // --- NAV ---
  const views = {
    wheel: document.getElementById("view-wheel"),
    coin: document.getElementById("view-coin"),
    ball: document.getElementById("view-ball"),
  };
  const tabs = {
    wheel: document.getElementById("tab-wheel"),
    coin: document.getElementById("tab-coin"),
    ball: document.getElementById("tab-ball"),
  };
  function switchMode(mode) {
    Object.values(views).forEach((el) => el.classList.add("hidden"));
    Object.values(tabs).forEach((el) => el.classList.remove("active"));
    views[mode].classList.remove("hidden");
    tabs[mode].classList.add("active");
    if (mode === "wheel") resizeCanvas();
  }
  tabs.wheel.onclick = () => switchMode("wheel");
  tabs.coin.onclick = () => switchMode("coin");
  tabs.ball.onclick = () => switchMode("ball");

  // --- AI ---
  const btnAi = document.getElementById("btn-ai-generate");
  const aiInput = document.getElementById("ai-prompt");
  if (btnAi)
    btnAi.onclick = async () => {
      if (!aiInput.value.trim()) return;
      const ogHtml = btnAi.innerHTML;
      btnAi.innerHTML = '<div class="ai-spinner"></div>';
      btnAi.disabled = true;
      const res = await callGemini(
        `Creative list of 6 options for: '${aiInput.value}'. Comma separated. No numbering.`
      );
      if (res) {
        items = res.split(",").map((s) => s.trim());
        updateList();
        playSound("win");
      }
      btnAi.innerHTML = ogHtml;
      btnAi.disabled = false;
    };

  // --- WHEEL ---
  const canvas = document.getElementById("wheel");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const pointer = document.getElementById("pointer");
  let items = ["Pizza", "Sushi", "Burgers", "Tacos"];
  let currentAngle = 0,
    isSpinning = false,
    spinVel = 0,
    lastIdx = -1,
    pointerAng = 0;
  let lastWinner = "";

  function resizeCanvas() {}
  function drawWheel() {
    if (!ctx) return;
    const cx = 300,
      cy = 300,
      r = 280;
    const arc = (Math.PI * 2) / items.length;
    const colors = [
      "#C026D3",
      "#4F46E5",
      "#0891B2",
      "#059669",
      "#D97706",
      "#E11D48",
    ];
    ctx.clearRect(0, 0, 600, 600);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();
    items.forEach((item, i) => {
      const ang = currentAngle + i * arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, ang, ang + arc);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Quicksand";
      ctx.fillText(item, r - 20, 10);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
  }
  function loop() {
    if (isSpinning) {
      currentAngle += spinVel;
      spinVel *= 0.99;
      if (currentAngle >= Math.PI * 2) currentAngle -= Math.PI * 2;
      const num = items.length || 1;
      const arc = (Math.PI * 2) / num;
      const rot = currentAngle % (Math.PI * 2);
      const pTheta = (3 * Math.PI) / 2 - rot;
      let nTheta = pTheta;
      while (nTheta < 0) nTheta += Math.PI * 2;
      const idx = Math.floor(nTheta / arc) % num;
      if (idx !== lastIdx && spinVel > 0.01) {
        playSound("tick");
        lastIdx = idx;
        pointerAng = -25;
      }
      if (spinVel < 0.0015) {
        isSpinning = false;
        spinVel = 0;
        finishSpin(idx);
      }
    }
    pointerAng *= 0.9;
    if (pointer)
      pointer.style.transform = `translateX(-50%) rotate(${pointerAng}deg)`;
    drawWheel();
    requestAnimationFrame(loop);
  }
  function finishSpin(idx) {
    lastWinner = items[idx];
    playSound("win");
    const modal = document.getElementById("result-modal");
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.remove("opacity-0"), 10);
    document.getElementById("winner-text").innerText = lastWinner;
  }
  document.getElementById("spin-btn").onclick = () => {
    if (isSpinning || items.length === 0) return;
    initAudio();
    isSpinning = true;
    spinVel = Math.random() * 0.3 + 0.5;
    lastIdx = -1;
  };

  // LIST
  const list = document.getElementById("choice-list");
  const input = document.getElementById("new-choice");
  function updateList() {
    if (!list) return;
    list.innerHTML = "";
    items.forEach((item, i) => {
      const chip = document.createElement("div");
      chip.className =
        "bg-slate-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-slate-600";

      // FIXED: X button is now a proper button with larger hit area
      chip.innerHTML = `<span>${item}</span>`;
      const closeBtn = document.createElement("button");
      closeBtn.className = "text-slate-400 hover:text-red-400 transition p-1";
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        if (isSpinning) return;
        items.splice(i, 1);
        updateList();
        drawWheel();
      };
      chip.appendChild(closeBtn);

      list.appendChild(chip);
    });
    drawWheel();
  }
  document.getElementById("btn-add").onclick = () => {
    if (input.value && !isSpinning) {
      items.push(input.value);
      input.value = "";
      updateList();
      playSound("pop");
    }
  };
  document.getElementById("btn-clear").onclick = () => {
    if (!isSpinning) {
      items = [];
      updateList();
    }
  };
  document.getElementById("btn-close-modal").onclick = () => {
    const m = document.getElementById("result-modal");
    m.classList.add("opacity-0");
    setTimeout(() => m.classList.add("hidden"), 500);
  };

  // COIN
  const coinEl = document.getElementById("coin");
  const coinJump = document.getElementById("coin-jump-wrapper");
  const coinShadow = document.getElementById("coin-shadow");
  const coinResCont = document.getElementById("coin-result-container");
  const flipBtn = document.getElementById("flip-btn");
  let coinRot = 0;
  if (flipBtn)
    flipBtn.onclick = () => {
      initAudio();
      flipBtn.disabled = true;
      flipBtn.classList.add("opacity-50");
      coinResCont.classList.add("opacity-0");
      if (audioCtx) {
        const now = audioCtx.currentTime;
        [1600, 2000, 3200, 4000].forEach((f, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.04, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start();
          o.stop(now + 1.2);
        });
      }
      const isHeads = Math.random() < 0.5;
      const target = isHeads ? 0 : 180;
      let nextRot = coinRot + 1800;
      const mod = nextRot % 360;
      let adj = target - mod;
      if (adj < 0) adj += 360;
      coinRot = nextRot + adj;

      coinEl.style.transition = "transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)";
      coinEl.style.transform = `rotateX(${coinRot}deg)`;

      // Re-trigger animations
      coinJump.classList.remove("animate-toss");
      void coinJump.offsetWidth;
      coinJump.classList.add("animate-toss");
      coinShadow.classList.remove("animate-shadow");
      void coinShadow.offsetWidth;
      coinShadow.classList.add("animate-shadow");

      setTimeout(() => {
        flipBtn.disabled = false;
        flipBtn.classList.remove("opacity-50");
        document.getElementById("coin-result").innerText = isHeads
          ? document.getElementById("input-heads").value || "Heads"
          : document.getElementById("input-tails").value || "Tails";
        coinResCont.classList.remove("opacity-0");
        if (audioCtx) {
          const n = audioCtx.currentTime;
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(120, n);
          o.frequency.exponentialRampToValueAtTime(40, n + 0.1);
          g.gain.setValueAtTime(0.2, n);
          g.gain.exponentialRampToValueAtTime(0.001, n + 0.1);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start();
          o.stop(n + 0.1);
        }

        // FIXED: Clean up animation classes to prevent auto-replay on tab switch
        coinJump.classList.remove("animate-toss");
        coinShadow.classList.remove("animate-shadow");
      }, 2500);
    };

  // 8-BALL
  const ball = document.getElementById("magic-ball");
  const bTri = document.getElementById("ball-triangle");
  const bAns = document.getElementById("ball-answer");
  const shakeBtn = document.getElementById("btn-shake-ball");
  const ballAnswers = [
    "Yes",
    "No",
    "Maybe",
    "Ask Later",
    "Outlook Good",
    "Doubtful",
  ];
  if (shakeBtn)
    shakeBtn.onclick = () => {
      initAudio();
      playSound("shake");
      document
        .getElementById("ball-oracle-container")
        .classList.add("opacity-0");
      bTri.classList.remove("opacity-100");
      bTri.classList.add("opacity-0");
      bTri.style.transform = "translateY(10px)";

      ball.classList.remove("animate-shake");
      void ball.offsetWidth;
      ball.classList.add("animate-shake");

      setTimeout(() => {
        bAns.innerText =
          ballAnswers[Math.floor(Math.random() * ballAnswers.length)];
        bTri.classList.remove("opacity-0");
        bTri.classList.add("opacity-100");
        bTri.style.transform = "translateY(0)";
        document
          .getElementById("ball-oracle-container")
          .classList.remove("opacity-0");
        playSound("win");

        // FIXED: Clean up animation class
        ball.classList.remove("animate-shake");
      }, 800);
    };

  // Oracle Logic
  const oracleModal = document.getElementById("prophecy-modal");
  async function runOracle(win, ctx) {
    oracleModal.classList.remove("hidden");
    setTimeout(() => oracleModal.classList.remove("opacity-0"), 10);
    document.getElementById("prophecy-text").innerHTML =
      '<div class="ai-spinner"></div>';
    const txt = await callGemini(
      `Mystic fortune teller interpretation. Winner: '${win}'. Context: '${ctx}'. Max 2 sentences. Fun & cryptic.`
    );
    document.getElementById("prophecy-text").innerText = txt;
  }
  const btnWOracle = document.getElementById("btn-wheel-oracle");
  if (btnWOracle)
    btnWOracle.onclick = () =>
      runOracle(lastWinner, "Wheel spin options: " + items.join(","));
  const btnCOracle = document.getElementById("btn-coin-oracle");
  if (btnCOracle)
    btnCOracle.onclick = () => {
      const h = document.getElementById("input-heads").value,
        t = document.getElementById("input-tails").value;
      runOracle(
        document.getElementById("coin-result").innerText,
        `Coin toss ${h} vs ${t}`
      );
    };
  const btnBOracle = document.getElementById("btn-ball-oracle");
  if (btnBOracle)
    btnBOracle.onclick = () =>
      runOracle(bAns.innerText, "Magic 8-ball question");
  document.getElementById("btn-close-prophecy").onclick = () => {
    oracleModal.classList.add("opacity-0");
    setTimeout(() => oracleModal.classList.add("hidden"), 500);
  };

  if (canvas) {
    updateList();
    loop();
  }
});
