// js/signup.js
const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value;
    const role = form.role.value; // 🔹 Get role from dropdown

    if (!role) {
        alert("Please select your role!");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message); // Signup successful
            window.location.href = "login.html"; // Redirect to login
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Signup failed. Try again.");
    }
});