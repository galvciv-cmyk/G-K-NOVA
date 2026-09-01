import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"
import { generateSaleReceipt, generatePaymentReceipt } from "../pdf/index.js"
import { useToast } from "./Toast.jsx"

function EditSaleModal({sale, onSave, onClose}){
  const [note,setNote]=useState(sale.note||"")
  const [delivery,setDelivery]=useState(sale.deliveryStatus||"production")
  return <Modal title={`Editar — ${sale.customerName}`} onClose={onClose}>
    <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
      <p style={{color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Estado de Entrega</p>
      <div style={{display:"flex",gap:8}}>
        {[["production","⚙️ En Producción","#A78BFA"],["delivered","📦 Entregado","#93C5FD"]].map(([v,l,c])=>(
          <button key={v} onClick={()=>setDelivery(v)} style={{flex:1,padding:"8px",borderRadius:9,border:`2px solid ${delivery===v?c:"transparent"}`,background:delivery===v?c+"22":"rgba(255,255,255,0.05)",color:delivery===v?c:GOLD,fontWeight:600,fontSize:12,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>📝 Nota Interna</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none"}}/>
    </div>
    <div style={{display:"flex",gap:10}}>
      <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Cancelar</Btn>
      <Btn onClick={()=>onSave({...sale,note,deliveryStatus:delivery})} style={{flex:2}}>💾 Guardar</Btn>
    </div>
  </Modal>
}

export default function Sales({state, ops}){
  const toast = useToast()
  const [showNew,setShowNew]=useState(false)
  const [showDetail,setShowDetail]=useState(null)
  const [editSale,setEditSale]=useState(null)
  const [showAbono,setShowAbono]=useState(null)
  const [cart,setCart]=useState([])
  const [customerName,setCustomerName]=useState("")
  const [customerPhone,setCustomerPhone]=useState("")
  const [customerSearch,setCustomerSearch]=useState("")
  const [selCustomer,setSelCustomer]=useState(null)
  const [payments,setPayments]=useState([{method:"Efectivo USD",amount:"",reference:""}])
  const [discount,setDiscount]=useState(0)
  const [isPartial,setIsPartial]=useState(false)
  const [productSearch,setProductSearch]=useState("")
  const [saleNote,setSaleNote]=useState("")
  const [abonoAmount,setAbonoAmount]=useState("")
  const [abonoMethod,setAbonoMethod]=useState("Efectivo USD")
  const [abonoRef,setAbonoRef]=useState("")

  const subtotal=cart.reduce((s,i)=>s+i.qty*i.price,0)
  const total=subtotal-Number(discount||0)
  const totalPaid=payments.reduce((s,p)=>s+Number(p.amount||0),0)
  const filteredProds=state.products.filter(p=>p.stock>0&&(!productSearch||p.name.toLowerCase().includes(productSearch.toLowerCase())||p.code?.toLowerCase().includes(productSearch.toLowerCase())))
  const filteredCusts=state.customers.filter(c=>c.name.toLowerCase().includes(customerSearch.toLowerCase()))

  const addToCart=p=>{
    setCart(c=>{const ex=c.find(i=>i.productId===p.id);if(ex)return c.map(i=>i.productId===p.id?{...i,qty:i.qty+1}:i);return[...c,{productId:p.id,qty:1,price:p.price,name:p.name}]})
    setProductSearch("")
  }
  const updateQty=(pid,qty)=>{
    const p=state.products.find(pr=>pr.id===pid)
    if(qty<=0){setCart(c=>c.filter(i=>i.productId!==pid));return}
    if(qty>(p?.stock||0))return
    setCart(c=>c.map(i=>i.productId===pid?{...i,qty}:i))
  }

  const completeSale=async()=>{
    if(cart.length===0)return
    const validPayments=payments.filter(p=>Number(p.amount)>0).map(p=>({id:uid(),date:new Date().toISOString(),amount:Number(p.amount),method:p.method,reference:p.reference||""}))
    const paidAmount=validPayments.reduce((s,p)=>s+p.amount,0)
    const methodsSummary=validPayments.map(p=>p.method).join(" + ")||"Sin pago"
    const custName=selCustomer?.name||customerName||"Cliente"
    const custPhone=selCustomer?.phone||customerPhone||""

    // Auto-save new customer
    let newCustomer=null
    if(!selCustomer&&custName!=="Cliente"&&custPhone){
      const exists=state.customers.find(c=>c.phone===custPhone||c.name.toLowerCase()===custName.toLowerCase())
      if(!exists) newCustomer={id:uid(),name:custName,phone:custPhone,email:"",id_number:""}
    }

    const sale={
      id:uid(),type:"sale",date:new Date().toISOString(),
      items:cart,customerName:custName,customerPhone:custPhone,
      customerId:selCustomer?.id||newCustomer?.id||null,
      payments:validPayments,discount:Number(discount||0),subtotal,total,
      paymentStatus:paidAmount>=total?"paid":"pending",
      deliveryStatus:"production",note:saleNote,
      receiptNumber:state.config.receiptCounter||1,
      exchangeRate:state.config.exchangeRate||655
    }
    const stockUpdates=cart.map(item=>{
      const p=state.products.find(pr=>pr.id===item.productId)
      return {id:item.productId,stock:(p?.stock||0)-item.qty}
    })
    const movement={id:uid(),type:"sale",date:sale.date,saleId:sale.id,description:`Venta a ${custName}`,total,status:sale.paymentStatus}

    const finalSale = await ops.addSale(sale,stockUpdates,movement,newCustomer)

    const doc=generateSaleReceipt({sale:finalSale,products:state.products,customer:selCustomer,config:state.config,exchangeRate:state.config.exchangeRate||655})
    doc.save(`nota-${String(finalSale.receiptNumber).padStart(8,"0")}.pdf`)
    toast(`Recibo #${finalSale.receiptNumber} descargado`)

    const phone=custPhone||state.config.whatsappNumber
    if(phone){
      const pending=Math.max(0,total-paidAmount)
      const msg=`Hola ${custName} 👋\n\nTe compartimos tu *Nota de Entrega* de *GK Nova*.\n\n🛒 *${cart.length} producto(s)*\n💰 *Total: ${fmt$(total)}*\n💳 ${methodsSummary}\n${sale.paymentStatus==="paid"?"✅ Pago completo":"⏳ Pendiente: "+fmt$(pending)}\n\n¡Gracias! 🙏`
      setTimeout(()=>{sendWhatsApp(phone,msg);toast("Enviado por WhatsApp")},1500)
    }
    setCart([]);setCustomerName("");setCustomerPhone("");setSelCustomer(null);setPayments([{method:"Efectivo USD",amount:"",reference:""}]);setDiscount(0);setIsPartial(false);setSaleNote("");setShowNew(false)
  }

  const registerAbono=async sale=>{
    if(!abonoAmount||Number(abonoAmount)<=0)return
    const payment={id:uid(),date:new Date().toISOString(),amount:Number(abonoAmount),method:abonoMethod,reference:abonoRef}
    const paid=(sale.payments||[]).reduce((s,p)=>s+p.amount,0)+Number(abonoAmount)
    const updSale={...sale,payments:[...(sale.payments||[]),payment],paymentStatus:paid>=sale.total?"paid":"pending"}
    await ops.updateSale(updSale)

    const customer=state.customers.find(c=>c.id===sale.customerId)||null
    const doc=generatePaymentReceipt({sale:updSale,payment,customer,config:state.config,exchangeRate:state.config.exchangeRate||655})
    doc.save(`abono-${payment.id.slice(0,8)}.pdf`)
    toast("Abono registrado")

    const phone=customer?.phone||sale.customerPhone||state.config.whatsappNumber
    if(phone){
      const pending=Math.max(0,sale.total-paid)
      const msg=`Hola ${sale.customerName} 👋\n\n✅ Registramos tu abono en *GK Nova*.\n💰 *${fmt$(Number(abonoAmount))}* vía ${abonoMethod}\n${abonoRef?`🔖 Ref: ${abonoRef}\n`:""}\n📊 Pagado: ${fmt$(paid)}\n${pending>0?`⏳ Pendiente: ${fmt$(pending)}`:"✅ ¡Completado!"}\n\n¡Gracias! 🙏`
      setTimeout(()=>{sendWhatsApp(phone,msg);toast("Enviado por WhatsApp")},1500)
    }
    setAbonoAmount("");setAbonoMethod("Efectivo USD");setAbonoRef("")
    setShowAbono(null)
    if(showDetail?.id===sale.id) setShowDetail(updSale)
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <SLabel>🛒 Ventas</SLabel>
      <Btn onClick={()=>setShowNew(true)}>+ Nueva Venta</Btn>
    </div>

    {state.sales.length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin ventas aún</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {state.sales.map(sale=>{
          const paid=(sale.payments||[]).reduce((s,p)=>s+p.amount,0)
          const pending=Math.max(0,sale.total-paid)
          return <Card key={sale.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>setShowDetail(sale)}>
              <div style={{flex:1}}>
                <p style={{color:GOLD,fontWeight:700,fontSize:14,marginBottom:4}}>{sale.customerName}</p>
                <StatusBadge payStatus={sale.paymentStatus} delStatus={sale.deliveryStatus}/>
                <p style={{color:"#6B7280",fontSize:11,marginTop:4}}>{new Date(sale.date).toLocaleString("es-VE")} · {sale.items?.length} items</p>
              </div>
              <div style={{textAlign:"right",minWidth:80}}>
                <p style={{color:GREEN,fontWeight:800,fontSize:15}}>{fmt$(sale.total)}</p>
                {pending>0&&<p style={{color:YELLOW,fontSize:11,fontWeight:600}}>{fmt$(pending)} pend.</p>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              {sale.paymentStatus!=="paid"&&<Btn variant="yellow" onClick={()=>setShowAbono(sale)} style={{flex:2,fontSize:12}}>💰 Realizar Abono</Btn>}
              <Btn variant="ghost" onClick={()=>{const u={...sale,deliveryStatus:sale.deliveryStatus==="delivered"?"production":"delivered"};ops.updateSale(u);toast(u.deliveryStatus==="delivered"?"Marcado como entregado":"Regresado a producción","info")}} style={{flex:sale.paymentStatus==="paid"?2:1,fontSize:12}}>{sale.deliveryStatus==="delivered"?"↩ Producción":"📦 Entregado"}</Btn>
              <Btn variant="ghost" onClick={()=>{const doc=generateSaleReceipt({sale,products:state.products,customer:state.customers.find(c=>c.id===sale.customerId),config:state.config,exchangeRate:sale.exchangeRate||state.config.exchangeRate});doc.save(`nota-${String(sale.receiptNumber).padStart(8,"0")}.pdf`);toast("Recibo descargado")}} style={{fontSize:12}}>🖨</Btn>
              <Btn variant="danger" onClick={async()=>{if(!window.confirm("¿Eliminar esta venta?"))return;const restores=sale.items?.map(item=>{const p=state.products.find(pr=>pr.id===item.productId);return{id:item.productId,stock:(p?.stock||0)+item.qty}})||[];await ops.removeSale(sale.id,restores);toast("Venta eliminada","info")}} style={{fontSize:12}}>🗑</Btn>
            </div>
          </Card>
        })}
      </div>
    }

    {/* Detail */}
    {showDetail&&<Modal title={`${showDetail.customerName}`} onClose={()=>setShowDetail(null)} wide>
      <StatusBadge payStatus={showDetail.paymentStatus} delStatus={showDetail.deliveryStatus}/>
      <div style={{marginTop:14}}>
        {showDetail.items?.map((item,i)=>{
          const p=state.products.find(pr=>pr.id===item.productId)||{}
          return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:GOLD,fontSize:13}}>{p.name||item.name} × {item.qty}</span>
            <span style={{color:GREEN,fontSize:13,fontWeight:600}}>{fmt$(item.qty*item.price)}</span>
          </div>
        })}
        <div style={{marginTop:10,padding:"10px 0",borderTop:"1px solid rgba(232,213,183,0.1)"}}>
          {[["Subtotal",showDetail.subtotal],["Descuento",-showDetail.discount],["Total",showDetail.total]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"#6B7280",fontSize:13}}>{l}</span><span style={{color:GOLD,fontWeight:700,fontSize:13}}>{fmt$(v)}</span>
            </div>
          ))}
        </div>
        {showDetail.payments?.length>0&&<div style={{marginTop:8}}>
          <p style={{color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Abonos</p>
          {showDetail.payments.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
            <span style={{color:"#9CA3AF",fontSize:12}}>{new Date(p.date).toLocaleDateString("es-VE")} · {p.method}</span>
            <span style={{color:GREEN,fontSize:12,fontWeight:600}}>{fmt$(p.amount)}</span>
          </div>)}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
            <span style={{color:GOLD,fontWeight:600,fontSize:13}}>Pendiente</span>
            <span style={{color:YELLOW,fontWeight:700,fontSize:13}}>{fmt$(Math.max(0,showDetail.total-(showDetail.payments||[]).reduce((s,p)=>s+p.amount,0)))}</span>
          </div>
        </div>}
        {showDetail.note&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",marginTop:10}}>
          <p style={{color:"rgba(232,213,183,0.5)",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>📝 Nota</p>
          <p style={{color:GOLD,fontSize:13}}>{showDetail.note}</p>
        </div>}
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
        <Btn variant="ghost" onClick={()=>{const doc=generateSaleReceipt({sale:showDetail,products:state.products,customer:state.customers.find(c=>c.id===showDetail.customerId),config:state.config,exchangeRate:showDetail.exchangeRate||state.config.exchangeRate});doc.save(`nota-${String(showDetail.receiptNumber).padStart(8,"0")}.pdf`)}} style={{fontSize:12}}>🖨 Recibo</Btn>
        {showDetail.paymentStatus!=="paid"&&<Btn variant="yellow" onClick={()=>setShowAbono(showDetail)} style={{fontSize:12}}>💰 Abono</Btn>}
        <Btn variant={showDetail.deliveryStatus==="delivered"?"ghost":"green"} onClick={async()=>{const u={...showDetail,deliveryStatus:showDetail.deliveryStatus==="delivered"?"production":"delivered"};await ops.updateSale(u);setShowDetail(u)}} style={{fontSize:12}}>{showDetail.deliveryStatus==="delivered"?"↩ Producción":"📦 Entregado"}</Btn>
        <Btn variant="ghost" onClick={()=>{setEditSale(showDetail);setShowDetail(null)}} style={{fontSize:12}}>✏️ Editar</Btn>
        <Btn variant="danger" onClick={async()=>{if(!window.confirm("¿Eliminar esta venta?"))return;const restores=showDetail.items?.map(item=>{const p=state.products.find(pr=>pr.id===item.productId);return{id:item.productId,stock:(p?.stock||0)+item.qty}})||[];await ops.removeSale(showDetail.id,restores);setShowDetail(null)}} style={{fontSize:12}}>🗑</Btn>
      </div>
    </Modal>}

    {editSale&&<EditSaleModal sale={editSale} onSave={async u=>{await ops.updateSale(u);setEditSale(null)}} onClose={()=>setEditSale(null)}/>}

    {/* Abono */}
    {showAbono&&<Modal title={`Abono — ${showAbono.customerName}`} onClose={()=>setShowAbono(null)}>
      {(()=>{const paid=(showAbono.payments||[]).reduce((s,p)=>s+p.amount,0);const pending=Math.max(0,showAbono.total-paid);return(
        <div style={{background:"rgba(251,191,36,0.1)",border:`1px solid ${YELLOW}44`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
          <p style={{color:YELLOW,fontSize:13,fontWeight:600}}>Pendiente: {fmt$(pending)}</p>
        </div>
      )})()}
      <Input label="Monto €" type="number" placeholder="0.00" value={abonoAmount} onChange={e=>setAbonoAmount(e.target.value)}/>
      <Select label="Método" value={abonoMethod} onChange={e=>setAbonoMethod(e.target.value)}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</Select>
      <Input label="Referencia (opcional)" value={abonoRef} onChange={e=>setAbonoRef(e.target.value)}/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn variant="ghost" onClick={()=>setShowAbono(null)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={()=>registerAbono(showAbono)} style={{flex:2}} disabled={!abonoAmount}>✅ Registrar y WhatsApp</Btn>
      </div>
    </Modal>}

    {/* New Sale */}
    {showNew&&<Modal title="Nueva Venta" onClose={()=>setShowNew(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <SLabel>Productos</SLabel>
          <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Buscar..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
          <div style={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {filteredProds.length===0
              ?<p style={{color:"#6B7280",padding:"10px 13px",fontSize:12}}>{state.products.length===0?"Sin productos en inventario":"Sin stock disponible"}</p>
              :filteredProds.map(p=><div key={p.id} onClick={()=>addToCart(p)} style={{padding:"7px 13px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between"}}>
                <span style={{color:GOLD,fontSize:12}}>{p.name} <span style={{color:"#6B7280"}}>({p.code})</span></span>
                <span style={{color:GREEN,fontSize:12,fontWeight:600}}>{fmt$(p.price)}</span>
              </div>)
            }
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5,minHeight:60}}>
            {cart.length===0?<p style={{color:"#4B5563",fontSize:12,textAlign:"center",padding:"10px 0"}}>Agrega productos 👆</p>:
              cart.map(item=>{const p=state.products.find(pr=>pr.id===item.productId)
                return <div key={item.productId} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}}>
                  <span style={{flex:1,color:GOLD,fontSize:12}}>{p?.name}</span>
                  <button onClick={()=>updateQty(item.productId,item.qty-1)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:GOLD,borderRadius:5,width:20,height:20,cursor:"pointer"}}>−</button>
                  <span style={{color:GOLD,fontSize:12,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                  <button onClick={()=>updateQty(item.productId,item.qty+1)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:GOLD,borderRadius:5,width:20,height:20,cursor:"pointer"}}>+</button>
                  <span style={{color:GREEN,fontSize:12,fontWeight:600,minWidth:50,textAlign:"right"}}>{fmt$(item.qty*item.price)}</span>
                </div>
              })
            }
          </div>
        </div>
        <div>
          <SLabel>Cliente</SLabel>
          <input value={customerSearch} onChange={e=>{setCustomerSearch(e.target.value);setCustomerName(e.target.value)}} placeholder="Buscar o escribir nombre..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:4}}/>
          {customerSearch&&filteredCusts.length>0&&<div style={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,marginBottom:6,maxHeight:100,overflowY:"auto"}}>
            {filteredCusts.map(c=><div key={c.id} onClick={()=>{setSelCustomer(c);setCustomerName(c.name);setCustomerPhone(c.phone||"");setCustomerSearch(c.name)}} style={{padding:"6px 13px",cursor:"pointer",color:GOLD,fontSize:13,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{c.name}</div>)}
          </div>}
          <Input label="Teléfono WhatsApp" placeholder="+584241234567" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
          <SLabel style={{marginTop:4}}>💳 Pagos</SLabel>
          {payments.map((p,idx)=><div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,marginBottom:6,alignItems:"end"}}>
            <Select value={p.method} onChange={e=>{const np=[...payments];np[idx]={...np[idx],method:e.target.value};setPayments(np)}} style={{marginBottom:0}}>
              {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
            </Select>
            <Input placeholder="Monto €" type="number" value={p.amount} onChange={e=>{const np=[...payments];np[idx]={...np[idx],amount:e.target.value};setPayments(np)}} style={{marginBottom:0}}/>
            {payments.length>1&&<button onClick={()=>setPayments(payments.filter((_,i)=>i!==idx))} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#F87171",cursor:"pointer",padding:"10px 8px",marginBottom:0}}>✕</button>}
          </div>)}
          <button onClick={()=>setPayments([...payments,{method:"Efectivo EUR",amount:"",reference:""}])} style={{background:"rgba(232,213,183,0.06)",border:"1px dashed rgba(232,213,183,0.2)",borderRadius:8,color:GOLD2,cursor:"pointer",padding:"6px 12px",fontSize:11,fontWeight:600,width:"100%",marginBottom:10}}>+ Método</button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <input type="checkbox" checked={isPartial} onChange={e=>setIsPartial(e.target.checked)} id="partial" style={{width:16,height:16}}/>
            <label htmlFor="partial" style={{color:GOLD,fontSize:12,cursor:"pointer"}}>Pago parcial</label>
          </div>
          <Input label="Descuento €" type="number" value={discount} onChange={e=>setDiscount(e.target.value)}/>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#6B7280",fontSize:12}}>Subtotal</span><span style={{color:GOLD,fontSize:12}}>{fmt$(subtotal)}</span></div>
            {totalPaid>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#6B7280",fontSize:12}}>Pagado</span><span style={{color:GREEN,fontSize:12}}>{fmt$(totalPaid)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid rgba(232,213,183,0.1)",paddingTop:6,marginTop:4}}><span style={{color:GOLD,fontWeight:700}}>TOTAL</span><span style={{color:GREEN,fontWeight:800,fontSize:16}}>{fmt$(total)}</span></div>
            <p style={{color:"#6B7280",fontSize:11,marginTop:2}}>{fmtBs(total,state.config?.exchangeRate)}</p>
          </div>
          <div style={{marginTop:10}}>
            <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>📝 Nota</label>
            <textarea value={saleNote} onChange={e=>setSaleNote(e.target.value)} rows={2} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none"}}/>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:12}}>
        <Btn variant="ghost" onClick={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={completeSale} style={{flex:2}} disabled={cart.length===0}>✅ Completar y WhatsApp</Btn>
      </div>
    </Modal>}
  </div>
}
