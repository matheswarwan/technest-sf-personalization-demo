/**
 * account.js — Identity management + SF Personalization setUser event
 *
 * User state persists in sessionStorage (cleared when browser closes).
 * On sign-in, fires a SF Personalization event with identity attributes
 * to stitch the anonymous visitor profile to a known identity.
 */

(function () {
  'use strict';

  const USER_KEY = 'technest_user';

  // ─────────────────────────────────────────────
  // State helpers
  // ─────────────────────────────────────────────
  function getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveUser(user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    updateGreeting();
    window.dispatchEvent(new CustomEvent('user:updated', { detail: user }));
  }

  function clearUser() {
    sessionStorage.removeItem(USER_KEY);
    updateGreeting();
    window.dispatchEvent(new CustomEvent('user:updated', { detail: null }));
  }

  // ─────────────────────────────────────────────
  // Greeting in header
  // ─────────────────────────────────────────────
  function updateGreeting() {
    const user = getUser();
    document.querySelectorAll('#user-greeting').forEach(el => {
      if (user) {
        el.textContent = 'Hi, ' + user.firstName + '!';
      } else {
        el.textContent = '';
      }
    });
  }

  // ─────────────────────────────────────────────
  // SF Personalization: fire identity event
  // ─────────────────────────────────────────────
  function fireIdentityEvent(user) {
    const attributes = {
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email
    };

    if (user.contactKey) {
      attributes.contactKey = user.contactKey;
    }

    const payload = {
      interaction: { name: 'Identity : Set User' },
      user: { attributes }
    };

    console.group('[TechNest P13n] Identity event');
    console.log('User:', user);
    console.log('Payload:', payload);
    console.groupEnd();

    window.__p13n && window.__p13n.sendEvent(payload);
    return payload;
  }

  // ─────────────────────────────────────────────
  // Account page rendering
  // ─────────────────────────────────────────────
  function renderAccountPage() {
    const signinPanel   = document.getElementById('signin-panel');
    const loggedinPanel = document.getElementById('loggedin-panel');
    if (!signinPanel || !loggedinPanel) return;

    const user = getUser();

    // Update live preview of identity event payload as user types
    function updatePreview() {
      const preview = document.getElementById('identity-event-preview');
      if (!preview) return;
      const nameEl  = document.getElementById('signin-name');
      const emailEl = document.getElementById('signin-email');
      const keyEl   = document.getElementById('signin-sfmc-id');
      const name    = nameEl ? nameEl.value : '';
      const email   = emailEl ? emailEl.value : '';
      const key     = keyEl ? keyEl.value : '';
      const parts   = name.trim().split(' ');

      const previewObj = {
        interaction: { name: 'Identity : Set User' },
        user: {
          attributes: {
            firstName:  parts[0] || '…',
            lastName:   parts.slice(1).join(' ') || '…',
            email:      email || '…'
          }
        }
      };
      if (key) previewObj.user.attributes.contactKey = key;
      preview.querySelector('code').textContent = JSON.stringify(previewObj, null, 2);
    }

    if (user) {
      signinPanel.style.display   = 'none';
      loggedinPanel.style.display = 'block';

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('loggedin-name', user.firstName);
      setEl('profile-name',  user.firstName + ' ' + user.lastName);
      setEl('profile-email', user.email);
      setEl('profile-contact-key', user.contactKey ? 'Contact Key: ' + user.contactKey : '');

      const avatar = document.getElementById('profile-avatar');
      if (avatar) avatar.textContent = user.firstName.charAt(0).toUpperCase();

      const firedDisplay = document.getElementById('fired-event-display');
      if (firedDisplay) {
        const payload = {
          interaction: { name: 'Identity : Set User' },
          user: { attributes: { firstName: user.firstName, lastName: user.lastName, email: user.email, ...(user.contactKey ? { contactKey: user.contactKey } : {}) } }
        };
        firedDisplay.querySelector('code').textContent = JSON.stringify(payload, null, 2);
      }

      const signoutBtn = document.getElementById('signout-btn');
      if (signoutBtn) {
        signoutBtn.onclick = function () {
          clearUser();
          renderAccountPage();
          showToast && showToast('Signed out.', 'success');
        };
      }

    } else {
      signinPanel.style.display   = 'block';
      loggedinPanel.style.display = 'none';

      // Wire live preview
      ['signin-name', 'signin-email', 'signin-sfmc-id'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
      });

      // Wire form submit
      const form = document.getElementById('signin-form');
      if (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          const nameVal  = document.getElementById('signin-name').value.trim();
          const emailVal = document.getElementById('signin-email').value.trim();
          const keyVal   = document.getElementById('signin-sfmc-id').value.trim();

          if (!nameVal || !emailVal) {
            showToast && showToast('Please fill in Name and Email.', 'error');
            return;
          }

          const parts = nameVal.split(' ');
          const user = {
            firstName:  parts[0],
            lastName:   parts.slice(1).join(' ') || '',
            email:      emailVal,
            contactKey: keyVal || null
          };

          saveUser(user);
          fireIdentityEvent(user);
          renderAccountPage();
          showToast && showToast('Signed in! Identity event fired.', 'success');
        };
      }
    }
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    updateGreeting();
    if (window.location.pathname.endsWith('account.html')) {
      renderAccountPage();
    }
  });

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────
  window.TechNestAccount = {
    getUser:    getUser,
    saveUser:   saveUser,
    clearUser:  clearUser,
    fireIdentityEvent
  };

})();
