// This utility runs server-side (Supabase Edge Function or local script)
// to upload full-res photos to Google Drive.
// Deploy as a Supabase Edge Function for automatic triggering.

const FOLDER_ID = '1IR3LpzkwK_hCzn5KFPThCbCuH2hk44wz'

export async function uploadToDrive(imageBlob, filename, serviceAccountKey) {
  const { private_key, client_email } = serviceAccountKey

  // Get OAuth token
  const token = await getAccessToken(private_key, client_email)

  // Upload file
  const metadata = {
    name: filename,
    parents: [FOLDER_ID],
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', imageBlob)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )

  const data = await response.json()
  return `https://drive.google.com/file/d/${data.id}/view`
}

async function getAccessToken(privateKey, clientEmail) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const jwt = await createJWT(payload, privateKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const data = await res.json()
  return data.access_token
}

async function createJWT(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signing = `${enc(header)}.${enc(payload)}`

  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signing)
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${signing}.${sig}`
}
