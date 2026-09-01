// Offline support - queue operations when offline, sync when back online
const QUEUE_KEY = 'gknova_offline_queue'
const CACHE_KEY = 'gknova_cache'

export function isOnline(){ return navigator.onLine }

export function getCachedState(){
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)||'null') } catch { return null }
}

export function cacheState(state){
  try {
    // Strip images from products before caching — they are too large for localStorage
    const slim = {
      ...state,
      products: (state.products||[]).map(p=>({...p, image: p.image ? '__has_image__' : null}))
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(slim))
  } catch(e){
    // If still too large, cache only essential data
    try {
      const minimal = {
        config: state.config,
        products: (state.products||[]).map(p=>({...p, image:null})),
        customers: state.customers,
        sales: (state.sales||[]).slice(0,50),
        purchases: (state.purchases||[]).slice(0,50),
        quotes: (state.quotes||[]).slice(0,20),
        movements: (state.movements||[]).slice(0,50),
        cashLog: (state.cashLog||[]).slice(0,30),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(minimal))
    } catch(e2){
      console.warn('Cache failed:', e2)
    }
  }
}

export function getQueue(){
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]') } catch { return [] }
}

export function clearQueue(){
  localStorage.removeItem(QUEUE_KEY)
}
