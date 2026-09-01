import { useState, useEffect } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, CATEGORIES, CAT_PREFIX, DEFAULT_STATE, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"

function Receivables({state}){
  const debtors=(state.customers||[]).map(c=>{
    const sales=(state.sales||[]).filter(s=>s.customerId===c.id&&s.paymentStatus!=="paid")
    const debt=sales.reduce((sum,s)=>sum+Math.max(0,s.total-(s.payments||[]).reduce((a,p)=>a+p.amount,0)),0)
    const oldest=sales.length>0?new Date(Math.min(...sales.map(s=>new Date(s.date)))):null
    return{...c,sales,debt,oldest}
  }).filter(c=>c.debt>0).sort((a,b)=>b.debt-a.debt)

  // Also include sales without saved customer
  const anonSales=(state.sales||[]).filter(s=>!s.customerId&&s.paymentStatus!=="paid")

  const totalDebt=debtors.reduce((s,c)=>s+c.debt,0)+anonSales.reduce((s,sale)=>s+Math.max(0,sale.total-(sale.payments||[]).reduce((a,p)=>a+p.amount,0)),0)

  return<div>
    <SLabel>💰 Cuentas por Cobrar</SLabel>
    {totalDebt>0&&<Card style={{background:"rgba(251,191,36,0.08)",border:`1px solid ${YELLOW}44`,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <p style={{color:YELLOW,fontWeight:700,fontSize:13}}>Total por Cobrar</p>
          <p style={{color:"#6B7280",fontSize:11}}>{debtors.length+anonSales.length} clientes/ventas pendientes</p>
        </div>
        <p style={{color:YELLOW,fontWeight:800,fontSize:22}}>{fmt$(totalDebt)}</p>
      </div>
    </Card>}

    {debtors.length===0&&anonSales.length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>🎉 Sin deudas pendientes</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {debtors.map(c=>(
          <Card key={c.id}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY,fontWeight:800,fontSize:15,flexShrink:0}}>{c.name[0]}</div>
              <div style={{flex:1}}>
                <p style={{color:GOLD,fontWeight:700,fontSize:14}}>{c.name}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{c.sales.length} venta(s) · desde {c.oldest?.toLocaleDateString("es-VE")}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:YELLOW,fontWeight:800,fontSize:15}}>{fmt$(c.debt)}</p>
                {c.phone&&<button onClick={()=>sendWhatsApp(c.phone,`Hola ${c.name} 👋\n\nTe recordamos que tienes un saldo pendiente con *GK Nova* de *${fmt$(c.debt)}*.\n\n¿Cuándo podemos coordinar el pago? 🙏`)} style={{background:"none",border:"none",color:"#25D366",cursor:"pointer",fontSize:11,fontWeight:600}}>💬 Recordar</button>}
              </div>
            </div>
          </Card>
        ))}
        {anonSales.map(s=>{
          const debt=Math.max(0,s.total-(s.payments||[]).reduce((a,p)=>a+p.amount,0))
          return<Card key={s.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{s.customerName}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{new Date(s.date).toLocaleDateString("es-VE")}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:YELLOW,fontWeight:700}}>{fmt$(debt)}</p>
                {s.customerPhone&&<button onClick={()=>sendWhatsApp(s.customerPhone,`Hola ${s.customerName} 👋\n\nTe recordamos que tienes un saldo pendiente con *GK Nova* de *${fmt$(debt)}*.\n\n¿Cuándo podemos coordinar el pago? 🙏`)} style={{background:"none",border:"none",color:"#25D366",cursor:"pointer",fontSize:11,fontWeight:600}}>💬 Recordar</button>}
              </div>
            </div>
          </Card>
        })}
      </div>
    }
  </div>
}
export default Receivables
