/* ---------------------------------------------------------------------------
 * Derma AI SaaS — embeddable chat widget
 *
 * Usage (one line, on any website):
 *   <script src="https://dermaspaceng.com/derma-widget.js"
 *           data-derma-key="dk_xxx" defer></script>
 *
 * Runs on OUR AI credits. No API key required on the customer's side.
 * Fully rebrandable (name, color, welcome message, logo) from the tenant
 * dashboard. Rendered inside a Shadow DOM so host-site CSS can't bleed in
 * and the widget's CSS can't leak out. No gradients, no shadows.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict'

  // Resolve the API origin from this script's own src so it works no
  // matter what domain the tenant embeds it on.
  var current = document.currentScript
  if (!current) {
    var scripts = document.getElementsByTagName('script')
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('derma-widget.js') !== -1) {
        current = scripts[i]
        break
      }
    }
  }
  if (!current) return

  var KEY = current.getAttribute('data-derma-key')
  if (!KEY) {
    console.error('[derma-widget] Missing data-derma-key attribute.')
    return
  }
  var ORIGIN = new URL(current.src).origin

  // Stable anonymous visitor id for rate-limiting + transcript grouping.
  var VISITOR = ''
  try {
    VISITOR = localStorage.getItem('derma_widget_visitor') || ''
    if (!VISITOR) {
      VISITOR = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('derma_widget_visitor', VISITOR)
    }
  } catch (e) {
    VISITOR = 'v_' + Math.random().toString(36).slice(2)
  }

  var cfg = {
    brandName: 'Assistant',
    assistantName: 'Assistant',
    brandColor: '#7B2D8E',
    welcomeMessage: 'Hi! How can I help you today?',
    logoUrl: null,
    launcherLabel: 'Chat with us',
    active: true,
  }
  var messages = [] // { role, content }
  var open = false
  var busy = false

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  // Readable text color for the brand color (black or white).
  function contrast(hex) {
    var h = hex.replace('#', '')
    if (h.length === 8) h = h.slice(0, 6)
    if (h.length !== 6) return '#ffffff'
    var r = parseInt(h.slice(0, 2), 16)
    var g = parseInt(h.slice(2, 4), 16)
    var b = parseInt(h.slice(4, 6), 16)
    var yiq = (r * 299 + g * 587 + b * 114) / 1000
    return yiq >= 140 ? '#111111' : '#ffffff'
  }

  // Load the Dermaspace brand font (Lexend Deca) into the host page so the
  // widget matches the Derma AI interface exactly. @font-face must live in
  // the main document for fonts to reach the Shadow DOM.
  function loadFont() {
    if (document.getElementById('derma-widget-font')) return
    var link = document.createElement('link')
    link.id = 'derma-widget-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }

  var FONT_STACK =
    '"Lexend Deca",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'

  var host, root
  function build() {
    loadFont()
    var onBrand = contrast(cfg.brandColor)
    host = document.createElement('div')
    host.setAttribute('data-derma-widget', '')
    host.style.position = 'fixed'
    host.style.zIndex = '2147483000'
    host.style.bottom = '20px'
    host.style.right = '20px'
    document.body.appendChild(host)
    root = host.attachShadow({ mode: 'open' })

    var chatIcon =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
    var closeIcon =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    var sendIcon =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'

    var css =
      '*{box-sizing:border-box;margin:0;padding:0;font-family:' +
      FONT_STACK +
      '}' +
      '.launcher{display:flex;align-items:center;gap:8px;border:none;border-radius:9999px;padding:14px 18px;background:' +
      cfg.brandColor +
      ';color:' +
      onBrand +
      ';font-size:15px;font-weight:600;cursor:pointer;line-height:1}' +
      '.launcher:hover{opacity:.92}' +
      '.panel{display:none;flex-direction:column;width:370px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #e6e6e6;border-radius:16px;overflow:hidden}' +
      '.panel.open{display:flex}' +
      '.header{display:flex;align-items:center;gap:10px;padding:16px;background:' +
      cfg.brandColor +
      ';color:' +
      onBrand +
      '}' +
      '.header .logo{width:34px;height:34px;border-radius:9999px;object-fit:cover;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700}' +
      '.header .meta{flex:1;min-width:0}' +
      '.header .name{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.header .status{font-size:12px;opacity:.85}' +
      '.header .x{background:none;border:none;color:' +
      onBrand +
      ';cursor:pointer;padding:4px;display:flex;border-radius:8px}' +
      '.header .x:hover{background:rgba(255,255,255,.15)}' +
      '.body{flex:1;overflow-y:auto;padding:16px;background:#f7f7f8;display:flex;flex-direction:column;gap:10px}' +
      '.msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}' +
      '.msg.bot{align-self:flex-start;background:#fff;color:#1a1a1a;border:1px solid #ececec;border-bottom-left-radius:4px}' +
      '.msg.user{align-self:flex-end;background:' +
      cfg.brandColor +
      ';color:' +
      onBrand +
      ';border-bottom-right-radius:4px}' +
      '.typing{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:#fff;border:1px solid #ececec;border-radius:14px}' +
      '.typing span{width:7px;height:7px;border-radius:50%;background:#b8b8b8;display:inline-block;animation:b 1.2s infinite}' +
      '.typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes b{0%,60%,100%{opacity:.3}30%{opacity:1}}' +
      '.foot{display:flex;gap:8px;padding:12px;border-top:1px solid #ececec;background:#fff;align-items:flex-end}' +
      '.foot textarea{flex:1;resize:none;border:1px solid #dcdce0;border-radius:12px;padding:10px 12px;font-size:14px;max-height:100px;outline:none;font-family:inherit}' +
      '.foot textarea:focus{border-color:' +
      cfg.brandColor +
      '}' +
      '.foot button{border:none;border-radius:12px;width:42px;height:42px;background:' +
      cfg.brandColor +
      ';color:' +
      onBrand +
      ';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.foot button:disabled{opacity:.5;cursor:not-allowed}' +
      '.credit{text-align:center;font-size:11px;color:#9a9a9a;padding:6px 0 10px}' +
      '.wrap{display:flex;flex-direction:column;align-items:flex-end;gap:12px}'

    root.innerHTML =
      '<style>' +
      css +
      '</style>' +
      '<div class="wrap">' +
      '<div class="panel" part="panel">' +
      '<div class="header">' +
      '<div class="logo" id="d-logo"></div>' +
      '<div class="meta"><div class="name" id="d-name"></div><div class="status" id="d-status"></div></div>' +
      '<button class="x" id="d-close" aria-label="Close chat">' +
      closeIcon +
      '</button>' +
      '</div>' +
      '<div class="body" id="d-body"></div>' +
      '<div class="foot">' +
      '<textarea id="d-input" rows="1" placeholder="Type your message..."></textarea>' +
      '<button id="d-send" aria-label="Send message">' +
      sendIcon +
      '</button>' +
      '</div>' +
      '<div class="credit">Powered by Derma AI</div>' +
      '</div>' +
      '<button class="launcher" id="d-launch">' +
      chatIcon +
      '<span id="d-launch-label"></span>' +
      '</button>' +
      '</div>'

    // Fill dynamic text (avoids HTML injection from config values).
    root.getElementById('d-name').textContent = cfg.brandName
    root.getElementById('d-status').textContent = cfg.active ? 'Online' : 'Currently unavailable'
    root.getElementById('d-launch-label').textContent = cfg.launcherLabel
    var logo = root.getElementById('d-logo')
    if (cfg.logoUrl) {
      var img = document.createElement('img')
      img.src = cfg.logoUrl
      img.alt = ''
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.borderRadius = '9999px'
      img.style.objectFit = 'cover'
      logo.appendChild(img)
    } else {
      logo.textContent = (cfg.brandName || 'A').charAt(0).toUpperCase()
      logo.style.color = onBrand
    }

    root.getElementById('d-launch').addEventListener('click', toggle)
    root.getElementById('d-close').addEventListener('click', toggle)
    root.getElementById('d-send').addEventListener('click', send)
    var input = root.getElementById('d-input')
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault()
        send()
      }
    })
    input.addEventListener('input', function () {
      input.style.height = 'auto'
      input.style.height = Math.min(input.scrollHeight, 100) + 'px'
    })
  }

  function toggle() {
    open = !open
    var panel = root.querySelector('.panel')
    var launch = root.getElementById('d-launch')
    if (open) {
      panel.classList.add('open')
      launch.style.display = 'none'
      if (messages.length === 0 && cfg.welcomeMessage) {
        addMsg('bot', cfg.welcomeMessage)
        messages.push({ role: 'assistant', content: cfg.welcomeMessage })
      }
      setTimeout(function () {
        root.getElementById('d-input').focus()
      }, 50)
    } else {
      panel.classList.remove('open')
      launch.style.display = 'flex'
    }
  }

  function addMsg(role, text) {
    var body = root.getElementById('d-body')
    var el = document.createElement('div')
    el.className = 'msg ' + (role === 'user' ? 'user' : 'bot')
    el.textContent = text
    body.appendChild(el)
    body.scrollTop = body.scrollHeight
    return el
  }

  function showTyping() {
    var body = root.getElementById('d-body')
    var t = document.createElement('div')
    t.className = 'typing'
    t.id = 'd-typing'
    t.innerHTML = '<span></span><span></span><span></span>'
    body.appendChild(t)
    body.scrollTop = body.scrollHeight
  }
  function hideTyping() {
    var t = root.getElementById('d-typing')
    if (t) t.remove()
  }

  function send() {
    if (busy) return
    var input = root.getElementById('d-input')
    var text = (input.value || '').trim()
    if (!text) return
    if (!cfg.active) {
      addMsg('bot', 'This assistant is currently unavailable. Please try again later.')
      return
    }
    input.value = ''
    input.style.height = 'auto'
    addMsg('user', text)
    messages.push({ role: 'user', content: text })
    stream()
  }

  function stream() {
    busy = true
    root.getElementById('d-send').disabled = true
    showTyping()

    fetch(ORIGIN + '/api/saas/widget/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: KEY, messages: messages, visitorId: VISITOR }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res
            .json()
            .catch(function () {
              return {}
            })
            .then(function (j) {
              throw new Error(j.error || 'Request failed')
            })
        }
        hideTyping()
        var botEl = addMsg('bot', '')
        var acc = ''
        var reader = res.body.getReader()
        var decoder = new TextDecoder()
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              messages.push({ role: 'assistant', content: acc })
              finish()
              return
            }
            acc += decoder.decode(r.value, { stream: true })
            botEl.textContent = acc
            root.getElementById('d-body').scrollTop = root.getElementById('d-body').scrollHeight
            return pump()
          })
        }
        return pump()
      })
      .catch(function (err) {
        hideTyping()
        addMsg('bot', err.message || 'Sorry, something went wrong. Please try again.')
        finish()
      })
  }

  function finish() {
    busy = false
    root.getElementById('d-send').disabled = false
  }

  function init() {
    fetch(ORIGIN + '/api/saas/widget/config?key=' + encodeURIComponent(KEY))
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (data) {
        if (data && !data.error) {
          cfg.brandName = data.brandName || cfg.brandName
          cfg.assistantName = data.assistantName || cfg.assistantName
          cfg.brandColor = data.brandColor || cfg.brandColor
          cfg.welcomeMessage = data.welcomeMessage || cfg.welcomeMessage
          cfg.logoUrl = data.logoUrl || null
          cfg.launcherLabel = data.launcherLabel || cfg.launcherLabel
          cfg.active = data.active !== false
        }
        build()
      })
      .catch(function () {
        build() // still render with defaults
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
