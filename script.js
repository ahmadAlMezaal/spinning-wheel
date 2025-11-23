document.addEventListener("DOMContentLoaded", () => {
  // --- AUDIO SYSTEM (Fixed) ---
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

    if (type === "pop") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.1);
    } else if (type === "tick") {
      // WHEEL TICK
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.03);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.05);
    } else if (type === "coin-toss") {
      // METALLIC RING (Multi-layered)
      const frequencies = [1600, 2000, 3200, 4000];
      frequencies.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        if (i % 2 === 0)
          osc.frequency.linearRampToValueAtTime(freq - 50, now + 1.0);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(now + 1.2);
      });
    } else if (type === "coin-land") {
      // THUD (Catch)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.1);
    } else if (type === "win") {
      // WIN CHIME
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 2);
    }
  }

  // --- Navigation ---
  const views = {
    wheel: document.getElementById("view-wheel"),
    coin: document.getElementById("view-coin"),
  };
  const tabs = {
    wheel: document.getElementById("tab-wheel"),
    coin: document.getElementById("tab-coin"),
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

  // --- COIN LOGIC ---
  const coinJumpWrapper = document.getElementById("coin-jump-wrapper");
  const coinEl = document.getElementById("coin");
  const coinShadow = document.getElementById("coin-shadow");
  const coinResult = document.getElementById("coin-result");
  const flipBtn = document.getElementById("flip-btn");
  const inputHeads = document.getElementById("input-heads");
  const inputTails = document.getElementById("input-tails");

  let currentRotation = 0;
  let isFlipping = false;

  flipBtn.onclick = () => {
    if (isFlipping) return;
    initAudio();
    isFlipping = true;
    flipBtn.disabled = true;
    flipBtn.classList.add("opacity-50");
    coinResult.classList.add("opacity-0");

    playSound("coin-toss");

    const isHeads = Math.random() < 0.5;
    const extraSpins = 1800;
    const targetAngle = isHeads ? 0 : 180;

    let nextRotation = currentRotation + extraSpins;
    const mod = nextRotation % 360;
    let adjustment = targetAngle - mod;
    if (adjustment < 0) adjustment += 360;

    currentRotation = nextRotation + adjustment;

    // Animations
    coinEl.style.transition = "transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)";
    coinEl.style.transform = `rotateX(${currentRotation}deg)`;

    coinJumpWrapper.classList.remove("animate-toss");
    void coinJumpWrapper.offsetWidth;
    coinJumpWrapper.classList.add("animate-toss");

    coinShadow.classList.remove("animate-shadow");
    void coinShadow.offsetWidth;
    coinShadow.classList.add("animate-shadow");

    setTimeout(() => {
      isFlipping = false;
      flipBtn.disabled = false;
      flipBtn.classList.remove("opacity-50");

      const text = isHeads
        ? inputHeads.value || "Heads"
        : inputTails.value || "Tails";
      coinResult.textContent = text;
      coinResult.classList.remove("opacity-0");

      playSound("coin-land");
    }, 2500);
  };

  // --- WHEEL LOGIC (Fixed Physics) ---
  const canvas = document.getElementById("wheel");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const pointer = document.getElementById("pointer");
  let items = ["Pizza", "Sushi", "Burgers", "Tacos"];

  // Wheel State
  let currentAngle = 0;
  let isSpinning = false;
  let spinVelocity = 0;
  let spinDeceleration = 0.99;
  let lastSegmentIndex = -1;
  let pointerAngle = 0;

  function resizeCanvas() {} // CSS handles size

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
      const startAngle = currentAngle + i * arc;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arc / 2);
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

  // The Physics Loop
  function loop() {
    if (isSpinning) {
      currentAngle += spinVelocity;
      spinVelocity *= spinDeceleration;
      if (currentAngle >= Math.PI * 2) currentAngle -= Math.PI * 2;

      // Determine which segment is at the TOP (3*PI/2 or 270 deg)
      const numSegments = items.length || 1;
      const arcSize = (Math.PI * 2) / numSegments;

      // The pointer is fixed at top. We calculate which segment is passing it.
      // To simplify: rotate wheel logic in reverse to find index
      const rotation = currentAngle % (Math.PI * 2);
      const pointerTheta = (3 * Math.PI) / 2 - rotation;

      let normalizedTheta = pointerTheta;
      while (normalizedTheta < 0) normalizedTheta += Math.PI * 2;

      const currentIndex = Math.floor(normalizedTheta / arcSize) % numSegments;

      // Trigger Tick & Kick if index changes
      if (currentIndex !== lastSegmentIndex && spinVelocity > 0.01) {
        playSound("tick");
        lastSegmentIndex = currentIndex;
        pointerAngle = -25; // Kick back
      }

      // Stop Condition
      if (spinVelocity < 0.0015) {
        isSpinning = false;
        spinVelocity = 0;
        finishSpin(currentIndex);
      }
    }

    // Animate Pointer Recovery
    pointerAngle *= 0.9;
    pointer.style.transform = `translateX(-50%) rotate(${pointerAngle}deg)`;

    drawWheel();
    requestAnimationFrame(loop);
  }

  function finishSpin(winnerIndex) {
    const winner = items[winnerIndex];
    playSound("win");

    const modal = document.getElementById("result-modal");
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.remove("opacity-0"), 10);
    document.getElementById("winner-text").innerText = winner;
  }

  // Wheel Interaction
  document.getElementById("spin-btn").onclick = () => {
    if (isSpinning || items.length === 0) return;
    initAudio();
    isSpinning = true;
    spinVelocity = Math.random() * 0.3 + 0.5; // Initial Kick
    lastSegmentIndex = -1;
  };

  // --- List Management ---
  const input = document.getElementById("new-choice");
  const list = document.getElementById("choice-list");

  function updateList() {
    list.innerHTML = "";
    items.forEach((item, i) => {
      const chip = document.createElement("div");
      chip.className =
        "bg-slate-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2";
      chip.innerHTML = `<span>${item}</span><i class="fas fa-times cursor-pointer hover:text-red-400"></i>`;
      chip.querySelector("i").onclick = () => {
        if (isSpinning) return;
        items.splice(i, 1);
        updateList();
        drawWheel();
      };
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
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.onclick = () => {
      if (isSpinning) return;
      const t = btn.dataset.type;
      if (t === "food") items = ["Pizza", "Sushi", "Burgers", "Salad"];
      if (t === "yesno") items = ["Yes", "No", "Maybe"];
      if (t === "dice")
        items = [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
        ];
      updateList();
    };
  });
  document.getElementById("btn-close-modal").onclick = () => {
    const modal = document.getElementById("result-modal");
    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden"), 500);
  };

  // Start
  if (canvas) {
    updateList();
    loop();
  }
});
