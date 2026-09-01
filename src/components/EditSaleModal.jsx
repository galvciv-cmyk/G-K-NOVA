import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, CATEGORIES, CAT_PREFIX, DEFAULT_STATE, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"

function EditSaleModal({sale,onSave,onClose}){
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
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="ej: Cliente pidió cambio de talla, entrega el viernes..." rows={3} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:13,outline:"none",boxSizing:"border-box",resize:"none"}}/>
    </div>
    <div style={{display:"flex",gap:10}}>
      <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Cancelar</Btn>
      <Btn onClick={()=>onSave(note,delivery)} style={{flex:2}}>💾 Guardar Cambios</Btn>
    </div>
  </Modal>
}
export default EditSaleModal
