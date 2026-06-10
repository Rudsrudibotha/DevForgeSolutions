window.__authDisabled = false;

window.isAuthDisabled = function isAuthDisabled() {
  return window.__authDisabled === true;
};

window.__testAuthReady = fetch('/api/config')
  .then((response) => response.json())
  .then((config) => {
    window.__appConfig = config || {};

    if (!config?.authDisabled || !config.testSession) {
      return config;
    }

    window.__authDisabled = true;
    localStorage.setItem('smsToken', config.testSession.token);
    localStorage.setItem('smsUser', JSON.stringify(config.testSession.user));
    localStorage.setItem('smsLastActivity', String(Date.now()));
    return config;
  })
  .catch(() => ({}));

window.bootPortal = function bootPortal(callback) {
  const run = () => {
    if (typeof callback === 'function') {
      callback();
    }
  };

  if (window.__testAuthReady) {
    window.__testAuthReady.then(run).catch(run);
    return;
  }

  run();
};
