  // Get token from URL
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');

  // If no token in URL, show invalid view immediately
  if (!token) {
    document.getElementById('formView').style.display    = 'none';
    document.getElementById('invalidView').style.display = 'block';
  } else {
    // Verify token is still valid on page load
    fetch(`${window.NEARSERVE_API_BASE}/auth/verify-reset-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (!data.valid) {
          document.getElementById('formView').style.display    = 'none';
          document.getElementById('invalidView').style.display = 'block';
        }
      })
      .catch(() => {
        // If server unreachable, still show form (server will validate on submit)
      });
  }

  // Toggle eye icon
  function toggleEye(inputId, btn) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.style.color = isHidden ? 'rgba(56,232,198,0.8)' : 'rgba(255,255,255,0.4)';
  }

  // Password strength meter
  document.getElementById('newPassword').addEventListener('input', function () {
    const val = this.value;
    const bars   = [document.getElementById('s1'), document.getElementById('s2'),
                    document.getElementById('s3'), document.getElementById('s4')];
    const label  = document.getElementById('strengthLabel');

    let score = 0;
    if (val.length >= 8)  score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ['', '#f5576c', '#fbbf24', '#38e8c6', '#4f8ef7'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

    bars.forEach((b, i) => {
      b.style.background = i < score ? colors[score] : 'rgba(255,255,255,0.12)';
    });
    label.textContent = val ? labels[score] || 'Weak' : 'Password strength';
    label.style.color = val ? colors[score] : 'rgba(255,255,255,0.4)';
  });

  // Submit reset
  async function submitReset() {
    const newPassword     = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const matchError      = document.getElementById('matchError');
    const newInput        = document.getElementById('newPassword');
    const confirmInput    = document.getElementById('confirmPassword');
    const btn             = document.getElementById('resetBtn');

    // Clear errors
    matchError.style.display = 'none';
    newInput.classList.remove('error');
    confirmInput.classList.remove('error');

    if (!newPassword) {
      newInput.classList.add('error');
      newInput.placeholder = 'Please enter a password!';
      setTimeout(() => { newInput.classList.remove('error'); newInput.placeholder = 'New Password'; }, 2000);
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      newInput.classList.add('error');
      matchError.textContent = 'Password must be at least 8 characters and include one uppercase letter and one special character!';
      matchError.style.display = 'block';
      return;
    }

    if (!confirmPassword) {
      confirmInput.classList.add('error');
      confirmInput.placeholder = 'Please confirm your password!';
      setTimeout(() => { confirmInput.classList.remove('error'); confirmInput.placeholder = 'Confirm New Password'; }, 2000);
      return;
    }

    if (newPassword !== confirmPassword) {
      confirmInput.classList.add('error');
      matchError.textContent = 'Passwords do not match!';
      matchError.style.display = 'block';
      return;
    }

    btn.textContent = 'Resetting...';
    btn.disabled = true;

    try {
      const res  = await fetch(`${window.NEARSERVE_API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        document.getElementById('formView').style.display    = 'none';
        document.getElementById('successView').style.display = 'block';
      } else {
        if (data.error === 'Invalid or expired token') {
          document.getElementById('formView').style.display    = 'none';
          document.getElementById('invalidView').style.display = 'block';
        } else {
          matchError.textContent = data.error;
          matchError.style.display = 'block';
          btn.textContent = 'Reset Password';
          btn.disabled = false;
        }
      }
    } catch (err) {
      matchError.textContent = 'Server error. Please try again.';
      matchError.style.display = 'block';
      btn.textContent = 'Reset Password';
      btn.disabled = false;
    }
  }
