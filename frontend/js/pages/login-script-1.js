  const authCard = document.getElementById('authCard');
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const mobileLoginTab = document.getElementById('mobileLoginTab');
  const mobileSignupTab = document.getElementById('mobileSignupTab');
  const SESSION_KEYS = [
    "userName", "userPhone", "userEmail", "userRole", "userStatus",
    "name", "phone", "email", "role", "status",
    "token", "authToken", "nearServeCsrf", "nearServeLastActivity", "nearServeActiveUntil",
  ];

  if (!sessionStorage.getItem("nearServeBrowserSession")) {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  function showRegister() {
    authCard.classList.add('show-register');
    mobileLoginTab.classList.remove('active');
    mobileSignupTab.classList.add('active');
    history.replaceState(null, '', '#register');
  }

  function showLogin() {
    authCard.classList.remove('show-register');
    mobileSignupTab.classList.remove('active');
    mobileLoginTab.classList.add('active');
    history.replaceState(null, '', '#login');
  }

  showRegisterBtn.addEventListener('click', showRegister);
  showLoginBtn.addEventListener('click', showLogin);
  mobileSignupTab.addEventListener('click', showRegister);
  mobileLoginTab.addEventListener('click', showLogin);
  document.querySelectorAll('[data-auth-target]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.authTarget === 'register') showRegister();
      if (button.dataset.authTarget === 'login') showLogin();
    });
  });

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.closest('.password-box').querySelector('input');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Show' : 'Hide';
      button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });

  if (['#register', '#signup'].includes(window.location.hash.toLowerCase())) {
    showRegister();
  }

  const authRequired = new URLSearchParams(window.location.search).get('auth_required');
  const invalidAccess = new URLSearchParams(window.location.search).get('invalid_access');
  const sessionExpired = new URLSearchParams(window.location.search).get('session_expired');
  const loginError = new URLSearchParams(window.location.search).get('error');
  if (sessionExpired === '1') {
    showToast('Session expired. Please login again.');
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  } else if (loginError === 'google_login') {
    showToast('Google login failed. Please try again.');
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  } else if (authRequired === '1') {
    showToast('Please log in first');
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  } else if (invalidAccess === '1') {
    showToast('Invalid access for this account');
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  }

  const oauthError = new URLSearchParams(window.location.search).get('oauth_error');
  if (oauthError) {
    showToast(oauthError);
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  }

  const oauthSetupToken = new URLSearchParams(window.location.search).get('oauth_setup');
  const oauthLoginCode = new URLSearchParams(window.location.search).get('oauth_code');
  const oauthSetupModal = document.getElementById('oauthSetupModal');
  const oauthPhone = document.getElementById('oauthPhone');
  const oauthRole = document.getElementById('oauthRole');
  const completeOAuthBtn = document.getElementById('completeOAuthBtn');
  if (oauthSetupToken) {
    oauthSetupModal.classList.add('active');
    oauthPhone.focus();
    history.replaceState(null, '', `${window.location.pathname}#login`);
  }

  function storeUserAndRedirect(data) {
    const user = data.user || data;
    if (data.csrfToken) localStorage.setItem("nearServeCsrf", data.csrfToken);
    if (data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("token", data.token);
    }
    sessionStorage.setItem("nearServeBrowserSession", "1");
    localStorage.setItem("nearServeLastActivity", String(Date.now()));
    localStorage.setItem("nearServeActiveUntil", String(Date.now() + 45 * 1000));
    const userName = user.name || "";
    const userPhone = user.phone || "";
    const userEmail = user.email || "";
    const userRole = (user.role || "").toLowerCase();
    const userStatus = (user.status || "").toLowerCase();

    localStorage.setItem("userName", userName);
    localStorage.setItem("userPhone", userPhone);
    localStorage.setItem("userEmail", userEmail);
    localStorage.setItem("userRole", userRole);
    localStorage.setItem("userStatus", userStatus);
    localStorage.setItem("name", userName);
    localStorage.setItem("phone", userPhone);
    localStorage.setItem("email", userEmail);
    localStorage.setItem("role", userRole);
    localStorage.setItem("status", userStatus);
    window.location.href = data.redirectTo || "booking.html";
  }

  if (oauthLoginCode) {
    history.replaceState(null, '', `${window.location.pathname}#login`);
    fetch(`${window.NEARSERVE_API_BASE}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: oauthLoginCode })
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })).catch(() => ({ ok: res.ok, data: {} })))
      .then(({ ok, data }) => {
        if (!ok) {
          showToast(data.error || "Google login failed. Please try again.");
          return;
        }
        storeUserAndRedirect(data);
      })
      .catch(() => {
        showToast("Could not complete Google login. Please try again.");
      });
  }

  completeOAuthBtn.addEventListener('click', async () => {
    const phone = oauthPhone.value.trim();
    const role = oauthRole.value;

    if (!/^[6-9]\d{9}$/.test(phone)) {
      showToast("Please enter a valid phone number");
      return;
    }

    if (!role) {
      showToast("Please select a role");
      return;
    }

    completeOAuthBtn.disabled = true;
    completeOAuthBtn.textContent = "Continuing...";

    try {
      const res = await fetch(`${window.NEARSERVE_API_BASE}/auth/oauth/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken: oauthSetupToken, phone, role })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || "Could not complete Google login");
        return;
      }

      storeUserAndRedirect(data);
    } catch (err) {
      showToast("Server error while completing Google login");
    } finally {
      completeOAuthBtn.disabled = false;
      completeOAuthBtn.textContent = "Continue";
    }
  });

  const emailVerified = new URLSearchParams(window.location.search).get('verified');
  if (emailVerified === '1') {
    showToast('Email verified successfully. You can now log in.', 'success');
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash || '#login'}`);
  }

  document.querySelectorAll('[data-oauth-provider]').forEach((button) => {
    button.addEventListener('click', () => {
      const provider = button.dataset.oauthProvider;
      window.location.href = `${window.NEARSERVE_API_BASE}/auth/${provider}`;
    });
  });

  const forgotLink = document.getElementById('forgotLink');
  const forgotModal = document.getElementById('forgotModal');
  const modalClose = document.getElementById('modalClose');
  const sendResetBtn = document.getElementById('sendResetBtn');
  const resetEmail = document.getElementById('resetEmail');
  const modalForm = document.getElementById('modalForm');
  const modalSuccess = document.getElementById('modalSuccess');

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.classList.add('active');
    resetEmail.value = '';
    modalForm.style.display = 'block';
    modalSuccess.style.display = 'none';
  });

  modalClose.addEventListener('click', () => forgotModal.classList.remove('active'));
  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) forgotModal.classList.remove('active');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') forgotModal.classList.remove('active');
  });

  sendResetBtn.addEventListener('click', async () => {
    const email = resetEmail.value.trim();
    if (!email) {
      resetEmail.focus();
      return;
    }

    sendResetBtn.textContent = 'Sending...';
    sendResetBtn.disabled = true;

    try {
      const res = await fetch(`${window.NEARSERVE_API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        modalForm.style.display = 'none';
        modalSuccess.style.display = 'block';
        setTimeout(() => forgotModal.classList.remove('active'), 4000);
      } else {
        showToast(data.error || data.message || 'Failed to send reset link');
      }
    } catch (err) {
      showToast('Server error while sending reset link');
    } finally {
      sendResetBtn.textContent = 'Send Reset Link';
      sendResetBtn.disabled = false;
    }
  });

  document.getElementById('locRetryBtn').addEventListener('click', () => {
    document.getElementById('locDeniedMsg').style.display = 'none';
    document.getElementById('locDots').style.display = 'flex';
    document.getElementById('locIconWrap').className = 'loc-icon-wrap checking';
    document.getElementById('locIcon').textContent = '📍';
    document.getElementById('locStatus').textContent = 'Detecting your location...';
  });

  document.getElementById('locBackBtn').addEventListener('click', () => {
    document.getElementById('locationOverlay').style.display = 'none';
  });
