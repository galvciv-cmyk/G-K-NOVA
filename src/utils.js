// Convert image URL/file to base64
export async function imageToBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// Fetch Euro BCV rate from dolarapi
export async function fetchEuroRate() {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/euro')
    const data = await res.json()
    return { rate: data.promedio || data.venta, date: data.fechaActualizacion }
  } catch { return null }
}

// Fetch USD BCV rate
export async function fetchUsdRate() {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
    const data = await res.json()
    return { rate: data.promedio || data.venta, date: data.fechaActualizacion }
  } catch { return null }
}

// Open WhatsApp with PDF
export function sendViaWhatsApp(phone, message) {
  const clean = phone.replace(/\D/g,'')
  const intl = clean.startsWith('0') ? '58'+clean.slice(1) : clean.startsWith('58') ? clean : '58'+clean
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

export const fmt$ = n => `€${Number(n||0).toFixed(2)}`
export const uid  = () => Math.random().toString(36).slice(2,10)
export const today= () => new Date().toISOString().split("T")[0]
