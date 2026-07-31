document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('auth-form');
  const roleSelect = document.getElementById('auth-role');
  const inviteCodeContainer = document.getElementById('invite-code-container');
  const inviteCodeInput = document.getElementById('auth-invite-code');
  const formSubmitBtn = document.getElementById('auth-submit-btn');
  const toggleAuthModeLink = document.getElementById('toggle-auth-mode');
  const authTitle = document.getElementById('auth-title');
  const errorMessageEl = document.getElementById('auth-error-message');

  // Track state: 'login' or 'signup'
  let currentMode = 'login';

  // 1. DYNAMIC UI TOGGLE (Show/Hide Invite Code Based on Role & Mode)
  function updateUiState() {
    if (currentMode === 'signup' && roleSelect.value === 'organizer') {
      inviteCodeContainer.style.display = 'block';
      inviteCodeInput.setAttribute('required', 'true');
    } else {
      inviteCodeContainer.style.display = 'none';
      inviteCodeInput.removeAttribute('required');
      inviteCodeInput.value = ''; // Reset input text cleanly
    }
  }

  roleSelect.addEventListener('change', updateUiState);

  // 2. TOGGLE BETWEEN LOGIN AND SIGNUP MODES
  toggleAuthModeLink.addEventListener('click', (e) => {
    e.preventDefault();
    hideError();

    if (currentMode === 'login') {
      currentMode = 'signup';
      authTitle.textContent = 'Create Secure Account';
      formSubmitBtn.textContent = 'Register Account';
      toggleAuthModeLink.textContent = 'Already have an account? Sign In';
    } else {
      currentMode = 'login';
      authTitle.textContent = 'Secure Portal Sign In';
      formSubmitBtn.textContent = 'Authenticate';
      toggleAuthModeLink.textContent = "Don't have an account? Sign Up";
    }
    updateUiState();
  });

  // 3. ASYNC FORM INTERCEPTION & PAYLOAD DISPATCH
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const role = roleSelect.value;
    const inviteCode = inviteCodeInput.value.trim();

    // Prepare endpoint path dynamically based on state
    const targetEndpoint = currentMode === 'login' ? '/login' : '/signup';

    const payload = { username, password, role };
    if (currentMode === 'signup' && role === 'organizer') {
      payload.inviteCode = inviteCode;
    }

    try {
      formSubmitBtn.disabled = true;
      formSubmitBtn.textContent = 'Processing request...';

      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success && data.redirect) {
        // Safe navigation to protected panel layout returned directly by server
        window.location.href = data.redirect;
      } else {
        // Display exact validation fault string handled from server catch block
        showError(data.error || 'Authentication framework rejection.');
        resetSubmitButton();
      }
    } catch (err) {
      console.error('Network transport error:', err);
      showError('Unable to connect to security server. Verify your internet connection.');
      resetSubmitButton();
    }
  });

  // HELPER UTILITIES
  function showError(msg) {
    errorMessageEl.textContent = `⚠️ ${msg}`;
    errorMessageEl.style.display = 'block';
  }

  function hideError() {
    errorMessageEl.textContent = '';
    errorMessageEl.style.display = 'none';
  }

  function resetSubmitButton() {
    formSubmitBtn.disabled = false;
    formSubmitBtn.textContent = currentMode === 'login' ? 'Authenticate' : 'Register Account';
  }
});