import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, Input, Select, Btn, Modal } from "./ui.jsx"
import { generateQuote } from "../pdf/quotePdf.js"
import { useToast } from "./Toast.jsx"

export default function Quotes({state, ops}){
  const toast = useToast()
  const [showNew,setShowNew]=useState(false)
  const [detail,setDetail]=useState(null)
  const [editQuote,setEditQuote]=useState(null)
  const [editNote,setEditNote]=useState("")
  const [cart,setCart]=useState([])
  const [customerName,setCustomerName]=useState("")
  const [customerPhone,setCustomerPhone]=useState("")
  const [customerSearch,setCustomerSearch]=useState("")
  const [selCustomer,setSelCustomer]=useState(null)
  const [discount,setDiscount]=useState(0)
  const [productSearch,setProductSearch]=useState("")
  const [quoteNote,setQuoteNote]=useState("")

  const subtotal=cart.reduce((s,i)=>s+i.qty*i.price,0)
  const total=subtotal-Number(discount||0)
  const filteredProds=state.products.filter(p=>!productSearch||p.name.toLowerCase().includes(productSearch.toLowerCase())||p.code?.toLowerCase().includes(productSearch.toLowerCase()))
  const filteredCusts=state.customers.filter(c=>c.name.toLowerCase().includes(customerSearch.toLowerCase()))

  const addToCart=p=>{
    setCart(c=>{const ex=c.find(i=>i.productId===p.id);if(ex)return c.map(i=>i.productId===p.id?{...i,qty:i.qty+1}:i);return[...c,{productId:p.id,qty:1,price:p.price,name:p.name}]})
    setProductSearch("")
  }
  const updateQty=(pid,qty)=>{
    if(qty<=0){setCart(c=>c.filter(i=>i.productId!==pid));return}
    setCart(c=>c.map(i=>i.productId===pid?{...i,qty}:i))
  }

  const createQuote=async()=>{
    if(cart.length===0)return
    const q={
      id:uid(),date:new Date().toISOString(),
      items:cart,customerName:selCustomer?.name||customerName||"Cliente",
      customerPhone:selCustomer?.phone||customerPhone||"",
      customerId:selCustomer?.id||null,
      discount:Number(discount||0),subtotal,total,
      status:"pending",note:quoteNote,
      quoteNumber:state.config.quoteCounter||1,
      exchangeRate:state.config.exchangeRate||655
    }
    const finalQuote = await ops.addQuote(q)
    const doc=generateQuote({quote:finalQuote,products:state.products,customer:selCustomer,config:state.config,exchangeRate:state.config.exchangeRate||655})
    doc.save(`cotizacion-${String(finalQuote.quoteNumber).padStart(6,"0")}.pdf`)
    toast(`Cotización COT-${String(finalQuote.quoteNumber).padStart(6,"0")} generada`)
    const phone=selCustomer?.phone||customerPhone
    if(phone){const msg=`Hola ${finalQuote.customerName} 👋\n\nTe enviamos tu *Cotización* de *GK Nova*.\n\n📋 *${cart.length} producto(s)*\n💰 *Total: ${fmt$(total)}*\n⚠️ El total en Bs. puede variar según la tasa BCV.\n📅 Válida por 3 días.\n\n¡Quedamos atentos! 🙏`;setTimeout(()=>{sendWhatsApp(phone,msg);toast("Enviado por WhatsApp")},1500)}
    setCart([]);setCustomerName("");setCustomerPhone("");setSelCustomer(null);setDiscount(0);setQuoteNote("");setShowNew(false)
  }

  const approveQuote=async q=>{
    const sale={
      id:uid(),date:new Date().toISOString(),
      items:q.items,customerName:q.customerName,customerPhone:q.customerPhone,customerId:q.customerId,
      payments:[],discount:q.discount,subtotal:q.subtotal,total:q.total,
      paymentStatus:"pending",deliveryStatus:"production",
      receiptNumber:state.config.receiptCounter||1,
      exchangeRate:state.config.exchangeRate||655,
      note:`Desde cotización COT-${String(q.quoteNumber).padStart(6,"0")}`,
      quoteRef:`COT-${String(q.quoteNumber).padStart(6,"0")}`
    }
    const stockUpdates=q.items.map(item=>{
      const p=state.products.find(pr=>pr.id===item.productId)
      return {id:item.productId,stock:Math.max(0,(p?.stock||0)-item.qty)}
    })
    const movement={id:uid(),type:"sale",date:sale.date,saleId:sale.id,description:`Venta a ${sale.customerName} (desde cotización)`,total:sale.total,status:"pending"}
    await ops.convertQuoteToSale(q,sale,stockUpdates,movement)
    toast("Cotización convertida en venta")
    setDetail(null)
  }

  const statusColor={pending:YELLOW,approved:GREEN,converted:"#93C5FD",expired:RED}
  const statusLabel={pending:"⏳ Pendiente",approved:"✅ Aprobada",converted:"🔄 Convertida",expired:"❌ Vencida"}

  const getStatus=q=>{
    if(q.status==="converted")return "converted"
    const expiry=new Date(new Date(q.date).getTime()+3*24*60*60*1000)
    if(new Date()>expiry)return "expired"
    return q.status||"pending"
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <SLabel>📋 Cotizaciones</SLabel>
      <Btn onClick={()=>setShowNew(true)}>+ Nueva Cotización</Btn>
    </div>

    {(state.quotes||[]).length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin cotizaciones aún</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(state.quotes||[]).map(q=>{
          const status=getStatus(q)
          return <Card key={q.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setDetail(q)}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{color:GOLD,fontWeight:700,fontSize:14}}>{q.customerName}</span>
                  <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
                </div>
                <p style={{color:"#6B7280",fontSize:11}}>COT-{String(q.quoteNumber).padStart(6,"0")} · {new Date(q.date).toLocaleDateString("es-VE")} · {fmt$(q.total)}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn variant="ghost" onClick={()=>setDetail(q)} style={{flex:1,fontSize:12}}>🖨 Ver</Btn>
              <Btn variant="ghost" onClick={()=>{setEditQuote(q);setEditNote(q.note||"")}} style={{fontSize:12}}>✏️ Editar</Btn>
              {(status==="pending"||status==="expired")&&<Btn variant="green" onClick={()=>approveQuote(q)} style={{flex:2,fontSize:12}}>✅ Confirmar → Venta</Btn>}
              {status==="converted"&&<span style={{color:"#93C5FD",fontSize:12,padding:"10px 0",flex:1,textAlign:"center"}}>🔄 Ya convertida</span>}
              <Btn variant="danger" onClick={async()=>{if(window.confirm("¿Eliminar?")){await ops.removeQuote(q.id);toast("Cotización eliminada","info")}}} style={{fontSize:12}}>🗑</Btn>
            </div>
          </Card>
        })}
      </div>
    }

    {detail&&(()=>{
      const status=getStatus(detail)
      const validUntil=new Date(new Date(detail.date).getTime()+3*24*60*60*1000).toLocaleDateString("es-VE")
      return <Modal title={`COT-${String(detail.quoteNumber).padStart(6,"0")}`} onClose={()=>setDetail(null)} wide>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
          <Badge color="#9CA3AF">Válida hasta: {validUntil}</Badge>
        </div>
        {detail.items?.map((item,i)=>{
          const p=state.products.find(pr=>pr.id===item.productId)||{}
          return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:GOLD,fontSize:13}}>{p.name||item.name} × {item.qty}</span>
            <span style={{color:GREEN,fontSize:13,fontWeight:600}}>{fmt$(item.qty*item.price)}</span>
          </div>
        })}
        <div style={{marginTop:10,padding:"10px 0",borderTop:"1px solid rgba(232,213,183,0.1)"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:GOLD,fontWeight:700}}>TOTAL</span>
            <span style={{color:GREEN,fontWeight:800,fontSize:16}}>{fmt$(detail.total)}</span>
          </div>
          <p style={{color:"#6B7280",fontSize:11,marginTop:2}}>{fmtBs(detail.total,state.config?.exchangeRate)} (referencial)</p>
        </div>
        {detail.note&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",marginTop:10}}>
          <p style={{color:GOLD,fontSize:13}}>{detail.note}</p>
        </div>}
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
          <Btn variant="ghost" onClick={()=>{const doc=generateQuote({quote:detail,products:state.products,customer:state.customers?.find(c=>c.id===detail.customerId),config:state.config,exchangeRate:detail.exchangeRate||state.config?.exchangeRate});doc.save(`cotizacion-${String(detail.quoteNumber).padStart(6,"0")}.pdf`)}} style={{fontSize:12}}>🖨 PDF</Btn>
          {detail.customerPhone&&<Btn variant="ghost" onClick={()=>sendWhatsApp(detail.customerPhone,`Hola ${detail.customerName}, adjunto tu cotización por ${fmt$(detail.total)}. ¡Válida 3 días! 🙏`)} style={{fontSize:12}}>💬 WhatsApp</Btn>}
          {(status==="pending"||status==="expired")&&<Btn variant="green" onClick={()=>approveQuote(detail)} style={{fontSize:12}}>✅ Aprobar → Venta</Btn>}
          <Btn variant="danger" onClick={async()=>{if(window.confirm("¿Eliminar?")){await ops.removeQuote(detail.id);setDetail(null);toast("Cotización eliminada","info")}}} style={{fontSize:12}}>🗑</Btn>
        </div>
      </Modal>
    })()}

    {showNew&&<Modal title="Nueva Cotización" onClose={()=>setShowNew(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <SLabel>Productos</SLabel>
          <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Buscar..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
          <div style={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {filteredProds.length===0?<p style={{color:"#6B7280",padding:"10px 13px",fontSize:12}}>Sin productos</p>:filteredProds.map(p=><div key={p.id} onClick={()=>addToCart(p)} style={{padding:"7px 13px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between"}}><span style={{color:GOLD,fontSize:12}}>{p.name}</span><span style={{color:GREEN,fontSize:12,fontWeight:600}}>{fmt$(p.price)}</span></div>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {cart.length===0?<p style={{color:"#4B5563",fontSize:12,textAlign:"center",padding:"10px 0"}}>Agrega productos 👆</p>:cart.map(item=>{const p=state.products.find(pr=>pr.id===item.productId)
              return <div key={item.productId} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}}>
                <span style={{flex:1,color:GOLD,fontSize:12}}>{p?.name}</span>
                <button onClick={()=>updateQty(item.productId,item.qty-1)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:GOLD,borderRadius:5,width:20,height:20,cursor:"pointer"}}>−</button>
                <span style={{color:GOLD,fontSize:12,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.productId,item.qty+1)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:GOLD,borderRadius:5,width:20,height:20,cursor:"pointer"}}>+</button>
                <span style={{color:GREEN,fontSize:12,fontWeight:600,minWidth:50,textAlign:"right"}}>{fmt$(item.qty*item.price)}</span>
              </div>
            })}
          </div>
        </div>
        <div>
          <SLabel>Cliente</SLabel>
          <input value={customerSearch} onChange={e=>{setCustomerSearch(e.target.value);setCustomerName(e.target.value)}} placeholder="Buscar o escribir nombre..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:4}}/>
          {customerSearch&&filteredCusts.length>0&&<div style={{background:"#0D1E35",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,marginBottom:6,maxHeight:100,overflowY:"auto"}}>
            {filteredCusts.map(c=><div key={c.id} onClick={()=>{setSelCustomer(c);setCustomerName(c.name);setCustomerPhone(c.phone||"");setCustomerSearch(c.name)}} style={{padding:"6px 13px",cursor:"pointer",color:GOLD,fontSize:13,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{c.name}</div>)}
          </div>}
          <Input label="Teléfono" placeholder="+584241234567" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
          <Input label="Descuento €" type="number" value={discount} onChange={e=>setDiscount(e.target.value)}/>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid rgba(232,213,183,0.1)",paddingTop:6}}>
              <span style={{color:GOLD,fontWeight:700}}>TOTAL</span><span style={{color:GREEN,fontWeight:800,fontSize:16}}>{fmt$(total)}</span>
            </div>
            <p style={{color:"#6B7280",fontSize:11,marginTop:2}}>{fmtBs(total,state.config?.exchangeRate)} (referencial)</p>
          </div>
          <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>📝 Nota</label>
          <textarea value={quoteNote} onChange={e=>setQuoteNote(e.target.value)} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn variant="ghost" onClick={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={createQuote} style={{flex:2}} disabled={cart.length===0}>📋 Generar y WhatsApp</Btn>
      </div>
    </Modal>}

    {editQuote&&<Modal title={`Editar COT-${String(editQuote.quoteNumber).padStart(6,"0")}`} onClose={()=>setEditQuote(null)}>
      <p style={{color:"rgba(232,213,183,0.5)",fontSize:12,marginBottom:14}}>Puedes editar la nota interna de la cotización.</p>
      <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>📝 Nota</label>
      <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} rows={4} placeholder="ej: Incluye instalación, tiempo de entrega 5 días..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none",marginBottom:14}}/>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="ghost" onClick={()=>setEditQuote(null)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={async()=>{await ops.updateQuote({...editQuote,note:editNote});toast("Cotización actualizada");setEditQuote(null)}} style={{flex:2}}>💾 Guardar</Btn>
      </div>
    </Modal>}
  </div>
}
