window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const msg = document.getElementById("msg");

  function showMsg(text, color = "crimson") {
    msg.style.color = color;
    msg.textContent = text;
  }

  if (!form) {
    alert("Form not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alert("Submit event working");

    showMsg("");

    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();

    try {
      const res = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!res.ok) {
        showMsg(data.error || text || "Login failed");
        return;
      }

      if (!data.token) {
        showMsg("No token received from server");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      window.location.href = "/admin_dashboard.html";
    } catch (err) {
      showMsg("Server not responding");
      console.error(err);
    }
  });
});