// Generate a VAPID keypair for Web Push.
// Run once locally:  node scripts/generate-vapid.mjs
// Then add the printed values to your Vercel project as:
//   VAPID_PUBLIC_KEY     (also exposed to the browser via /api/push/vapid-public-key)
//   VAPID_PRIVATE_KEY    (server-only)
//   VAPID_SUBJECT        e.g. mailto:info@dermaspaceng.com
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log('\nAdd these to your environment:\n')
console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
console.log('VAPID_SUBJECT=mailto:info@dermaspaceng.com')
console.log('\nDone. Restart your dev server / redeploy after setting them.')
