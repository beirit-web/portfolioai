(() => {
  const message = document.querySelector('[data-code-expires]');
  if (!message) return;
  const expiresAt = Date.parse(message.dataset.codeExpires);
  const expired = document.querySelector('.local-activation-expired');
  const expire = () => {
    if (Date.now() < expiresAt) return false;
    message.remove();
    if (expired) expired.hidden = false;
    return true;
  };
  if (expire()) return;
  const timer = setInterval(() => { if (expire()) clearInterval(timer); }, 500);
  addEventListener('pageshow', expire);
})();
