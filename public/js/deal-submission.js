// ============================================
// FAM Pass — Business Deal Submission Handler
// ============================================

(function () {
  const form = document.getElementById('dealForm');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const messageEl = document.getElementById('dealMessage');
  const COOLDOWN_MS = 60000; // 60 seconds

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Honeypot: real users never fill a hidden field. Pretend success for
    // bots so they don't retry, but never write to Firestore.
    const hp = form.querySelector('[name="hp"]');
    if (hp && hp.value.trim() !== '') {
      form.reset();
      showMessage('Thanks! We\'ll be in touch if it\'s a fit.', 'success');
      return;
    }

    // Rate limit check
    const lastSubmit = localStorage.getItem('fp_last_deal_submission');
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < COOLDOWN_MS) {
      showMessage('Please wait a moment before submitting again.', 'error');
      return;
    }

    const businessName = form.querySelector('[name="businessName"]').value.trim();
    const contactEmail = form.querySelector('[name="contactEmail"]').value.trim();
    const dealDescription = form.querySelector('[name="dealDescription"]').value.trim();
    const expirationDate = form.querySelector('[name="expirationDate"]').value;
    const logoUrl = form.querySelector('[name="logoUrl"]').value.trim();

    if (!businessName || !contactEmail || !dealDescription || !expirationDate) {
      showMessage('Please fill in all required fields.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    // Expiration must be today or later — a deal that's already expired
    // isn't worth reviewing.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate + 'T00:00:00');
    if (isNaN(expDate.getTime()) || expDate < today) {
      showMessage('Please choose an expiration date today or in the future.', 'error');
      return;
    }

    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      showMessage('Logo/image should be a link starting with http:// or https://.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await db.collection('deal_submissions').add({
        businessName: businessName,
        contactEmail: contactEmail,
        dealDescription: dealDescription,
        expirationDate: expirationDate,
        logoUrl: logoUrl || null,
        source: 'website',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      localStorage.setItem('fp_last_deal_submission', Date.now().toString());
      form.reset();
      showMessage('Thanks! We review every submission — you\'ll hear from us at the email you provided if it\'s a fit.', 'success');
    } catch (err) {
      console.error('Deal submission error:', err);
      showMessage('Something went wrong. Please try emailing us at dev@fampass.io instead.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Your Deal';
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'form-message form-message--' + type;
  }
})();
