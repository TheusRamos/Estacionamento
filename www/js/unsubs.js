const _fns = [];

export function registerUnsub(fn) {
  if (typeof fn === 'function') _fns.push(fn);
}

window.addEventListener('beforeunload', () => {
  _fns.forEach(fn => { try { fn(); } catch (_) {} });
  _fns.length = 0;
});
