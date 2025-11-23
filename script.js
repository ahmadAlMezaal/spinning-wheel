document.addEventListener("DOMContentLoaded", () => {
  // --- Global State ---
  let audioCtx = null;
  function initAudio() {
    try {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log("Audio init failed (user interaction needed first)");
    }
  }

  // --- Elements ---
  const tabWheel = document.getElementById("tab-wheel");
  const tabCoin = document.getElementById("tab-coin");
  const wheelView = document.getElementById("view-wheel");
  const coinView = document.getElementById("view-coin");

  const input = document.getElementById("new-choice");
  const listContainer = document.getElementById("choice-list");
  const btnAdd = document.getElementById("btn-add");
  const btnClear = document.getElementById("btn-clear");
  const spinBtn = document.getElementById("spin-btn");
  const canvas = document.getElementById("wheel");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const pointer = document.getElementById("pointer");
  const battleMode = document.getElementById("battle-mode");

  const modal = document.getElementById("result-modal");
  const modalContent = document.getElementById("result-content");
  const winnerText = document.getElementById("winner-text");
  const btnCloseModal = document.getElementById("btn-close-modal");

  const coinEl = document.getElementById("coin");
  const coinResultEl = document.getElementById("coin-result");
  const flipBtn = document.getElementById("flip-btn");
  const inputHeads = document.getElementById("input-heads");
  const inputTails = document.getElementById("input-tails");

  // --- NAVIGATION LOGIC ---
  function switchMode(mode) {
    if (mode === "wheel") {
      wheelView.classList.remove("hidden");
      coinView.classList.add("hidden");
      tabWheel.classList.add("active");
      tabCoin.classList.remove("active");
      resizeCanvas();
    } else {
      wheelView.classList.add("hidden");
      coinView.classList.remove("hidden");
      tabWheel.classList.remove("active");
      tabCoin.classList.add("active");
    }
  }

  // Bind Nav Events
  tabWheel.addEventListener("click", () => switchMode("wheel"));
  tabCoin.addEventListener("click", () => switchMode("coin"));

  // --- COIN FLIP LOGIC ---
  let coinRotation = 0;
  let isFlipping = false;

  function playCoinSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(now + 0.6);
  }

  function flipCoin() {
    if (isFlipping) return;
    initAudio();
    isFlipping = true;
    flipBtn.disabled = true;
    flipBtn.classList.add("opacity-50");
    coinResultEl.classList.remove("opacity-100");
    coinResultEl.classList.add("opacity-0");

    playCoinSound();

    // Logic
    const result = Math.random() < 0.5 ? "heads" : "tails";

    // We use ROTATE X for vertical spin
    const baseSpins = 1800; // 5 full rotations
    const targetAngle = result === "heads" ? 0 : 180;

    let nextRotation = coinRotation + baseSpins;
    const mod = nextRotation % 360;
    let adjustment = targetAngle - mod;
    if (adjustment < 0) adjustment += 360;

    coinRotation = nextRotation + adjustment;

    // Apply transform (X-AXIS)
    coinEl.style.transform = `rotateX(${coinRotation}deg)`;

    setTimeout(() => {
      isFlipping = false;
      flipBtn.disabled = false;
      flipBtn.classList.remove("opacity-50");

      // Get custom text from inputs
      const valHeads = inputHeads.value || "Heads";
      const valTails = inputTails.value || "Tails";

      // Show Result
      coinResultEl.innerText = result === "heads" ? valHeads : valTails;
      coinResultEl.classList.remove("opacity-0");
      coinResultEl.classList.add("opacity-100");

      // Win sound
      if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(
          result === "heads" ? 880 : 600,
          audioCtx.currentTime
        );
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.3
        );
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    }, 3000); // Match CSS transition time
  }

  // Bind Coin Events
  if (flipBtn) flipBtn.addEventListener("click", flipCoin);

  // --- WHEEL LOGIC ---
  const colors = [
    "#C026D3",
    "#4F46E5",
    "#0891B2",
    "#059669",
    "#D97706",
    "#E11D48",
    "#7C3AED",
  ];
  let items = ["Pizza", "Sushi", "Tacos", "Burgers"];
  let currentAngle = 0;
  let isSpinning = false;
  let spinVelocity = 0;
  let spinDeceleration = 0.99;
  let lastSegmentIndex = -1;
  let pointerAngle = 0;

  function resizeCanvas() {
    // Ensures the canvas looks sharp
  }

  // Attach Listeners for dynamic content (Event Delegation)
  listContainer.addEventListener("click", (e) => {
    // Check if the click is on a button or icon inside a button
    const btn = e.target.closest("button");
    if (!btn) return;

    // Find the chip index based on visual order
    // (Simple implementation: Remove by text value for robustness or map index)
    // Since we rebuild the list, finding the index in DOM matches array index
    const chip = btn.closest(".choice-chip");
    const index = Array.from(listContainer.children).indexOf(chip);

    if (index > -1) removeChoice(index);
  });

  // Helper: Add Choice
  function addChoice() {
    const val = input.value.trim();
    if (val) {
      items.push(val);
      input.value = "";
      renderList();
      drawWheel();
      playPopSound();
    }
    input.focus();
  }

  // Helper: Remove Choice
  function removeChoice(index) {
    if (isSpinning) return;
    items.splice(index, 1);
    renderList();
    drawWheel();
  }

  // Helper: Clear
  function clearChoices() {
    if (isSpinning) return;
    items = [];
    renderList();
    drawWheel();
  }

  // Helper: Load Preset
  function loadPreset(type) {
    if (isSpinning) return;
    if (type === "food")
      items = ["Pizza", "Sushi", "Burgers", "Salad", "Tacos", "Pasta", "Curry"];
    if (type === "yesno") items = ["Yes", "No", "Definitely", "Nope"];
    if (type === "dice")
      items = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    if (type === "activity")
      items = [
        "Watch a Movie",
        "Read a Book",
        "Go for a Walk",
        "Code",
        "Sleep",
        "Clean Room",
      ];
    renderList();
    drawWheel();
  }

  // Bind Wheel Events
  if (input)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addChoice();
    });
  if (btnAdd) btnAdd.addEventListener("click", addChoice);
  if (btnClear) btnClear.addEventListener("click", clearChoices);
  if (spinBtn) spinBtn.addEventListener("click", startSpin);

  // Bind Presets
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => loadPreset(btn.dataset.type));
  });

  // Bind Modal
  function closeModal() {
    modal.classList.add("opacity-0");
    modalContent.classList.add("scale-90");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 500);
  }
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);

  // Render Functions
  function renderList() {
    listContainer.innerHTML = "";
    if (items.length === 0) {
      listContainer.innerHTML =
        '<p class="text-slate-500 text-center w-full mt-4 italic">The void is empty...</p>';
      return;
    }
    items.forEach((item, index) => {
      const chip = document.createElement("div");
      chip.className =
        "choice-chip bg-slate-700 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm border border-slate-600 shadow-sm";
      // Note: The button click is handled by listContainer event listener above
      chip.innerHTML = `<span>${item}</span><button class="text-slate-400 hover:text-red-400 transition"><i class="fas fa-times pointer-events-none"></i></button>`;
      listContainer.appendChild(chip);
    });
  }

  function playPopSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function playTick() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  function playWinSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.1 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 3);
    });
  }

  function drawWheel() {
    if (!ctx) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 280;
    const drawItems = items.length > 0 ? items : ["?"];
    const arcSize = (2 * Math.PI) / drawItems.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#a855f7";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    drawItems.forEach((item, index) => {
      const startAngle = currentAngle + index * arcSize;
      const endAngle = startAngle + arcSize;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.stroke();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Quicksand";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      let text = item;
      if (text.length > 18) text = text.substring(0, 16) + "...";
      ctx.fillText(text, radius - 30, 8);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "#d946ef";
    ctx.shadowColor = "#d946ef";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function startSpin() {
    if (isSpinning) return;
    if (items.length === 0) {
      input.focus();
      playPopSound();
      return;
    }
    initAudio();
    isSpinning = true;
    spinBtn.classList.add("opacity-50", "cursor-not-allowed");
    input.disabled = true;
    spinVelocity = Math.random() * 0.3 + 0.5;
    lastSegmentIndex = -1;
  }

  function loop() {
    if (isSpinning) {
      currentAngle += spinVelocity;
      spinVelocity *= spinDeceleration;
      if (currentAngle >= Math.PI * 2) currentAngle -= Math.PI * 2;

      const numSegments = items.length || 1;
      const arcSize = (Math.PI * 2) / numSegments;
      const rotation = currentAngle % (Math.PI * 2);
      const pointerTheta = (3 * Math.PI) / 2 - rotation;

      let normalizedTheta = pointerTheta;
      while (normalizedTheta < 0) normalizedTheta += Math.PI * 2;
      while (normalizedTheta >= Math.PI * 2) normalizedTheta -= Math.PI * 2;

      const currentIndex = Math.floor(normalizedTheta / arcSize);

      if (currentIndex !== lastSegmentIndex && spinVelocity > 0.01) {
        playTick();
        lastSegmentIndex = currentIndex;
        pointerAngle = -25;
      }
      if (spinVelocity < 0.0015) {
        isSpinning = false;
        spinVelocity = 0;
        finishSpin(currentIndex);
      }
    }
    pointerAngle *= 0.9;
    pointer.style.transform = `translateX(-50%) rotate(${pointerAngle}deg)`;
    drawWheel();
    updateAndDrawParticles();
    requestAnimationFrame(loop);
  }

  function finishSpin(winnerIndex) {
    input.disabled = false;
    spinBtn.classList.remove("opacity-50", "cursor-not-allowed");
    const winner = items[winnerIndex];
    if (battleMode.checked) {
      items.splice(winnerIndex, 1);
      renderList();
    }
    playWinSound();
    spawnParticles();
    setTimeout(() => {
      winnerText.innerText = winner;
      modal.classList.remove("hidden");
      void modal.offsetWidth;
      modal.classList.remove("opacity-0");
      modalContent.classList.remove("scale-90");
    }, 500);
  }

  let particles = [];
  const particleColors = ["#F472B6", "#A78BFA", "#34D399", "#FBBF24"];
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = 1.0;
      this.decay = Math.random() * 0.01 + 0.01;
      this.color =
        particleColors[Math.floor(Math.random() * particleColors.length)];
      this.size = Math.random() * 4 + 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      this.vy += 0.15;
      this.vx *= 0.95;
    }
    draw(ctx) {
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.size, this.size);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }
  function spawnParticles() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    for (let i = 0; i < 80; i++)
      particles.push(new Particle(centerX, centerY - 150));
  }
  function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // Initialization
  init();
  function init() {
    if (!canvas) return;
    renderList();
    drawWheel();
    loop();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }
});
