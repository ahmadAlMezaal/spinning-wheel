document.addEventListener("DOMContentLoaded", () => {
  // --- Audio System ---
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
      // Selection Pop
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
    } else if (type === "coin-toss") {
      // REALISTIC COIN TOSS (Metallic Ring)
      // We simulate metal by playing multiple non-harmonic sine waves
      const frequencies = [1800, 2200, 3500, 4200];
      frequencies.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Slight detuning for realism
        if (i % 2 === 0)
          osc.frequency.linearRampToValueAtTime(freq - 50, now + 1.5);

        // Sharp attack, long metallic ringing tail
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5); // Ring for 1.5s

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(now + 1.5);
      });
    } else if (type === "coin-land") {
      // COIN CATCH (The Thud)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      // Low frequency thud
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      // Very short burst
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.1);
    } else if (type === "win") {
      // Wheel Win (Magical Chime)
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
    // Hide all
    Object.values(views).forEach((el) => el.classList.add("hidden"));
    Object.values(tabs).forEach((el) => el.classList.remove("active"));

    // Show active
    views[mode].classList.remove("hidden");
    tabs[mode].classList.add("active");

    if (mode === "wheel") resizeCanvas();
  }
  tabs.wheel.onclick = () => switchMode("wheel");
  tabs.coin.onclick = () => switchMode("coin");

  // --- COIN LOGIC (Real Physics) ---
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

    // Play the new Metallic Ring Sound
    playSound("coin-toss");

    // 1. Determine Winner
    const isHeads = Math.random() < 0.5;

    // 2. Calculate Spins (Rotate X for vertical roll)
    // We want at least 5 full rotations (1800deg) + landing angle
    const extraSpins = 1800;
    const targetAngle = isHeads ? 0 : 180;

    let nextRotation = currentRotation + extraSpins;

    // Adjust to land exactly on 0 (Heads) or 180 (Tails)
    const mod = nextRotation % 360;
    let adjustment = targetAngle - mod;
    if (adjustment < 0) adjustment += 360;

    currentRotation = nextRotation + adjustment;

    // 3. Apply Animations
    // A) The Spin
    coinEl.style.transform = `rotateX(${currentRotation}deg)`;

    // B) The Toss (Jump)
    coinJumpWrapper.classList.remove("animate-toss");
    void coinJumpWrapper.offsetWidth; // Trigger reflow
    coinJumpWrapper.classList.add("animate-toss");

    // C) The Shadow
    coinShadow.classList.remove("animate-shadow");
    void coinShadow.offsetWidth;
    coinShadow.classList.add("animate-shadow");

    // 4. Finish
    setTimeout(() => {
      isFlipping = false;
      flipBtn.disabled = false;
      flipBtn.classList.remove("opacity-50");

      const text = isHeads
        ? inputHeads.value || "Heads"
        : inputTails.value || "Tails";
      coinResult.textContent = text;
      coinResult.classList.remove("opacity-0");

      // Play the new Thud Sound (Catch)
      playSound("coin-land");
    }, 2500); // Match CSS animation duration
  };

  // --- WHEEL LOGIC ---
  const canvas = document.getElementById("wheel");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let items = ["Pizza", "Sushi", "Burgers", "Tacos"];
  let wheelAngle = 0;
  let spinning = false;

  // Canvas Size
  function resizeCanvas() {
    // Canvas is fixed size in CSS, internal res is 600
  }

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

    // Border
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();

    items.forEach((item, i) => {
      const ang = wheelAngle + i * arc;
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

    // Center
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
  }

  // Wheel Events
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
        if (spinning) return;
        items.splice(i, 1);
        updateList();
        drawWheel();
      };
      list.appendChild(chip);
    });
    drawWheel();
  }

  document.getElementById("btn-add").onclick = () => {
    if (input.value && !spinning) {
      items.push(input.value);
      input.value = "";
      updateList();
      playSound("pop");
    }
  };
  document.getElementById("btn-clear").onclick = () => {
    if (!spinning) {
      items = [];
      updateList();
    }
  };

  // Presets
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.onclick = () => {
      if (spinning) return;
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

  // Spin Animation
  document.getElementById("spin-btn").onclick = () => {
    if (spinning || items.length === 0) return;
    initAudio();
    spinning = true;
    let vel = Math.random() * 0.5 + 0.5;

    function animate() {
      wheelAngle += vel;
      vel *= 0.99; // Friction
      drawWheel();
      if (vel > 0.002) requestAnimationFrame(animate);
      else {
        spinning = false;
        playSound("win");
        const modal = document.getElementById("result-modal");
        modal.classList.remove("hidden");
        setTimeout(() => modal.classList.remove("opacity-0"), 10);
        document.getElementById("winner-text").innerText = "Destiny Spoken";
      }
    }
    animate();
  };

  document.getElementById("btn-close-modal").onclick = () => {
    const modal = document.getElementById("result-modal");
    modal.classList.add("opacity-0");
    setTimeout(() => modal.classList.add("hidden"), 500);
  };

  // Init
  if (canvas) {
    updateList();
  }
});
