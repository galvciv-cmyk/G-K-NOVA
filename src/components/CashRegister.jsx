import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, uid, fmt$, today } from "../constants.js"
import { Card, SLabel, Badge, Input, Select, Btn, Modal } from "./ui.jsx"

export default function CashRegister({state, ops}){
  const [showOpen,setShowOpen]=useState(false)
  const [showEntry,setShowEntry]=useState(false)
  const [openAmount,setOpenAmount]=useState("")
  const [entryForm,setEntryForm]=useState({type:"in",amount:"",description:"",method:"Efectivo USD"})

  const todayKey=today()
  const cashLog=state.cashLog||[]
  const todayLog=cashLog.filter(e=>e.date.startsWith(todayKey))
  const openEntry=todayLog.find(e=>e.type==="open")
  const isOpen=!!openEntry

  const totalIn=todayLog.filter(e=>e.type==="in"||e.type==="open").reduce((s,e)=>s+e.amount,0)
  const totalOut=todayLog.filter(e=>e.type==="out").reduce((s,e)=>s+e.amount,0)
  const balance=totalIn-totalOut

  const todaySalesCollected=(state.sales||[]).filter(s=>s.date?.startsWith(todayKey)).reduce((s,sale)=>(sale.payments||[]).reduce((a,p)=>a+p.amount,s),0)

  const openCash=async()=>{
    if(!openAmount)return
    const entry={id:uid(),type:"open",date:new Date().toISOString(),amount:Number(openAmount),description:"Apertura de caja",method:"Efectivo USD"}
    await ops.addCashEntry(entry)
    setOpenAmount("");setShowOpen(false)
  }

  const addEntry=async()=>{
    if(!entryForm.amount)return
    const entry={id:uid(),type:entryForm.type,date:new Date().toISOString(),amount:Number(entryForm.amount),description:entryForm.description||"",method:entryForm.method}
    await ops.addCashEntry(entry)
    setEntryForm({type:"in",amount:"",description:"",method:"Efectivo USD"});setShowEntry(false)
  }

  const closeCash=async()=>{
    if(!window.confirm("¿Cerrar la caja del día?"))return
    const entry={id:uid(),type:"close",date:new Date().toISOString(),amount:balance,description:"Cierre de caja",method:""}
    await ops.addCashEntry(entry)
  }

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <SLabel>💰 Control de Caja</SLabel>
    <Card style={{border:`1px solid ${isOpen?"rgba(34,197,94,0.3)":"rgba(251,191,36,0.3)"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <p style={{color:GOLD,fontWeight:700,fontSize:14}}>{new Date().toLocaleDateString("es-VE",{weekday:"long",day:"numeric",month:"long"})}</p>
          <Badge color={isOpen?GREEN:YELLOW}>{isOpen?"🟢 Abierta":"🔴 Cerrada"}</Badge>
        </div>
        {!isOpen?<Btn onClick={()=>setShowOpen(true)}>💰 Abrir Caja</Btn>:<Btn variant="danger" onClick={closeCash}>🔒 Cerrar</Btn>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {[["Entradas",fmt$(totalIn),GREEN],["Salidas",fmt$(totalOut),RED],["Balance",fmt$(balance),balance>=0?GREEN:RED]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 6px"}}>
            <p style={{color:"rgba(232,213,183,0.4)",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{l}</p>
            <p style={{color:c,fontWeight:800,fontSize:16}}>{v}</p>
          </div>
        ))}
      </div>
      {todaySalesCollected>0&&<div style={{marginTop:10,background:"rgba(34,197,94,0.08)",borderRadius:8,padding:"8px 12px"}}>
        <p style={{color:GREEN,fontSize:12,fontWeight:600}}>+ {fmt$(todaySalesCollected)} cobrado en ventas de hoy</p>
      </div>}
    </Card>

    {isOpen&&<Btn onClick={()=>setShowEntry(true)} style={{width:"100%"}}>+ Registrar Movimiento</Btn>}

    {todayLog.length>0&&<Card>
      <SLabel>📋 Movimientos de Hoy</SLabel>
      {todayLog.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div>
          <p style={{color:GOLD,fontSize:13,fontWeight:600}}>{e.description||e.type}</p>
          <p style={{color:"#6B7280",fontSize:11}}>{new Date(e.date).toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"})}{e.method?` · ${e.method}`:""}</p>
        </div>
        <span style={{color:e.type==="out"?RED:GREEN,fontWeight:700,fontSize:14}}>{e.type==="out"?"-":"+"}{fmt$(e.amount)}</span>
      </div>)}
    </Card>}

    {showOpen&&<Modal title="Abrir Caja" onClose={()=>setShowOpen(false)}>
      <p style={{color:"rgba(232,213,183,0.5)",fontSize:13,marginBottom:14}}>¿Con cuánto dinero abres la caja hoy?</p>
      <Input label="Monto inicial €" type="number" placeholder="0.00" value={openAmount} onChange={e=>setOpenAmount(e.target.value)}/>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="ghost" onClick={()=>setShowOpen(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={openCash} style={{flex:2}} disabled={!openAmount}>💰 Abrir</Btn>
      </div>
    </Modal>}

    {showEntry&&<Modal title="Movimiento de Caja" onClose={()=>setShowEntry(false)}>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["in","💰 Entrada"],["out","💸 Salida"]].map(([v,l])=>(
          <button key={v} onClick={()=>setEntryForm(f=>({...f,type:v}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${entryForm.type===v?(v==="in"?GREEN:RED):"transparent"}`,background:entryForm.type===v?(v==="in"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)"):"rgba(255,255,255,0.05)",color:entryForm.type===v?(v==="in"?GREEN:RED):GOLD,fontWeight:700,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <Input label="Monto €" type="number" placeholder="0.00" value={entryForm.amount} onChange={e=>setEntryForm(f=>({...f,amount:e.target.value}))}/>
      <Input label="Descripción" placeholder="ej: Pago a proveedor..." value={entryForm.description} onChange={e=>setEntryForm(f=>({...f,description:e.target.value}))}/>
      <Select label="Método" value={entryForm.method} onChange={e=>setEntryForm(f=>({...f,method:e.target.value}))}>
        {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
      </Select>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="ghost" onClick={()=>setShowEntry(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={addEntry} style={{flex:2}} disabled={!entryForm.amount}>Registrar</Btn>
      </div>
    </Modal>}
  </div>
}
