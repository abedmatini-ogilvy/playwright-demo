const form = document.getElementById('register-form');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  if (!email) {
    message.textContent = 'Email is required.';
    message.style.color = 'crimson';
    return;
  }

  if (password !== confirm) {
    message.textContent = 'Passwords do not match.';
    message.style.color = 'crimson';
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      message.textContent = `Welcome, ${data.user.email}!`;
      message.style.color = 'green';
      form.reset();
    } else {
      message.textContent = 'Registration failed.';
      message.style.color = 'crimson';
    }
  } catch (err) {
    message.textContent = 'Network error.';
    message.style.color = 'crimson';
  }
});
