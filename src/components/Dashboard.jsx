import { useState, useEffect, useCallback, useRef } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, CATEGORIES, CAT_PREFIX, DEFAULT_STATE, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"


function Dashboard({state, onNavigate}){
  const todaySales=(state.sales||[]).filter(s=>s.date?.startsWith(today()))
  const todayRevenue=todaySales.reduce((s,sale)=>s+sale.total,0)
  const todayCollected=todaySales.reduce((s,sale)=>s+(sale.payments||[]).reduce((a,p)=>a+p.amount,0),0)
  const totalRevenue=(state.sales||[]).reduce((s,sale)=>s+sale.total,0)
  const totalCost=(state.purchases||[]).reduce((s,p)=>s+p.total,0)
  const profit=totalRevenue-totalCost
  const lowStock=(state.products||[]).filter(p=>p.stock<=p.minStock)
  const pendingSales=(state.sales||[]).filter(s=>s.paymentStatus!=='paid')
  const pendingAmount=pendingSales.reduce((s,sale)=>s+Math.max(0,sale.total-(sale.payments||[]).reduce((a,p)=>a+p.amount,0)),0)

  const barData=[]
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i)
    const key=d.toISOString().split("T")[0]
    barData.push({name:d.toLocaleDateString('es-VE',{weekday:'short'}),Ventas:(state.sales||[]).filter(s=>s.date?.startsWith(key)).reduce((s,sale)=>s+sale.total,0)})
  }

  return<div style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Quick Actions */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <button onClick={()=>onNavigate?.("sales")} style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",borderRadius:14,padding:"16px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <span style={{fontSize:24}}>🛒</span>
        <span style={{color:NAVY,fontWeight:800,fontSize:13}}>Nueva Venta</span>
      </button>
      <button onClick={()=>onNavigate?.("quotes")} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(232,213,183,0.2)",borderRadius:14,padding:"16px 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <span style={{fontSize:24}}>📋</span>
        <span style={{color:GOLD,fontWeight:800,fontSize:13}}>Nueva Cotización</span>
      </button>
    </div>

    {/* Day Summary */}
    <Card style={{background:"linear-gradient(135deg,rgba(20,38,65,0.9),rgba(10,22,40,0.9))",border:"1px solid rgba(232,213,183,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <p style={{color:GOLD2,fontWeight:700,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase"}}>☀️ Resumen de Hoy</p>
          <p style={{color:"rgba(232,213,183,0.4)",fontSize:11}}>{new Date().toLocaleDateString("es-VE",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <Badge color={todaySales.length>0?GREEN:"#4B5563"}>{todaySales.length} {todaySales.length===1?"venta":"ventas"}</Badge>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {[["Facturado",fmt$(todayRevenue),GREEN],["Cobrado",fmt$(todayCollected),GOLD],["Pendiente",fmt$(Math.max(0,todayRevenue-todayCollected)),YELLOW]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 6px"}}>
            <p style={{color:"rgba(232,213,183,0.4)",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{l}</p>
            <p style={{color:c,fontWeight:800,fontSize:15}}>{v}</p>
          </div>
        ))}
      </div>
      {todaySales.length>0&&<div style={{marginTop:10,borderTop:"1px solid rgba(232,213,183,0.1)",paddingTop:8}}>
        {todaySales.slice(-3).reverse().map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{color:"#9CA3AF",fontSize:11}}>{s.customerName}</span>
          <span style={{color:GREEN,fontSize:11,fontWeight:600}}>{fmt$(s.total)}</span>
        </div>)}
      </div>}
    </Card>
    <Card style={{border:"1px solid rgba(232,213,183,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <SLabel>💱 Tasa Actual</SLabel>
          <p style={{color:GOLD,fontSize:22,fontWeight:800}}>1 USD = {fmtBs(1,state.config.exchangeRate)}</p>
        </div>
        <Badge color={GOLD2}>Actualizada hoy</Badge>
      </div>
    </Card>
    <SLabel>📊 Resumen</SLabel>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[["Ventas Hoy",fmt$(todayRevenue),GREEN],["Por Cobrar",fmt$(pendingAmount),YELLOW],["Ingresos Total",fmt$(totalRevenue),GOLD],["Ganancia",fmt$(profit),profit>=0?GREEN:RED]].map(([l,v,c])=>(
        <Card key={l}><p style={{color:"rgba(232,213,183,0.45)",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>{l}</p><p style={{fontSize:20,fontWeight:800,color:c}}>{v}</p></Card>
      ))}
    </div>
    <Card>
      <SLabel>📈 Ventas 7 Días</SLabel>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={barData} barSize={18}>
          <XAxis dataKey="name" tick={{fill:"#6B7280",fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:"#6B7280",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`€${v}`}/>
          <Tooltip formatter={v=>fmt$(v)} contentStyle={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:10,color:GOLD}}/>
          <Bar dataKey="Ventas" fill={GOLD2} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </Card>
    {lowStock.length>0&&<Card style={{border:"1px solid rgba(239,68,68,0.3)"}}>
      <SLabel color="#F87171">⚠️ Stock Bajo ({lowStock.length})</SLabel>
      {lowStock.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{color:GOLD,fontSize:13}}>{p.name}</span><Badge color={RED}>{p.stock} {p.unit}</Badge>
      </div>)}
    </Card>}
    {pendingSales.length>0&&<Card style={{border:`1px solid ${YELLOW}44`}}>
      <SLabel color={YELLOW}>🟡 Ventas Pendientes ({pendingSales.length})</SLabel>
      {pendingSales.slice(0,5).map(s=>{const paid=(s.payments||[]).reduce((a,p)=>a+p.amount,0);return<div key={s.id} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:GOLD,fontSize:13}}>{s.customerName}</span><span style={{color:YELLOW,fontWeight:700,fontSize:13}}>{fmt$(Math.max(0,s.total-paid))} pend.</span></div>})}
    </Card>}
  </div>
}
export default Dashboard
