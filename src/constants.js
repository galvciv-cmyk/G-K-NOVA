export const NAVY="#0A1628"
export const GOLD="#E8D5B7"
export const GOLD2="#C9A96E"
export const GREEN="#22C55E"
export const RED="#EF4444"
export const YELLOW="#FBBF24"

export const PAYMENT_METHODS=["Efectivo EUR","Efectivo Bs","Transferencia","Pago Móvil","Zelle","Zinli","PayPal","Binance"]
export const CATEGORIES=["Publicidad","Diseño","Sublimación","Papelería","Gigantografía","Uniformes","Franelas","Chemises","Otros"]
export const CAT_PREFIX={Publicidad:"PU",Diseño:"DI","Sublimación":"SU","Papelería":"PA","Gigantografía":"GI",Uniformes:"UN",Franelas:"FR",Chemises:"CH",Otros:"OT"}

export const DEFAULT_STATE = {
  products:[], purchases:[], sales:[], customers:[], movements:[],
  quotes:[], cashLog:[],
  config:{
    name:"GK Nova Publicity & Design",
    address:"Torre CrediCard, Av. Ppal. El Bosque, Chacao, Caracas, Venezuela",
    cuit:"1564567", phone:"4241895407", schedule:"8:00am - 7:30pm",
    exchangeRate:655, whatsappNumber:""
  },
  receiptCounter:1, purchaseCounter:1, quoteCounter:1,
  closedMonths:[], lastRateReminder:"", lastCloseReminder:""
}

export const uid  = ()=>Math.random().toString(36).slice(2,10)
export const fmt$ = n=>`€${Number(n||0).toFixed(2)}`
export const fmtBs= (n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2})}`
export const today= ()=>new Date().toISOString().split("T")[0]
export const sendWhatsApp=(phone,message)=>{
  const clean=phone.replace(/\D/g,'')
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`,'_blank')
}
