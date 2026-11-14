const DERMASPACE_LOGO =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface XCallbackHtmlPayload {
  type: 'X_OAUTH_SUCCESS' | 'X_OAUTH_ERROR'
  redirectTo: string
  isPopup: boolean
  handoff?: string
  error?: string
  reason?: string
  detail?: string
  title: string
  subtitle: string
  xUsername?: string | null
}

/**
 * Build the X OAuth callback HTML bridge card styled to match the Dermaspace
 * design system (flat #FFFFFF surface, #7B2D8E primary accent + 4px top bar,
 * Lexend Deca typography, Dermaspace wordmark, zero box-shadows, zero gradients).
 */
export function buildXCallbackHtml(payload: XCallbackHtmlPayload): string {
  const isError = payload.type === 'X_OAUTH_ERROR'
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c')
  const safeRedirectHref = escapeHtml(payload.redirectTo)
  const safeTitle = escapeHtml(payload.title)
  const safeSubtitle = escapeHtml(payload.subtitle)
  const cleanHandle = (payload.xUsername || '').trim().replace(/^@+/, '')
  const safeHandle = cleanHandle ? escapeHtml(`@${cleanHandle}`) : ''

  const statusIcon = isError
    ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} | Dermaspace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Lexend Deca', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        color: #111827;
        padding: 32px 20px;
        -webkit-font-smoothing: antialiased;
      }
      .top-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #7b2d8e;
      }
      .shell {
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .logo {
        height: 30px;
        width: auto;
        margin-bottom: 24px;
      }
      .card {
        width: 100%;
        background: #ffffff;
        border: 1px solid #f3f4f6;
        border-radius: 16px;
        padding: 32px 24px;
        text-align: center;
      }
      .icon-badge {
        width: 48px;
        height: 48px;
        margin: 0 auto 16px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${isError ? '#fef2f2' : 'rgba(123, 45, 142, 0.1)'};
        color: ${isError ? '#dc2626' : '#7b2d8e'};
      }
      .handle {
        margin: 0 0 6px;
        font-size: 13px;
        font-weight: 600;
        color: #7b2d8e;
      }
      h1 {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.015em;
        margin: 0 0 8px;
        color: #111827;
      }
      p.subtitle {
        font-size: 14px;
        color: #4b5563;
        margin: 0 0 22px;
        line-height: 1.55;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
      }
      button.primary,
      a.primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 12px 18px;
        border: 0;
        border-radius: 12px;
        background: #7b2d8e;
        color: #ffffff;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: background-color 150ms ease;
      }
      button.primary:hover,
      a.primary:hover {
        background: #5a1d6a;
      }
      a.secondary {
        display: inline-block;
        padding: 6px 8px;
        font-size: 13px;
        font-weight: 500;
        color: #7b2d8e;
        text-decoration: none;
      }
      a.secondary:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="top-bar" aria-hidden="true"></div>
    <main class="shell">
      <img src="${DERMASPACE_LOGO}" alt="Dermaspace" class="logo" />
      <section class="card" aria-live="polite">
        <div class="icon-badge">${statusIcon}</div>
        ${safeHandle ? `<p class="handle">${safeHandle}</p>` : ''}
        <h1>${safeTitle}</h1>
        <p class="subtitle">${safeSubtitle}</p>
        <div class="actions">
          ${
            payload.isPopup
              ? `<button type="button" class="primary" onclick="window.close()">Return to Dermaspace</button>
                 <a href="${safeRedirectHref}" class="secondary" id="continue-link">Continue in this window</a>`
              : `<a href="${safeRedirectHref}" class="primary" id="continue-link">Continue</a>`
          }
        </div>
      </section>
    </main>
    <script>
      (function () {
        var payload = ${safeJson};
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            var ch = new BroadcastChannel('dermaspace_x_oauth');
            ch.postMessage(payload);
            ch.close();
          }
        } catch (e) {}

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(payload, '*');
          } catch (e) {}
          try {
            window.close();
          } catch (e) {}
          setTimeout(function () {
            try { window.close(); } catch (e) {}
          }, 150);
          return;
        }

        if (payload.isPopup) {
          try { window.close(); } catch (e) {}
          setTimeout(function () {
            try { window.close(); } catch (e) {}
          }, 200);
          return;
        }

        window.location.replace(payload.redirectTo);
      })();
    </script>
  </body>
</html>`
}
