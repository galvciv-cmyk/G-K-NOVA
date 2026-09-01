import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, fmt$ } from "../constants.js"
import { Card, SLabel, Badge } from "./ui.jsx"

export default function Search({state, onNavigate}){
  const [query,setQuery]=useState("")

  if(!query.trim()) return (
    <div>
      <SLabel>🔍 Búsqueda Global</SLabel>
      <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar productos, clientes, ventas, cotizaciones..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.2)",borderRadius:12,padding:"14px 16px",color:GOLD,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      <p style={{color:"#4B5563",fontSize:12,textAlign:"center",marginTop:40}}>Escribe para buscar en toda la app</p>
    </div>
  )

  const q=query.toLowerCase()

  const products=(state.products||[]).filter(p=>p.name?.toLowerCase().includes(q)||p.code?.toLowerCase().includes(q)||p.category?.toLowerCase().includes(q))
  const customers=(state.customers||[]).filter(c=>c.name?.toLowerCase().includes(q)||c.phone?.includes(q)||c.email?.toLowerCase().includes(q))
  const sales=(state.sales||[]).filter(s=>s.customerName?.toLowerCase().includes(q)||String(s.receiptNumber||"").includes(q)||s.note?.toLowerCase().includes(q))
  const quotes=(state.quotes||[]).filter(qt=>qt.customerName?.toLowerCase().includes(q)||String(qt.quoteNumber||"").includes(q))

  const total=products.length+customers.length+sales.length+quotes.length

  return <div>
    <SLabel>🔍 Búsqueda Global</SLabel>
    <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar productos, clientes, ventas, cotizaciones..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.2)",borderRadius:12,padding:"14px 16px",color:GOLD,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:16}}/>

    {total===0
      ?<p style={{color:"#4B5563",fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin resultados para "{query}"</p>
      :<div style={{display:"flex",flexDirection:"column",gap:16}}>

        {products.length>0&&<div>
          <p style={{color:GOLD2,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>📦 Productos ({products.length})</p>
          {products.map(p=>{
            const sc=p.stock<=0?RED:p.stock<=(p.minStock||5)?YELLOW:GREEN
            return <Card key={p.id} style={{marginBottom:6,cursor:"pointer"}} onClick={()=>onNavigate("inventory")}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{p.name}</p>
                  <p style={{color:"#6B7280",fontSize:11}}>{p.code} · {p.category}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(p.price)}</p>
                  <p style={{color:sc,fontSize:11}}>{p.stock} {p.unit}</p>
                </div>
              </div>
            </Card>
          })}
        </div>}

        {customers.length>0&&<div>
          <p style={{color:GOLD2,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>👥 Clientes ({customers.length})</p>
          {customers.map(c=>{
            const total=(state.sales||[]).filter(s=>s.customerId===c.id).reduce((s,sale)=>s+sale.total,0)
            return <Card key={c.id} style={{marginBottom:6,cursor:"pointer"}} onClick={()=>onNavigate("customers")}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{c.name}</p>
                  <p style={{color:"#6B7280",fontSize:11}}>{c.phone||""}</p>
                </div>
                <p style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(total)}</p>
              </div>
            </Card>
          })}
        </div>}

        {sales.length>0&&<div>
          <p style={{color:GOLD2,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>🛒 Ventas ({sales.length})</p>
          {sales.map(s=><Card key={s.id} style={{marginBottom:6,cursor:"pointer"}} onClick={()=>onNavigate("sales")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{s.customerName}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{new Date(s.date).toLocaleDateString("es-VE")} · #{s.receiptNumber}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(s.total)}</p>
                <Badge color={s.paymentStatus==="paid"?GREEN:YELLOW}>{s.paymentStatus==="paid"?"Pagado":"Pendiente"}</Badge>
              </div>
            </div>
          </Card>)}
        </div>}

        {quotes.length>0&&<div>
          <p style={{color:GOLD2,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>📋 Cotizaciones ({quotes.length})</p>
          {quotes.map(q=><Card key={q.id} style={{marginBottom:6,cursor:"pointer"}} onClick={()=>onNavigate("quotes")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{q.customerName}</p>
                <p style={{color:"#6B7280",fontSize:11}}>COT-{String(q.quoteNumber).padStart(6,"0")} · {new Date(q.date).toLocaleDateString("es-VE")}</p>
              </div>
              <p style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(q.total)}</p>
            </div>
          </Card>)}
        </div>}
      </div>
    }
  </div>
}
