const loginForm = document.querySelector('.login-form');
const loginRole = document.getElementById('loginRole');
const adminToggle = document.getElementById('adminToggle');
const loginTitle = document.getElementById('loginTitle');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const errorMessage = document.getElementById('errorMessage');

const url = new URL(window.location.href);
if (url.searchParams.get('error') === '1') {
  errorMessage.hidden = false;
}

function setLoginMode(role) {
  const isOrganizer = role === 'organizer';

  loginRole.value = isOrganizer ? 'organizer' : 'attendee';
  loginTitle.textContent = isOrganizer ? 'Organizer Login' : 'Attendee Login';
  statusMessage.textContent = isOrganizer
    ? 'Admin login routes you to the organizer dashboard when the credentials are correct.'
    : 'Normal login routes you to the attendee page.';
  submitButton.textContent = isOrganizer ? 'Login to organizer' : 'Login to attendee';
  adminToggle.textContent = isOrganizer ? 'Login as attendee' : 'Login as admin';
}

adminToggle.addEventListener('click', () => {
  setLoginMode(loginRole.value === 'organizer' ? 'attendee' : 'organizer');
  errorMessage.hidden = true;
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); 

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  const usernameValue = usernameInput ? usernameInput.value.trim() : '';
  const passwordValue = passwordInput ? passwordInput.value.trim() : '';

  errorMessage.hidden = true;

  if (!usernameValue || !passwordValue) {
    errorMessage.textContent = 'Please fill out all credential fields.';
    errorMessage.hidden = false;
    return;
  }

  if (loginRole.value === 'organizer') {
    if (usernameValue === 'organizer' && passwordValue === 'admin123') {
      window.location.href = '/organizer';
    } else {
      handleLoginError(usernameInput, passwordInput);
    }
  } else {
    if (usernameValue === 'attendee' && passwordValue === 'rsvp123') {
      window.location.href = '/events';
    } else {
      handleLoginError(usernameInput, passwordInput);
    }
  }
});

function handleLoginError(usernameField, passwordField) {

  errorMessage.textContent = 'Invalid credentials. Try the demo login details shown on the left.';
  errorMessage.hidden = false;

  if (usernameField) usernameField.value = '';
  if (passwordField) passwordField.value = '';

  if (usernameField) {
    usernameField.focus();
  }
}