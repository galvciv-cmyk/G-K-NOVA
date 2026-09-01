import { GOLD, GOLD2, GREEN, RED, YELLOW, fmt$, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, Btn } from "./ui.jsx"

export default function Alerts({state, onNavigate}){
  const now = new Date()

  // Low stock
  const lowStock=(state.products||[]).filter(p=>p.stock<=p.minStock)
  const outOfStock=(state.products||[]).filter(p=>p.stock<=0)

  // Pending payments
  const pendingSales=(state.sales||[]).filter(s=>s.paymentStatus!=="paid")
  const pendingAmount=pendingSales.reduce((sum,s)=>sum+Math.max(0,s.total-(s.payments||[]).reduce((a,p)=>a+p.amount,0)),0)

  // Expiring quotes (less than 1 day left or expired)
  const expiringQuotes=(state.quotes||[]).filter(q=>{
    if(q.status==="converted")return false
    const expiry=new Date(new Date(q.date).getTime()+3*24*60*60*1000)
    const hoursLeft=(expiry-now)/1000/3600
    return hoursLeft<24
  })

  // Today's sales summary
  const todayKey=new Date().toISOString().split("T")[0]
  const todaySales=(state.sales||[]).filter(s=>s.date?.startsWith(todayKey))
  const todayRevenue=todaySales.reduce((s,sale)=>s+sale.total,0)
  const todayCollected=todaySales.reduce((s,sale)=>s+(sale.payments||[]).reduce((a,p)=>a+p.amount,0),0)

  const totalAlerts=lowStock.length+pendingSales.length+expiringQuotes.length

  const sendStockAlert=()=>{
    const phone=state.config?.whatsappNumber
    if(!phone){alert("Configura tu número de WhatsApp en Config primero");return}
    const msg=`⚠️ *GK Nova — Alerta de Stock*\n\n${lowStock.map(p=>`• ${p.name} (${p.code}): *${p.stock} ${p.unit}* — mín: ${p.minStock}`).join("\n")}\n\n_${new Date().toLocaleString("es-VE")}_`
    sendWhatsApp(phone,msg)
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SLabel>🔔 Alertas y Notificaciones</SLabel>
        {totalAlerts>0&&<Badge color={RED}>{totalAlerts} alertas</Badge>}
      </div>

      {/* Today summary */}
      <Card style={{background:"linear-gradient(135deg,rgba(20,38,65,0.9),rgba(10,22,40,0.9))",border:"1px solid rgba(232,213,183,0.2)"}}>
        <p style={{color:GOLD2,fontWeight:700,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>☀️ Resumen de Hoy</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["Ventas",todaySales.length+" facturas",GOLD],["Facturado",fmt$(todayRevenue),GREEN],["Cobrado",fmt$(todayCollected),GREEN]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 4px"}}>
              <p style={{color:"rgba(232,213,183,0.4)",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{l}</p>
              <p style={{color:c,fontWeight:800,fontSize:14}}>{v}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Out of stock */}
      {outOfStock.length>0&&<Card style={{border:"1px solid rgba(239,68,68,0.4)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{color:RED,fontWeight:700,fontSize:12,letterSpacing:"0.08em",textTransform:"uppercase"}}>🚫 Sin Stock ({outOfStock.length})</p>
          <button onClick={()=>onNavigate("inventory")} style={{background:"none",border:"none",color:GOLD2,cursor:"pointer",fontSize:12,fontWeight:600}}>Ver →</button>
        </div>
        {outOfStock.slice(0,5).map(p=>(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:GOLD,fontSize:13}}>{p.name}</span>
            <Badge color={RED}>Sin stock</Badge>
          </div>
        ))}
      </Card>}

      {/* Low stock */}
      {lowStock.length>0&&<Card style={{border:"1px solid rgba(251,191,36,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{color:YELLOW,fontWeight:700,fontSize:12,letterSpacing:"0.08em",textTransform:"uppercase"}}>⚠️ Stock Bajo ({lowStock.length})</p>
          <Btn variant="yellow" onClick={sendStockAlert} style={{fontSize:11,padding:"6px 12px"}}>📱 WhatsApp</Btn>
        </div>
        {lowStock.map(p=>(
          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:GOLD,fontSize:13}}>{p.name}</span>
            <Badge color={YELLOW}>{p.stock} {p.unit}</Badge>
          </div>
        ))}
      </Card>}

      {/* Pending payments */}
      {pendingSales.length>0&&<Card style={{border:"1px solid rgba(251,191,36,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{color:YELLOW,fontWeight:700,fontSize:12,letterSpacing:"0.08em",textTransform:"uppercase"}}>💰 Por Cobrar ({pendingSales.length})</p>
          <button onClick={()=>onNavigate("receivables")} style={{background:"none",border:"none",color:GOLD2,cursor:"pointer",fontSize:12,fontWeight:600}}>Ver →</button>
        </div>
        <p style={{color:GREEN,fontWeight:800,fontSize:20,marginBottom:8}}>{fmt$(pendingAmount)}</p>
        {pendingSales.slice(0,4).map(s=>{
          const paid=(s.payments||[]).reduce((a,p)=>a+p.amount,0)
          const pending=Math.max(0,s.total-paid)
          return(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{color:GOLD,fontSize:12}}>{s.customerName}</span>
              <span style={{color:YELLOW,fontWeight:600,fontSize:12}}>{fmt$(pending)}</span>
            </div>
          )
        })}
      </Card>}

      {/* Expiring quotes */}
      {expiringQuotes.length>0&&<Card style={{border:"1px solid rgba(239,68,68,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{color:RED,fontWeight:700,fontSize:12,letterSpacing:"0.08em",textTransform:"uppercase"}}>⏰ Cotizaciones Vencidas ({expiringQuotes.length})</p>
          <button onClick={()=>onNavigate("quotes")} style={{background:"none",border:"none",color:GOLD2,cursor:"pointer",fontSize:12,fontWeight:600}}>Ver →</button>
        </div>
        {expiringQuotes.map(q=>(
          <div key={q.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:GOLD,fontSize:12}}>{q.customerName}</span>
            <span style={{color:RED,fontWeight:600,fontSize:12}}>{fmt$(q.total)}</span>
          </div>
        ))}
      </Card>}

      {totalAlerts===0&&outOfStock.length===0&&<Card>
        <p style={{color:"#4B5563",textAlign:"center",padding:"20px 0",fontSize:13}}>✅ Todo en orden — sin alertas pendientes</p>
      </Card>}
    </div>
  )
}
