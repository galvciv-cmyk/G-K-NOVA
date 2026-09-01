import { useState, useEffect, useCallback, useRef } from "react"
import { signOut, supabase, loadAllData, saveConfig, getNextCounter, restoreAllData, saveProduct, deleteProduct, saveCustomer, deleteCustomer, saveSale, deleteSale, savePurchase, deletePurchase, saveQuote, deleteQuote, saveMovement, deleteMovement, saveCashEntry, deleteCashEntry } from "./supabase.js"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY } from "./constants.js"
import { Btn, Modal, Badge } from "./components/ui.jsx"
import { generateMonthlyClosing } from "./pdf/monthlyClosing.js"

import Dashboard    from "./components/Dashboard.jsx"
import Inventory    from "./components/Inventory.jsx"
import Sales        from "./components/Sales.jsx"
import Purchases    from "./components/Purchases.jsx"
import Movements    from "./components/Movements.jsx"
import Reports      from "./components/Reports.jsx"
import Customers    from "./components/Customers.jsx"
import Config       from "./components/Config.jsx"
import Quotes       from "./components/Quotes.jsx"
import Receivables  from "./components/Receivables.jsx"
import { DashboardSkeleton } from "./components/Skeleton.jsx"
import CashRegister from "./components/CashRegister.jsx"
import Search       from "./components/Search.jsx"
import Alerts       from "./components/Alerts.jsx"
import { getCachedState, cacheState, isOnline } from "./offline.js"

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const today = () => new Date().toISOString().split("T")[0]

function RateReminder({rate, onSave, onDismiss}){
  const [newRate, setNewRate] = useState(rate||655)
  const [fetching, setFetching] = useState(false)
  const [autoFetched, setAutoFetched] = useState(false)

  useEffect(()=>{
    setFetching(true)
    const apis = [
      'https://ve.dolarapi.com/v1/euros/oficial',
      'https://pydolarve.org/api/v2/dollar?page=bcv&monitor=eur',
    ]
    const tryFetch = async () => {
      for(const url of apis){
        try {
          const r = await fetch(url)
          const d = await r.json()
          const rate = d.price || d.promedio || d.venta || d.compra
          if(rate && rate > 0){ setNewRate(Math.round(rate)); setAutoFetched(true); return }
        } catch(e){ continue }
      }
    }
    tryFetch().finally(()=>setFetching(false))
  },[])

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#0D1E35",borderRadius:20,padding:28,width:"100%",maxWidth:380,border:"1px solid rgba(232,213,183,0.2)"}}>
        <p style={{fontSize:22,textAlign:"center",marginBottom:8}}>☀️</p>
        <h3 style={{color:GOLD,fontWeight:800,fontSize:18,textAlign:"center",marginBottom:6}}>Buenos días</h3>
        <p style={{color:"rgba(232,213,183,0.5)",fontSize:13,textAlign:"center",marginBottom:8}}>
          {fetching?"Consultando tasa BCV...":autoFetched?"Tasa obtenida automáticamente de BCV":"¿Cuál es la tasa BCV de hoy?"}
        </p>
        {autoFetched&&<p style={{color:GREEN,fontSize:11,textAlign:"center",marginBottom:12}}>✓ Actualizada automáticamente</p>}
        <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Tasa de Referencia EUR BCV = Bs.</label>
        <input type="number" value={newRate} onChange={e=>setNewRate(Number(e.target.value))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.3)",borderRadius:9,padding:"12px 14px",color:GOLD,fontSize:24,fontWeight:800,outline:"none",boxSizing:"border-box",marginBottom:16}}/>
        <p style={{color:"rgba(232,213,183,0.3)",fontSize:11,textAlign:"center",marginBottom:12}}>Puedes ajustarla manualmente si es necesario</p>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={onDismiss} style={{flex:1}}>Después</Btn>
          <Btn onClick={()=>onSave(newRate)} style={{flex:2}}>Guardar Tasa</Btn>
        </div>
      </div>
    </div>
  )
}

function CloseReminder({prevMonth, prevYear, onGenerate, onDismiss}){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#0D1E35",borderRadius:20,padding:28,width:"100%",maxWidth:380,border:"1px solid rgba(251,191,36,0.3)"}}>
        <p style={{fontSize:22,textAlign:"center",marginBottom:8}}>📊</p>
        <h3 style={{color:GOLD,fontWeight:800,fontSize:18,textAlign:"center",marginBottom:6}}>Cierre Pendiente</h3>
        <p style={{color:"rgba(232,213,183,0.5)",fontSize:13,textAlign:"center",marginBottom:20}}>No generaste el cierre de <b style={{color:GOLD}}>{MONTHS[prevMonth]} {prevYear}</b>. ¿Lo generamos ahora?</p>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={onDismiss} style={{flex:1}}>Después</Btn>
          <Btn onClick={onGenerate} style={{flex:2}}>📊 Generar Cierre</Btn>
        </div>
      </div>
    </div>
  )
}

export default function App({onSignOut, userEmail}){
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [tab, setTab] = useState("dashboard")
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [offline, setOffline] = useState(!isOnline())
  const [showRateReminder, setShowRateReminder] = useState(false)
  const [showCloseReminder, setShowCloseReminder] = useState(false)
  const [closeReminderData, setCloseReminderData] = useState(null)
  const statusTimer = useRef(null)

  useEffect(()=>{
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },[])

  useEffect(()=>{
    if(!isOnline()){
      const cached = getCachedState()
      if(cached){
        setState(cached)
        setLoading(false)
        return
      }
    }
    loadAllData().then(data => {
      setState(data)
      cacheState(data)
      setLoading(false)
      const todayStr = today()
      const now = new Date()
      if((data.config?.lastRateReminder||"") < todayStr) setShowRateReminder(true)
      if(now.getDate()===1){
        const prevMonth = now.getMonth()===0?11:now.getMonth()-1
        const prevYear  = now.getMonth()===0?now.getFullYear()-1:now.getFullYear()
        const closeKey  = `${prevYear}-${String(prevMonth+1).padStart(2,"0")}`
        if(!(data.config?.closedMonths||[]).includes(closeKey) && (data.config?.lastCloseReminder||"") < todayStr){
          setCloseReminderData({prevMonth, prevYear})
          setShowCloseReminder(true)
        }
      }
    }).catch(()=>{
      const cached = getCachedState()
      if(cached){ setState(cached); setLoading(false) }
    })
  },[])

  const showSaved = (ok=true) => {
    setSaveStatus(ok?"saved":"error")
    clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(()=>setSaveStatus(null), 2500)
  }

  useEffect(()=>{
    if(state) cacheState(state)
  },[state])

  // ── Individual save operations ─────────────────────────────────────────────
  const ops = {
    // Products
    async addProduct(p){
      setSaveStatus("saving")
      await saveProduct(p)
      setState(s=>({...s, products:[...s.products, p]}))
      showSaved()
    },
    async updateProduct(p){
      setSaveStatus("saving")
      await saveProduct(p)
      setState(s=>({...s, products:s.products.map(pr=>pr.id===p.id?p:pr)}))
      showSaved()
    },
    async removeProduct(id){
      setSaveStatus("saving")
      await deleteProduct(id)
      setState(s=>({...s, products:s.products.filter(p=>p.id!==id)}))
      showSaved()
    },
    async updateProductsStock(updates){
      // updates: [{id, stock}]
      setSaveStatus("saving")
      await Promise.all(updates.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock})))
      setState(s=>({...s, products:s.products.map(p=>{const u=updates.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p})}))
      showSaved()
    },

    // Customers
    async addCustomer(c){
      setSaveStatus("saving")
      await saveCustomer(c)
      setState(s=>({...s, customers:[...s.customers, c]}))
      showSaved()
    },
    async removeCustomer(id){
      setSaveStatus("saving")
      await deleteCustomer(id)
      setState(s=>({...s, customers:s.customers.filter(c=>c.id!==id)}))
      showSaved()
    },

    // Sales
    async addSale(sale, stockUpdates, movement, newCustomer){
      setSaveStatus("saving")
      const receiptNumber = await getNextCounter('receipt')
      const finalSale = {...sale, receiptNumber}
      const finalMovement = {...movement, description: movement.description}
      await Promise.all([
        saveSale(finalSale),
        saveMovement(finalMovement),
        ...stockUpdates.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock})),
        ...(newCustomer ? [saveCustomer(newCustomer)] : [])
      ])
      setState(s=>({
        ...s,
        sales:[finalSale, ...s.sales],
        movements:[finalMovement, ...s.movements],
        products:s.products.map(p=>{const u=stockUpdates.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p}),
        customers: newCustomer ? [...s.customers, newCustomer] : s.customers,
        config:{...s.config, receiptCounter:receiptNumber+1}
      }))
      showSaved()
      return finalSale
    },
    async updateSale(sale){
      setSaveStatus("saving")
      await saveSale(sale)
      setState(s=>({...s, sales:s.sales.map(sa=>sa.id===sale.id?sale:sa)}))
      showSaved()
    },
    async removeSale(id, stockRestores){
      setSaveStatus("saving")
      await Promise.all([
        deleteSale(id),
        ...stockRestores.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock}))
      ])
      setState(s=>({
        ...s,
        sales:s.sales.filter(sa=>sa.id!==id),
        movements:s.movements.filter(m=>m.saleId!==id),
        products:s.products.map(p=>{const u=stockRestores.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p})
      }))
      showSaved()
    },

    // Purchases
    async addPurchase(purchase, stockUpdates, movement){
      setSaveStatus("saving")
      const receiptNumber = await getNextCounter('purchase')
      const finalPurchase = {...purchase, receiptNumber}
      await Promise.all([
        savePurchase(finalPurchase),
        saveMovement(movement),
        ...stockUpdates.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock}))
      ])
      setState(s=>({
        ...s,
        purchases:[finalPurchase, ...s.purchases],
        movements:[movement, ...s.movements],
        products:s.products.map(p=>{const u=stockUpdates.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p}),
        config:{...s.config, purchaseCounter:receiptNumber+1}
      }))
      showSaved()
      return finalPurchase
    },
    async removePurchase(id, stockRestores){
      setSaveStatus("saving")
      await Promise.all([
        deletePurchase(id),
        ...stockRestores.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock}))
      ])
      setState(s=>({
        ...s,
        purchases:s.purchases.filter(p=>p.id!==id),
        movements:s.movements.filter(m=>m.purchaseId!==id),
        products:s.products.map(p=>{const u=stockRestores.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p})
      }))
      showSaved()
    },

    // Quotes
    async addQuote(quote){
      setSaveStatus("saving")
      const quoteNumber = await getNextCounter('quote')
      const finalQuote = {...quote, quoteNumber}
      await saveQuote(finalQuote)
      setState(s=>({...s, quotes:[finalQuote,...s.quotes], config:{...s.config, quoteCounter:quoteNumber+1}}))
      showSaved()
      return finalQuote
    },
    async updateQuote(quote){
      setSaveStatus("saving")
      await saveQuote(quote)
      setState(s=>({...s, quotes:s.quotes.map(q=>q.id===quote.id?quote:q)}))
      showSaved()
    },
    async removeQuote(id){
      setSaveStatus("saving")
      await deleteQuote(id)
      setState(s=>({...s, quotes:s.quotes.filter(q=>q.id!==id)}))
      showSaved()
    },
    async convertQuoteToSale(quote, sale, stockUpdates, movement){
      setSaveStatus("saving")
      const receiptNumber = await getNextCounter('receipt')
      const finalSale = {...sale, receiptNumber}
      const updatedQuote = {...quote, status:"converted"}
      await Promise.all([
        saveQuote(updatedQuote),
        saveSale(finalSale),
        saveMovement(movement),
        ...stockUpdates.map(u => saveProduct({...state.products.find(p=>p.id===u.id), stock:u.stock}))
      ])
      setState(s=>({
        ...s,
        quotes:s.quotes.map(q=>q.id===quote.id?updatedQuote:q),
        sales:[finalSale,...s.sales],
        movements:[movement,...s.movements],
        products:s.products.map(p=>{const u=stockUpdates.find(u=>u.id===p.id);return u?{...p,stock:u.stock}:p}),
        config:{...s.config, receiptCounter:receiptNumber+1}
      }))
      showSaved()
      return finalSale
    },

    // Movements
    async removeMovement(id){
      setSaveStatus("saving")
      await deleteMovement(id)
      setState(s=>({...s, movements:s.movements.filter(m=>m.id!==id)}))
      showSaved()
    },

    // Cash
    async addCashEntry(entry){
      setSaveStatus("saving")
      await saveCashEntry(entry)
      setState(s=>({...s, cashLog:[entry,...(s.cashLog||[])]}))
      showSaved()
    },
    async removeCashEntry(id){
      setSaveStatus("saving")
      await deleteCashEntry(id)
      setState(s=>({...s, cashLog:(s.cashLog||[]).filter(e=>e.id!==id)}))
      showSaved()
    },

    // Config
    async updateConfig(cfg){
      setSaveStatus("saving")
      const newCfg = {...state.config, ...cfg}
      await saveConfig(newCfg)
      setState(s=>({...s, config:newCfg}))
      showSaved()
    },

    async restoreFromBackup(backup){
      setSaveStatus("saving")
      await restoreAllData(backup)
      const fresh = await loadAllData()
      setState(fresh)
      cacheState(fresh)
      showSaved()
    },
  }

  const handleRateSave = async (newRate) => {
    await ops.updateConfig({exchangeRate:newRate, lastRateReminder:today()})
    setShowRateReminder(false)
  }

  const dismissReminder = async () => {
    setShowRateReminder(false)
    setShowCloseReminder(false)
    await ops.updateConfig({lastRateReminder:today(), lastCloseReminder:today()})
  }

  const handleGenerateClose = async () => {
    const {prevMonth, prevYear} = closeReminderData
    const mSales = state.sales.filter(s=>{const d=new Date(s.date);return d.getMonth()===prevMonth&&d.getFullYear()===prevYear})
    const mPurchases = state.purchases.filter(p=>{const d=new Date(p.date);return d.getMonth()===prevMonth&&d.getFullYear()===prevYear})
    const doc = generateMonthlyClosing({month:prevMonth+1, year:prevYear, sales:mSales, purchases:mPurchases, products:state.products, config:state.config})
    doc.save(`cierre-${MONTHS[prevMonth].toLowerCase()}-${prevYear}.pdf`)
    const closeKey = `${prevYear}-${String(prevMonth+1).padStart(2,"0")}`
    await ops.updateConfig({closedMonths:[...(state.config.closedMonths||[]),closeKey], lastCloseReminder:today()})
    setShowCloseReminder(false)
  }

  if(loading) return(
    <div style={{minHeight:"100vh",background:NAVY,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');`}</style>
      <div style={{background:"rgba(10,22,40,0.97)",borderBottom:"1px solid rgba(232,213,183,0.08)",padding:"10px 16px"}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <img src="/logo.png" alt="GK Nova" style={{height:32,opacity:0.6}}/>
        </div>
      </div>
      <div style={{maxWidth:820,margin:"0 auto",padding:"16px 14px"}}>
        <DashboardSkeleton/>
      </div>
    </div>
  )

  const quickNav=[
    {k:"dashboard",icon:"⬡",label:"Inicio"},
    {k:"sales",    icon:"🛒",label:"Ventas"},
    {k:"quotes",   icon:"📋",label:"Cotizar"},
    {k:"menu",     icon:"☰", label:"Más"},
  ]
  const allNavItems=[
    {k:"dashboard",  icon:"⬡", label:"Inicio"},
    {k:"quotes",     icon:"📋",label:"Cotizaciones"},
    {k:"sales",      icon:"🛒",label:"Ventas"},
    {k:"inventory",  icon:"📦",label:"Inventario"},
    {k:"purchases",  icon:"📥",label:"Compras"},
    {k:"cash",       icon:"💰",label:"Caja"},
    {k:"movements",  icon:"📊",label:"Movimientos"},
    {k:"reports",    icon:"📅",label:"Reportes"},
    {k:"receivables",icon:"💳",label:"Por Cobrar"},
    {k:"customers",  icon:"👥",label:"Clientes"},
    {k:"config",     icon:"⚙", label:"Config"},
  ]

  return(
    <div style={{minHeight:"100vh",background:NAVY,fontFamily:"'DM Sans',system-ui,sans-serif",color:GOLD}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(232,213,183,0.1);border-radius:99px}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes tabFadeIn{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}button{transition:opacity .15s ease, transform .15s ease}button:active{transform:scale(0.96)}`}</style>

      {showRateReminder&&<RateReminder rate={state.config?.exchangeRate} onSave={handleRateSave} onDismiss={dismissReminder}/>}
      {showCloseReminder&&closeReminderData&&!showRateReminder&&<CloseReminder prevMonth={closeReminderData.prevMonth} prevYear={closeReminderData.prevYear} onGenerate={handleGenerateClose} onDismiss={dismissReminder}/>}

      {showMenu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200}} onClick={()=>setShowMenu(false)}>
        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"#0D1E35",borderRadius:"20px 20px 0 0",padding:"20px 16px 40px",animation:"slideUp .25s ease",border:"1px solid rgba(232,213,183,0.1)"}} onClick={e=>e.stopPropagation()}>
          <div style={{width:40,height:4,background:"rgba(232,213,183,0.2)",borderRadius:99,margin:"0 auto 20px"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {allNavItems.map(n=>(
              <button key={n.k} onClick={()=>{setTab(n.k);setShowMenu(false)}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:tab===n.k?"rgba(232,213,183,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${tab===n.k?"rgba(232,213,183,0.2)":"rgba(232,213,183,0.07)"}`,borderRadius:12,cursor:"pointer"}}>
                <span style={{fontSize:20}}>{n.icon}</span>
                <span style={{color:tab===n.k?GOLD:GOLD2,fontWeight:tab===n.k?700:500,fontSize:13}}>{n.label}</span>
              </button>
            ))}
          </div>
          <a href="/catalogo" target="_blank" style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12,marginTop:8,textDecoration:"none"}}>
            <span style={{fontSize:20}}>🌐</span>
            <div><p style={{color:GREEN,fontWeight:700,fontSize:13}}>Ver Catálogo Público</p><p style={{color:"#6B7280",fontSize:11}}>Comparte con tus clientes</p></div>
          </a>
        </div>
      </div>}

      <div style={{background:"rgba(10,22,40,0.97)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(232,213,183,0.08)",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:820,margin:"0 auto",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/logo.png" alt="GK Nova" style={{height:32}}/>
            {userEmail&&<div>
              <p style={{color:GOLD2,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",lineHeight:1}}>{new Date().getHours()<12?"Buenos días":"Buenas"}!</p>
              <p style={{color:"rgba(232,213,183,0.4)",fontSize:11,lineHeight:1,marginTop:2}}>{userEmail.split("@")[0]}</p>
            </div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {offline&&<Badge color={YELLOW}>📴 Sin conexión</Badge>}
            {saveStatus==="saving"&&<span style={{fontSize:10,color:"#6B7280"}}>Guardando...</span>}
            {saveStatus==="saved"&&<span style={{fontSize:10,color:GREEN}}>✓ Guardado</span>}
            {saveStatus==="error"&&<span style={{fontSize:10,color:RED}}>⚠ Error</span>}
            <button onClick={()=>setShowSearch(true)} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:7,color:"#6B7280",width:28,height:28,cursor:"pointer",fontSize:13}}>🔍</button>
            <button onClick={()=>setShowAlerts(true)} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:7,color:"#6B7280",width:28,height:28,cursor:"pointer",fontSize:13,position:"relative"}}>
              🔔
              {(((state.products||[]).filter(p=>p.stock<=p.minStock).length)+((state.sales||[]).filter(s=>s.paymentStatus!=="paid").length))>0&&<span style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:RED}}/>}
            </button>
            <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:7,color:"#6B7280",width:28,height:28,cursor:"pointer",fontSize:13}}>🚪</button>
          </div>
        </div>
      </div>

      <div key={tab} style={{maxWidth:820,margin:"0 auto",padding:"16px 14px 120px",animation:"tabFadeIn .25s ease"}}>
        {tab==="dashboard"   &&<Dashboard    state={state} onNavigate={t=>setTab(t)}/>}
        {tab==="quotes"      &&<Quotes       state={state} ops={ops}/>}
        {tab==="inventory"   &&<Inventory    state={state} ops={ops}/>}
        {tab==="sales"       &&<Sales        state={state} ops={ops}/>}
        {tab==="purchases"   &&<Purchases    state={state} ops={ops}/>}
        {tab==="cash"        &&<CashRegister state={state} ops={ops}/>}
        {tab==="movements"   &&<Movements    state={state} ops={ops}/>}
        {tab==="reports"     &&<Reports      state={state}/>}
        {tab==="receivables" &&<Receivables  state={state} ops={ops}/>}
        {tab==="customers"   &&<Customers    state={state} ops={ops}/>}
        {tab==="config"      &&<Config       state={state} ops={ops}/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,22,40,0.98)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(232,213,183,0.08)",zIndex:50}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex"}}>
          {quickNav.map(n=>(
            <button key={n.k} onClick={()=>n.k==="menu"?setShowMenu(true):setTab(n.k)} style={{flex:1,background:"none",border:"none",padding:"9px 0 13px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:18,opacity:(n.k==="menu"||tab===n.k)?1:0.35}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:700,color:(n.k!=="menu"&&tab===n.k)?GOLD2:"#4B5563",letterSpacing:"0.04em"}}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showSearch&&<Modal title="🔍 Buscar" onClose={()=>setShowSearch(false)} wide>
        <Search state={state} onNavigate={t=>{setTab(t);setShowSearch(false)}}/>
      </Modal>}
      {showAlerts&&<Modal title="🔔 Alertas" onClose={()=>setShowAlerts(false)}>
        <Alerts state={state} onNavigate={t=>{setTab(t);setShowAlerts(false)}}/>
      </Modal>}
    </div>
  )
}
