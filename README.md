# Payroll Management Demo - Login Event Logging

This demo records login events (time, IP, browser, location, status) to `localStorage` and restricts viewing of those details to admins only.

Getting started

1) Open `login.html` and sign in (demo password is `password`). Choose a role.
2) On success, an event is recorded and you're redirected:
   - Employee -> `employee-profile.html` (no detailed history shown)
   - Admin -> `admin-login-history.html` (full details visible)

How it works

- `common.js` exposes helpers:
  - `recordLoginEvent(status, extra)` -> stores event with IP, browser, location
  - `getAllLoginEvents()` -> returns sorted events
  - `recordSessionLoginOnce()` -> optional, records a single event per token on first page load
  - `migrateLegacyLoginHistory()` -> imports old `loginHistory_*` entries

Integrating with a custom login flow

```html
<script src="./common.js"></script>
<script>
  // After your server validates credentials:
  localStorage.setItem('authToken', '<token>');
  localStorage.setItem('userRole', userRole); // 'employee' or 'admin'
  localStorage.setItem('username', username);
  // Record event
  recordLoginEvent('Success', { username, role: userRole });
  // Navigate
  window.location.href = userRole === 'admin' ? 'admin-login-history.html' : 'employee-profile.html';
</script>
```

On failed attempt:

```html
recordLoginEvent('Failed', { username });
```

Security note

- This is a front-end demo using public IP/location services; treat it as illustrative only.