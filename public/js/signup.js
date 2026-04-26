const SIGNUP_API_BASE = "http://localhost:5000/api";

// -----------------------------
// Particle background
// -----------------------------
const signupCanvas = document.getElementById("particleCanvas");
const signupCtx = signupCanvas ? signupCanvas.getContext("2d") : null;
let signupParticles = [];

function resizeSignupCanvas() {
  if (!signupCanvas) return;
  signupCanvas.width = window.innerWidth;
  signupCanvas.height = window.innerHeight;
}

class SignupParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * signupCanvas.width;
    this.y = Math.random() * signupCanvas.height;
    this.size = Math.random() * 1.8 + 0.4;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;

    const colors = [
      "rgba(59,130,246,",
      "rgba(13,148,136,",
      "rgba(29,78,216,",
      "rgba(99,102,241,",
      "rgba(20,184,166,"
    ];

    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.alpha = Math.random() * 0.45 + 0.1;
    this.life = 0;
    this.maxLife = Math.random() * 300 + 200;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;

    if (this.life > this.maxLife) this.reset();
    if (
      this.x < 0 ||
      this.x > signupCanvas.width ||
      this.y < 0 ||
      this.y > signupCanvas.height
    ) {
      this.reset();
    }
  }

  draw() {
    const fade =
      this.life < 40
        ? this.life / 40
        : this.life > this.maxLife - 40
        ? (this.maxLife - this.life) / 40
        : 1;

    signupCtx.beginPath();
    signupCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    signupCtx.fillStyle = this.color + this.alpha * fade + ")";
    signupCtx.fill();
  }
}

function drawSignupConnections() {
  for (let i = 0; i < signupParticles.length; i++) {
    for (let j = i + 1; j < signupParticles.length; j++) {
      const dx = signupParticles[i].x - signupParticles[j].x;
      const dy = signupParticles[i].y - signupParticles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 100) {
        signupCtx.beginPath();
        signupCtx.moveTo(signupParticles[i].x, signupParticles[i].y);
        signupCtx.lineTo(signupParticles[j].x, signupParticles[j].y);
        signupCtx.strokeStyle = "rgba(59,130,246," + 0.06 * (1 - dist / 100) + ")";
        signupCtx.lineWidth = 0.5;
        signupCtx.stroke();
      }
    }
  }
}

function animateSignupParticles() {
  if (!signupCanvas || !signupCtx) return;
  signupCtx.clearRect(0, 0, signupCanvas.width, signupCanvas.height);
  drawSignupConnections();
  signupParticles.forEach((particle) => {
    particle.update();
    particle.draw();
  });
  requestAnimationFrame(animateSignupParticles);
}

if (signupCanvas && signupCtx) {
  resizeSignupCanvas();
  window.addEventListener("resize", resizeSignupCanvas);

  for (let i = 0; i < 80; i++) {
    const particle = new SignupParticle();
    particle.life = Math.random() * particle.maxLife;
    signupParticles.push(particle);
  }

  animateSignupParticles();
}

// -----------------------------
// Signup form
// -----------------------------
const signupForm = document.getElementById("signupForm");
const signupBtn = signupForm ? signupForm.querySelector("#signupBtn") : null;

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = signupForm.querySelector("#name");
    const emailInput = signupForm.querySelector("#email");
    const phoneInput = signupForm.querySelector("#phone");
    const passwordInput = signupForm.querySelector("#password");
    const roleInput = signupForm.querySelector("#role");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    if (!name || !email || !phone || !password || !role) {
      showToast("Please fill all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }

    if (phone.length < 10) {
      showToast("Please enter a valid phone number.");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = "Creating Account...";

    try {
      const res = await fetch(`${SIGNUP_API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Signup failed");
        return;
      }

      showToast("Signup successful! Please login.", "success");

      nameInput.value = "";
      emailInput.value = "";
      phoneInput.value = "";
      passwordInput.value = "";
      roleInput.value = "";

      window.location.href = "login.html";
    } catch (error) {
      console.error("Signup error:", error);
      showToast("Server error during signup");
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Sign Up";
    }
  });
}
