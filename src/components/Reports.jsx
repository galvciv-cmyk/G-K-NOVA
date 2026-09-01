import { useState, useEffect, useCallback, useRef } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, CATEGORIES, CAT_PREFIX, DEFAULT_STATE, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"
import * as XLSX from "xlsx"

function Reports({state}){
  const [dateFrom,setDateFrom]=useState("")
  const [dateTo,setDateTo]=useState("")

  const filtered=( state.sales||[]).filter(s=>{
    const d=new Date(s.date)
    const from=dateFrom?new Date(dateFrom):null
    const to=dateTo?new Date(dateTo+"T23:59:59"):null
    return(!from||d>=from)&&(!to||d<=to)
  })
  const filteredPurch=(state.purchases||[]).filter(p=>{
    const d=new Date(p.date)
    const from=dateFrom?new Date(dateFrom):null
    const to=dateTo?new Date(dateTo+"T23:59:59"):null
    return(!from||d>=from)&&(!to||d<=to)
  })

  const totalSales=filtered.reduce((s,sale)=>s+sale.total,0)
  const totalPurch=filteredPurch.reduce((s,p)=>s+p.total,0)
  const totalPaid=filtered.reduce((s,sale)=>s+(sale.payments||[]).reduce((a,p)=>a+p.amount,0),0)
  const totalPending=Math.max(0,totalSales-totalPaid)
  const profit=totalSales-totalPurch

  const byMethod={}
  filtered.forEach(sale=>sale.payments?.forEach(p=>{byMethod[p.method]=(byMethod[p.method]||0)+p.amount}))

  const prodCount={}
  filtered.forEach(sale=>sale.items?.forEach(item=>{
    if(!prodCount[item.productId])prodCount[item.productId]={qty:0,revenue:0}
    prodCount[item.productId].qty+=item.qty
    prodCount[item.productId].revenue+=item.qty*item.price
  }))
  const topProds=Object.entries(prodCount).map(([id,d])=>({...d,product:state.products.find(p=>p.id===id)})).filter(d=>d.product).sort((a,b)=>b.revenue-a.revenue).slice(0,5)

  const exportReport=()=>{
    const wb=XLSX.utils.book_new()
    const summary=[["REPORTE GK NOVA",""],["Período",`${dateFrom||"Inicio"} → ${dateTo||"Hoy"}`],["",""],["Ventas Totales",totalSales],["Compras Totales",totalPurch],["Ganancia",profit],["Cobrado",totalPaid],["Pendiente",totalPending]]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),"Resumen")
    const salesData=[["Fecha","Cliente","Items","Método","Total","Estado"],...filtered.map(s=>[new Date(s.date).toLocaleDateString("es-VE"),s.customerName,s.items?.length,s.payments?.[0]?.method||"-",s.total,s.paymentStatus==="paid"?"Pagado":"Pendiente"])]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(salesData),"Ventas")
    XLSX.writeFile(wb,`reporte-gknova-${dateFrom||"completo"}.xlsx`)
  }

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <SLabel>📅 Reportes por Período</SLabel>
      <Btn variant="ghost" onClick={exportReport} style={{fontSize:12}}>📤 Exportar Excel</Btn>
    </div>
    <Card>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
        {[["Desde",dateFrom,setDateFrom],["Hasta",dateTo,setDateTo]].map(([l,v,s])=>(
          <div key={l} style={{flex:1,minWidth:130}}>
            <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>{l}</label>
            <input type="date" value={v} onChange={e=>s(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 12px",color:GOLD,fontSize:13,outline:"none"}}/>
          </div>
        ))}
        {(dateFrom||dateTo)&&<Btn variant="danger" onClick={()=>{setDateFrom("");setDateTo("")}} style={{fontSize:12}}>✕</Btn>}
      </div>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[["Ventas",totalSales,GREEN],["Compras",totalPurch,YELLOW],["Ganancia",profit,profit>=0?GREEN:RED],["Por Cobrar",totalPending,YELLOW]].map(([l,v,c])=>(
        <Card key={l}><p style={{color:"rgba(232,213,183,0.45)",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{l}</p><p style={{fontSize:20,fontWeight:800,color:c}}>{fmt$(v)}</p><p style={{color:"#4B5563",fontSize:10,marginTop:2}}>{filtered.length} ventas</p></Card>
      ))}
    </div>
    {Object.keys(byMethod).length>0&&<Card>
      <SLabel>💳 Por Método de Pago</SLabel>
      {Object.entries(byMethod).sort((a,b)=>b[1]-a[1]).map(([method,amount])=>(
        <div key={method} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <span style={{color:GOLD,fontSize:13}}>{method}</span>
          <span style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(amount)}</span>
        </div>
      ))}
    </Card>}
    {topProds.length>0&&<Card>
      <SLabel>🏆 Top Productos</SLabel>
      {topProds.map((d,i)=>(
        <div key={d.product.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <span style={{color:GOLD2,fontWeight:800,fontSize:14,minWidth:20}}>{i+1}</span>
          <div style={{flex:1}}><p style={{color:GOLD,fontSize:13,fontWeight:600}}>{d.product.name}</p><p style={{color:"#6B7280",fontSize:11}}>{d.qty} unidades</p></div>
          <span style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(d.revenue)}</span>
        </div>
      ))}
    </Card>}
  </div>
}

function exportInventory(products){
  const data=[
    ["Código","Nombre","Categoría","Precio Venta €","Costo €","Stock","Stock Mínimo","Unidad"],
    ...products.map(p=>[p.code,p.name,p.category,p.price,p.cost,p.stock,p.minStock,p.unit])
  ]
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"Inventario")
  XLSX.writeFile(wb,"inventario-gknova.xlsx")
}
export { exportInventory }
export default Reports
