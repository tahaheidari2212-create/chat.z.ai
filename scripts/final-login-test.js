// Final login verification script (run via agent-browser eval)
(async () => {
  function setNative(el, v) {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    s.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const u = document.querySelector('#username')
  const p = document.querySelector('#password')
  setNative(u, 'taha')
  setNative(p, 'taha2212')
  document.querySelector('form').requestSubmit()
  await new Promise((r) => setTimeout(r, 2500))
  const h1 = document.querySelector('main h1')
  if (h1 && h1.textContent.includes('داشبورد')) return 'TAHA_LOGIN_OK'
  const err = document.querySelector('.text-sm.text-red-600')
  return 'RESULT: ' + (err ? err.textContent : 'unknown')
})()
