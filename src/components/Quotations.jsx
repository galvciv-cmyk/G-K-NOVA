import { useState } from "react"
import { Card, SLabel, Badge, Input, Select, Btn, Modal } from "./ui/index.js"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { generateQuotation } from "../pdf/quotation.js"
import { generateSaleReceipt } from "../pdf/saleReceipt.js"

export default function Quotations({state, onUpdate}) {
  const [showNew, setShowNew] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [selCustomer, setSelCustomer] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [productSearch, setProductSearch] = useState("")
  const [note, setNote] = useState("")

  const subtotal = cart.reduce((s,i)=>s+i.qty*i.price, 0)
  const total = subtotal - Number(discount||0)
  const filteredProds = state.products.filter(p=>(p.name.toLowerCase().includes(productSearch.toLowerCase())||p.code.toLowerCase().includes(productSearch.toLowerCase()))&&p.stock>0)
  const filteredCusts = state.customers.filter(c=>c.name.toLowerCase().includes(customerSearch.toLowerCase()))

  const addToCart = p => {
    setCart(c=>{const ex=c.find(i=>i.productId===p.id);if(ex)return c.map(i=>i.productId===p.id?{...i,qty:i.qty+1}:i);return[...c,{productId:p.id,qty:1,price:p.price,name:p.name}]})
    setProductSearch("")
  }
  const updateQty = (pid,qty) => {
    if(qty<=0){setCart(c=>c.filter(i=>i.productId!==pid));return}
    setCart(c=>c.map(i=>i.productId===pid?{...i,qty}:i))
  }

  const createQuotation = () => {
    if(cart.length===0) return
    const quotation = {
      id:uid(), date:new Date().toISOString(),
      items:cart, customerName:selCustomer?.name||customerName||"Cliente",
      customerPhone:selCustomer?.phone||customerPhone||"",
      customerId:selCustomer?.id||null,
      discount:Number(discount||0), subtotal, total,
      status:"pending", note,
      quotationNumber:state.quotationCounter||1,
      exchangeRate:state.config.exchangeRate||655
    }
    onUpdate({quotations:[...(state.quotations||[]),quotation], quotationCounter:(state.quotationCounter||1)+1})
    const doc = generateQuotation({quotation, products:state.products, customer:selCustomer, config:state.config})
    doc.save(`cotizacion-${String(quotation.quotationNumber).padStart(6,"0")}.pdf`)
    const phone = selCustomer?.phone||customerPhone
    if(phone){
      const msg = `Hola ${quotation.customerName} 👋\n\nTe enviamos tu *Cotización* de *GK Nova*.\n\n📋 COT-${String(quotation.quotationNumber).padStart(6,"0")}\n💰 *Total: ${fmt$(total)}*\n📅 Válida por 3 días\n\n⚠️ _El monto en Bs. puede variar según la tasa BCV del día de pago._\n\n¿Aprobamos? 🙂`
      setTimeout(()=>sendWhatsApp(phone,msg), 1200)
    }
    setCart([]); setCustomerName(""); setCustomerPhone(""); setSelCustomer(null); setDiscount(0); setNote(""); setShowNew(false)
  }

  const approveQuotation = (q) => {
    // Convert to sale
    const validPayments = []
    const sale = {
      id:uid(), type:"sale", date:new Date().toISOString(),
      items:q.items, customerName:q.customerName, customerPhone:q.customerPhone,
      customerId:q.customerId||null, payments:validPayments,
      discount:q.discount||0, subtotal:q.subtotal, total:q.total,
      paymentStatus:"pending", deliveryStatus:"production",
      receiptNumber:state.receiptCounter||1,
      exchangeRate:state.config.exchangeRate||655,
      note:`Generado desde cotización COT-${String(q.quotationNumber).padStart(6,"0")}`
    }
    const updProds = state.products.map(p=>{const item=q.items.find(i=>i.productId===p.id); return item?{...p,stock:p.stock-item.qty}:p})
    const newMov = {id:uid(),type:"sale",date:sale.date,saleId:sale.id,description:`Venta a ${sale.customerName} (desde cotización)`,total:sale.total,status:"pending"}
    const updQuotations = (state.quotations||[]).map(qt=>qt.id===q.id?{...qt,status:"approved",saleId:sale.id}:qt)
    onUpdate({sales:[...state.sales,sale], products:updProds, receiptCounter:(state.receiptCounter||1)+1, movements:[...(state.movements||[]),newMov], quotations:updQuotations})
    // Generate receipt
    const doc = generateSaleReceipt({sale, products:state.products, customer:state.customers.find(c=>c.id===q.customerId), config:state.config, exchangeRate:state.config.exchangeRate||655})
    doc.save(`nota-${String(sale.receiptNumber).padStart(8,"0")}.pdf`)
    setShowDetail(null)
  }

  const statusColor = {pending:YELLOW, approved:GREEN, rejected:RED, expired:"#6B7280"}
  const statusLabel = {pending:"⏳ Pendiente", approved:"✅ Aprobada", rejected:"❌ Rechazada", expired:"⌛ Vencida"}

  const getStatus = (q) => {
    if(q.status!=="pending") return q.status
    const expiry = new Date(q.date); expiry.setDate(expiry.getDate()+3)
    return new Date()>expiry?"expired":"pending"
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <SLabel>📋 Cotizaciones</SLabel>
      <Btn onClick={()=>setShowNew(true)}>+ Nueva Cotización</Btn>
    </div>

    {(state.quotations||[]).length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin cotizaciones aún</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[...(state.quotations||[])].reverse().map(q=>{
          const st=getStatus(q)
          const expiry=new Date(q.date); expiry.setDate(expiry.getDate()+3)
          return <Card key={q.id} style={{cursor:"pointer"}} onClick={()=>setShowDetail(q)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <p style={{color:GOLD,fontWeight:700,fontSize:14}}>{q.customerName}</p>
                  <Badge color={statusColor[st]}>{statusLabel[st]}</Badge>
                </div>
                <p style={{color:"#6B7280",fontSize:11}}>COT-{String(q.quotationNumber).padStart(6,"0")} · {new Date(q.date).toLocaleDateString("es-VE")}</p>
                {st==="pending"&&<p style={{color:YELLOW,fontSize:10,marginTop:2}}>Vence: {expiry.toLocaleDateString("es-VE")}</p>}
              </div>
              <p style={{color:GREEN,fontWeight:800,fontSize:15}}>{fmt$(q.total)}</p>
            </div>
          </Card>
        })}
      </div>
    }

    {/* Detail modal */}
    {showDetail&&<Modal title={`COT-${String(showDetail.quotationNumber).padStart(6,"0")} — ${showDetail.customerName}`} onClose={()=>setShowDetail(null)} wide>
      <div style={{marginBottom:12}}>
        <Badge color={statusColor[getStatus(showDetail)]}>{statusLabel[getStatus(showDetail)]}</Badge>
      </div>
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
            <span style={{color:"#6B7280",fontSize:13}}>{l}</span>
            <span style={{color:GOLD,fontWeight:700,fontSize:13}}>{fmt$(v)}</span>
          </div>
        ))}
        <p style={{color:"#4B5563",fontSize:11,marginTop:4}}>Bs. ref: {fmtBs(showDetail.total, showDetail.exchangeRate||655)}</p>
      </div>
      {showDetail.note&&<p style={{color:"#9CA3AF",fontSize:12,marginTop:8,fontStyle:"italic"}}>{showDetail.note}</p>}
      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
        <Btn variant="ghost" onClick={()=>{const doc=generateQuotation({quotation:showDetail,products:state.products,customer:state.customers.find(c=>c.id===showDetail.customerId),config:state.config});doc.save(`cotizacion-${String(showDetail.quotationNumber).padStart(6,"0")}.pdf`)}} style={{fontSize:12}}>🖨 PDF</Btn>
        {showDetail.customerPhone&&<Btn variant="ghost" onClick={()=>sendWhatsApp(showDetail.customerPhone,`Hola ${showDetail.customerName}, adjunto tu cotización COT-${String(showDetail.quotationNumber).padStart(6,"0")} de GK Nova por ${fmt$(showDetail.total)}. Válida 3 días. ¿La aprobamos? 🙂`)} style={{fontSize:12}}>💬 WhatsApp</Btn>}
        {getStatus(showDetail)==="pending"&&<>
          <Btn variant="green" onClick={()=>approveQuotation(showDetail)} style={{fontSize:12}}>✅ Aprobar y Convertir en Venta</Btn>
          <Btn variant="danger" onClick={()=>{onUpdate({quotations:(state.quotations||[]).map(q=>q.id===showDetail.id?{...q,status:"rejected"}:q)});setShowDetail(null)}} style={{fontSize:12}}>❌ Rechazar</Btn>
        </>}
      </div>
    </Modal>}

    {/* New quotation modal */}
    {showNew&&<Modal title="Nueva Cotización" onClose={()=>setShowNew(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <SLabel>Productos</SLabel>
          <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Buscar producto..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
          {productSearch&&<div style={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {filteredProds.length===0
              ?<p style={{color:"#6B7280",padding:"10px 13px",fontSize:12}}>Sin resultados</p>
              :filteredProds.map(p=><div key={p.id} onClick={()=>addToCart(p)} style={{padding:"7px 13px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between"}}>
                <span style={{color:GOLD,fontSize:12}}>{p.name} <span style={{color:"#6B7280"}}>({p.code})</span></span>
                <span style={{color:GREEN,fontSize:12,fontWeight:600}}>{fmt$(p.price)}</span>
              </div>)
            }
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:5,minHeight:80}}>
            {cart.length===0
              ?<p style={{color:"#4B5563",fontSize:12,textAlign:"center",padding:"16px 0"}}>Agrega productos 👆</p>
              :cart.map(item=>{const p=state.products.find(pr=>pr.id===item.productId)
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
          <Input label="Descuento €" type="number" value={discount} onChange={e=>setDiscount(e.target.value)}/>
          <Input label="Nota (opcional)" placeholder="Detalles adicionales..." value={note} onChange={e=>setNote(e.target.value)}/>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:"#6B7280",fontSize:12}}>Subtotal</span>
              <span style={{color:GOLD,fontSize:12}}>{fmt$(subtotal)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid rgba(232,213,183,0.1)",paddingTop:6,marginTop:4}}>
              <span style={{color:GOLD,fontWeight:700,fontSize:14}}>TOTAL</span>
              <span style={{color:GREEN,fontWeight:800,fontSize:16}}>{fmt$(total)}</span>
            </div>
            <p style={{color:"#4B5563",fontSize:10,marginTop:4}}>⚠️ Bs. referencial — puede variar con la tasa BCV</p>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn variant="ghost" onClick={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={createQuotation} style={{flex:2}} disabled={cart.length===0}>📋 Generar Cotización</Btn>
      </div>
    </Modal>}
  </div>
}
