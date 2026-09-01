import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, uid, fmt$, today } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Btn } from "./ui.jsx"
import { generateSaleReceipt, generatePurchaseReceipt, generateMonthlyClosing } from "../pdf/index.js"
import { useToast } from "./Toast.jsx"

export default function Movements({state, ops}){
  const toast = useToast()
  const [filter,setFilter]=useState("all")
  const [search,setSearch]=useState("")
  const [dateFrom,setDateFrom]=useState("")
  const [dateTo,setDateTo]=useState("")
  const [showClose,setShowClose]=useState(false)
  const [closeMonth,setCloseMonth]=useState(new Date().getMonth()+1)
  const [closeYear,setCloseYear]=useState(new Date().getFullYear())

  const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

  const movs=(state.movements||[]).filter(m=>{
    if(filter!=="all"&&m.type!==filter)return false
    if(search&&!m.description?.toLowerCase().includes(search.toLowerCase()))return false
    if(dateFrom&&new Date(m.date)<new Date(dateFrom))return false
    if(dateTo&&new Date(m.date)>new Date(dateTo+"T23:59:59"))return false
    return true
  })

  const generateClose=()=>{
    const mSales=(state.sales||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()+1===closeMonth&&d.getFullYear()===closeYear})
    const mPurchases=(state.purchases||[]).filter(p=>{const d=new Date(p.date);return d.getMonth()+1===closeMonth&&d.getFullYear()===closeYear})
    const doc=generateMonthlyClosing({month:closeMonth,year:closeYear,sales:mSales,purchases:mPurchases,products:state.products,config:state.config})
    const mName=new Date(closeYear,closeMonth-1,1).toLocaleString("es-VE",{month:"long"})
    doc.save(`cierre-${mName}-${closeYear}.pdf`)
    toast("Cierre mensual generado")
    const key=`${closeYear}-${String(closeMonth).padStart(2,"0")}`
    ops.updateConfig({closedMonths:[...(state.config.closedMonths||[]),key]})
    setShowClose(false)
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <SLabel>📊 Movimientos</SLabel>
      <Btn variant="ghost" onClick={()=>setShowClose(true)} style={{fontSize:12}}>📊 Cierre Mensual</Btn>
    </div>

    {/* Filters */}
    <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
      {[["all","Todos"],["sale","Ventas"],["purchase","Compras"]].map(([k,l])=>(
        <button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",background:filter===k?`linear-gradient(135deg,${GOLD},${GOLD2})`:"rgba(255,255,255,0.07)",color:filter===k?"#0A1628":GOLD}}>{l}</button>
      ))}
    </div>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"8px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      {[["Desde",dateFrom,setDateFrom],["Hasta",dateTo,setDateTo]].map(([l,v,s])=>(
        <div key={l} style={{flex:1}}>
          <label style={{display:"block",color:"rgba(232,213,183,0.4)",fontSize:10,fontWeight:700,marginBottom:3,textTransform:"uppercase"}}>{l}</label>
          <input type="date" value={v} onChange={e=>s(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:8,padding:"7px 10px",color:GOLD,fontSize:12,outline:"none"}}/>
        </div>
      ))}
      {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("")}} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#F87171",cursor:"pointer",padding:"0 10px",marginTop:18,fontSize:12}}>✕</button>}
    </div>

    {movs.length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin movimientos</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {movs.map(mov=>{
          const detail=mov.type==="sale"?(state.sales||[]).find(s=>s.id===mov.saleId):(state.purchases||[]).find(p=>p.id===mov.purchaseId)
          return <Card key={mov.id}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{mov.type==="sale"?"🛒":"📥"}</span>
              <div style={{flex:1}}>
                <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{mov.description}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{new Date(mov.date).toLocaleString("es-VE")}</p>
                {mov.type==="sale"&&detail&&<StatusBadge payStatus={detail.paymentStatus} delStatus={detail.deliveryStatus}/>}
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:mov.type==="sale"?GREEN:YELLOW,fontWeight:700,fontSize:14}}>{mov.type==="sale"?"+":"-"}{fmt$(mov.total)}</p>
                <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:4}}>
                  {detail&&<button onClick={()=>{let doc;if(mov.type==="sale")doc=generateSaleReceipt({sale:detail,products:state.products,customer:(state.customers||[]).find(c=>c.id===detail.customerId),config:state.config,exchangeRate:detail.exchangeRate||state.config?.exchangeRate});else doc=generatePurchaseReceipt({purchase:detail,products:state.products,config:state.config});doc.save(`${mov.type==="sale"?"nota":"orden"}-${mov.id.slice(0,6)}.pdf`);toast("Recibo descargado")}} style={{background:"none",border:"none",color:GOLD2,cursor:"pointer",fontSize:11,fontWeight:600}}>🖨</button>}
                  <button onClick={async()=>{if(window.confirm("¿Eliminar este movimiento?")){await ops.removeMovement(mov.id);toast("Movimiento eliminado","info")}}} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:12}}>🗑</button>
                </div>
              </div>
            </div>
          </Card>
        })}
      </div>
    }

    {showClose&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
      <div style={{background:"#0D1E35",borderRadius:20,padding:28,width:"100%",maxWidth:380,border:"1px solid rgba(232,213,183,0.15)"}}>
        <h3 style={{color:GOLD,fontWeight:700,fontSize:17,marginBottom:16}}>📊 Generar Cierre Mensual</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div>
            <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Mes</label>
            <select value={closeMonth} onChange={e=>setCloseMonth(Number(e.target.value))} style={{width:"100%",background:"#0A1628",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px",color:GOLD,fontSize:13,outline:"none"}}>
              {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Año</label>
            <input type="number" value={closeYear} onChange={e=>setCloseYear(Number(e.target.value))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px",color:GOLD,fontSize:13,outline:"none"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={()=>setShowClose(false)} style={{flex:1}}>Cancelar</Btn>
          <Btn onClick={generateClose} style={{flex:2}}>📊 Generar PDF</Btn>
        </div>
      </div>
    </div>}
  </div>
}
