// ============================================
// FAM Pass — Feedback Form Handler
// ============================================

(function () {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const messageEl = document.getElementById('feedbackMessage');
  const COOLDOWN_MS = 60000; // 60 seconds

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Rate limit check
    const lastSubmit = localStorage.getItem('fp_last_feedback');
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < COOLDOWN_MS) {
      showMessage('Please wait a moment before submitting again.', 'error');
      return;
    }

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    if (!name || !email || !message) {
      showMessage('Please fill in all fields.', 'error');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await db.collection('feedback').add({
        name: name,
        email: email,
        message: message,
        source: 'website',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      localStorage.setItem('fp_last_feedback', Date.now().toString());
      form.reset();
      showMessage('Thank you for your feedback! We\'ll get back to you soon.', 'success');
    } catch (err) {
      console.error('Feedback submission error:', err);
      showMessage('Something went wrong. Please try emailing us at dev@fampass.io instead.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'form-message form-message--' + type;
  }
})();
