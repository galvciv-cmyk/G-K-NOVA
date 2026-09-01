import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, uid, fmt$ } from "../constants.js"
import { Card, SLabel, Input, Select, Btn, Modal } from "./ui.jsx"
import { generatePurchaseReceipt } from "../pdf/index.js"
import { useToast } from "./Toast.jsx"

export default function Purchases({state, ops}){
  const toast = useToast()
  const [showNew,setShowNew]=useState(false)
  const [items,setItems]=useState([{productId:"",qty:1,cost:0}])
  const [supplier,setSupplier]=useState("")
  const [notes,setNotes]=useState("")

  const addItem=()=>setItems(i=>[...i,{productId:"",qty:1,cost:0}])
  const updateItem=(idx,k,v)=>setItems(i=>i.map((item,ii)=>ii===idx?{...item,[k]:v}:item))
  const removeItem=idx=>setItems(i=>i.filter((_,ii)=>ii!==idx))
  const total=items.reduce((s,i)=>s+Number(i.qty||0)*Number(i.cost||0),0)

  const completePurchase=async()=>{
    const validItems=items.filter(i=>i.productId&&Number(i.qty)>0)
    if(validItems.length===0)return
    const purchase={id:uid(),date:new Date().toISOString(),items:validItems,supplier,notes,total,receiptNumber:state.config.purchaseCounter||1}
    const stockUpdates=validItems.map(item=>{
      const p=state.products.find(pr=>pr.id===item.productId)
      return {id:item.productId, stock:(p?.stock||0)+Number(item.qty), cost:Number(item.cost)||p?.cost||0}
    })
    // Update cost in product too
    const updatedProducts=stockUpdates.map(u=>{
      const p=state.products.find(pr=>pr.id===u.id)
      return {...p, stock:u.stock, cost:u.cost}
    })
    const movement={id:uid(),type:"purchase",date:purchase.date,purchaseId:purchase.id,description:`Compra a ${supplier||"Proveedor"}`,total,status:"completed"}

    await ops.addPurchase(purchase,stockUpdates,movement).then(async finalPurchase=>{
      // Also update cost for each product
      for(const p of updatedProducts){ await ops.updateProduct(p) }
      const doc=generatePurchaseReceipt({purchase:finalPurchase,products:state.products,config:state.config})
      doc.save(`orden-compra-${String(finalPurchase.receiptNumber).padStart(6,"0")}.pdf`)
      toast(`Orden de compra #${finalPurchase.receiptNumber} descargada`)
    })
    setItems([{productId:"",qty:1,cost:0}]);setSupplier("");setNotes("");setShowNew(false)
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <SLabel>📥 Compras</SLabel>
      <Btn onClick={()=>setShowNew(true)}>+ Nueva Compra</Btn>
    </div>
    {state.purchases.length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin compras registradas</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {state.purchases.map(p=><Card key={p.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{color:GOLD,fontWeight:600,fontSize:13}}>{p.supplier||"Proveedor"} · {p.items?.length} prods</p>
              <p style={{color:"#6B7280",fontSize:11}}>{new Date(p.date).toLocaleString("es-VE")}</p>
              {p.notes&&<p style={{color:"#6B7280",fontSize:11}}>{p.notes}</p>}
            </div>
            <p style={{color:YELLOW,fontWeight:700,fontSize:15,textAlign:"right"}}>{fmt$(p.total)}</p>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <Btn variant="ghost" onClick={()=>{const doc=generatePurchaseReceipt({purchase:p,products:state.products,config:state.config});doc.save(`orden-compra-${String(p.receiptNumber).padStart(6,"0")}.pdf`);toast("Orden descargada")}} style={{flex:1,fontSize:12}}>🖨 Orden</Btn>
            <Btn variant="danger" onClick={async()=>{if(!window.confirm("¿Eliminar esta compra? El stock se descontará."))return;const restores=p.items?.map(item=>{const pr=state.products.find(pr=>pr.id===item.productId);return{id:item.productId,stock:Math.max(0,(pr?.stock||0)-Number(item.qty))}})||[];await ops.removePurchase(p.id,restores);toast("Compra eliminada","info")}} style={{fontSize:12}}>🗑 Borrar</Btn>
          </div>
        </Card>)}
      </div>
    }

    {showNew&&<Modal title="Nueva Compra" onClose={()=>setShowNew(false)} wide>
      <Input label="Proveedor" value={supplier} onChange={e=>setSupplier(e.target.value)}/>
      <Input label="Notas" value={notes} onChange={e=>setNotes(e.target.value)}/>
      <SLabel>Productos</SLabel>
      {items.map((item,idx)=><div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:8,alignItems:"end"}}>
        <Select value={item.productId} onChange={e=>updateItem(idx,"productId",e.target.value)}>
          <option value="">Seleccionar...</option>
          {state.products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code}) — Stock: {p.stock}</option>)}
        </Select>
        <Input placeholder="Cant." type="number" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)}/>
        <Input placeholder="Costo €" type="number" value={item.cost} onChange={e=>updateItem(idx,"cost",e.target.value)}/>
        <button onClick={()=>removeItem(idx)} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:8,color:"#F87171",cursor:"pointer",padding:"8px",marginBottom:12}}>✕</button>
      </div>)}
      <Btn variant="ghost" onClick={addItem} style={{width:"100%",marginBottom:10}}>+ Producto</Btn>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <span style={{color:GOLD,fontWeight:700}}>Total: <span style={{color:YELLOW}}>{fmt$(total)}</span></span>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="ghost" onClick={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={completePurchase} style={{flex:2}} disabled={items.every(i=>!i.productId)}>✅ Registrar Compra</Btn>
      </div>
    </Modal>}
  </div>
}
