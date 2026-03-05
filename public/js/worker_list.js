const list = document.getElementById("list");
const roleTitle = document.getElementById("roleTitle");

const phone = (localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("role") || "").trim().toLowerCase();
if (!phone || role !== "customer") {
  alert("Please login as customer");
  window.location.href = "login.html";
}

const selectedRole = (localStorage.getItem("selectedServiceRole") || "").trim().toLowerCase();
if (!selectedRole) {
  alert("No service selected. Go back and choose a service.");
  window.location.href = "booking.html";
}

roleTitle.innerText = `Showing available ${selectedRole}s`;

async function loadWorkers() {
  list.innerHTML = "Loading workers...";
  try {
    const res = await fetch(`/workers?role=${encodeURIComponent(selectedRole)}`);
    const workers = await res.json();

    list.innerHTML = "";
    if (!Array.isArray(workers) || workers.length === 0) {
      list.innerHTML = "No workers available right now.";
      return;
    }

    workers.forEach(w => {
      const card = document.createElement("div");
      card.style.border = "1px solid #ccc";
      card.style.borderRadius = "10px";
      card.style.padding = "12px";
      card.style.width = "260px";
      card.style.background = "#fff";
      card.style.cursor = "pointer";

      card.innerHTML = `
        <b>${w.name}</b><br>
        Phone: ${w.phone}<br>
        Email: ${w.email || "-"}<br>
        Rating: ${w.avgRating ?? "New"} (${w.reviewsCount ?? 0})<br>
        <small>Click to view profile</small>
      `;

      card.addEventListener("click", () => {
        // open worker details on new page
        window.location.href = `worker_profile.html?phone=${encodeURIComponent(w.phone)}&role=${encodeURIComponent(selectedRole)}`;
      });

      list.appendChild(card);
    });

  } catch (e) {
    console.log(e);
    list.innerHTML = "Error loading workers.";
  }
}

loadWorkers();