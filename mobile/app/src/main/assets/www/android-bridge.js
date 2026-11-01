(function () {
  if (!window.AndroidApp) return;
  if (window.__ANDROID_BRIDGE_READY__) return;
  window.__ANDROID_BRIDGE_READY__ = true;

  const listeners = [];
  window.__androidReceive = function (json) {
    let data;
    try { data = typeof json === 'string' ? JSON.parse(json) : json; }
    catch (e) { console.warn('android bridge: bad json', e); return; }
    listeners.forEach(fn => {
      try { fn({ data: data }); } catch (e) { console.error(e); }
    });
  };

  window.chrome = window.chrome || {};
  window.chrome.webview = {
    postMessage: function (obj) {
      try { window.AndroidApp.post(JSON.stringify(obj)); }
      catch (e) { console.warn('android bridge post failed', e); }
    },
    addEventListener: function (type, fn) {
      if (type === 'message' && typeof fn === 'function') listeners.push(fn);
    },
    removeEventListener: function (type, fn) {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    }
  };
})();
