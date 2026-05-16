import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { readFileSync } from 'fs'

// read .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const app = initializeApp({
  apiKey:            env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
const db = getFirestore(app)

async function deleteAll(col) {
  const snap = await getDocs(collection(db, col))
  for (const d of snap.docs) await deleteDoc(doc(db, col, d.id))
  console.log(`✓ ${col}: deleted ${snap.size} docs`)
}

for (const col of ['finances', 'losses', 'deposits', 'tasks', 'milestones', 'appointments']) {
  await deleteAll(col)
}
console.log('✓ All collections cleared!')
process.exit(0)
