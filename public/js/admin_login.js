const form = document.getElementById("adminLoginForm");
const msg = document.getElementById("msg");

function showMsg(text, color = "crimson") {
  msg.style.color = color;
  msg.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg("");

  const username = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value.trim();

  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    // Read as text first (handles 404/html responses safely)
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      showMsg(data.error || text || "Login failed");
      return;
    }

    if (!data.token) {
      showMsg("No token received from server. Check /admin/login route.");
      return;
    }

    localStorage.setItem("adminToken", data.token);
    window.location.href = "/admin_dashboard.html";

  } catch (err) {
    showMsg("Server not responding. Make sure server.js is running and /admin/login exists.");
  }
});