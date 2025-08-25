'use client'
import { useEffect } from 'react'


export default function PWARegister(){
useEffect(() => {
if (typeof window === 'undefined') return
if (!('serviceWorker' in navigator)) return
if (window.location.hostname === 'localhost') {
// Anda bisa tetap daftar di dev; iOS juga butuh https kecuali localhost
}
navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error)
}, [])
return null
}