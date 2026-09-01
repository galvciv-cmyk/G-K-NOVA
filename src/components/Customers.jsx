import { useState } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, uid, fmt$, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, Input, Btn, Modal } from "./ui.jsx"
import { useToast } from "./Toast.jsx"

export default function Customers({state, ops}){
  const toast = useToast()
  const [search,setSearch]=useState("")
  const [selected,setSelected]=useState(null)
  const [showAdd,setShowAdd]=useState(false)
  const [newCust,setNewCust]=useState({name:"",phone:"",id_number:""})

  const saveNewCust=async()=>{
    if(!newCust.name)return
    const c={...newCust,id:uid()}
    await ops.addCustomer(c)
    setNewCust({name:"",phone:"",id_number:""})
    setShowAdd(false)
  }

  const filtered=state.customers.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search)
  )

  const getStats=c=>{
    const sales=(state.sales||[]).filter(s=>s.customerId===c.id)
    const total=sales.reduce((s,sale)=>s+sale.total,0)
    const lastSale=sales.length>0?sales[0]:null
    const pending=sales.reduce((s,sale)=>s+Math.max(0,sale.total-(sale.payments||[]).reduce((a,p)=>a+p.amount,0)),0)
    const prodCount={}
    sales.forEach(sale=>sale.items?.forEach(item=>{prodCount[item.productId]=(prodCount[item.productId]||0)+item.qty}))
    const favProdId=Object.entries(prodCount).sort((a,b)=>b[1]-a[1])[0]?.[0]
    const favProd=state.products.find(p=>p.id===favProdId)
    return {sales,total,lastSale,pending,favProd}
  }

  return <div>
    <div style={{display:"flex",gap:10,marginBottom:12}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por nombre o teléfono..." style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none"}}/>
      <Btn onClick={()=>setShowAdd(true)}>+ Agregar</Btn>
    </div>

    {filtered.length===0
      ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin clientes</p></Card>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=>{
          const {sales,total,pending}=getStats(c)
          return <Card key={c.id} style={{cursor:"pointer"}} onClick={()=>setSelected(c)}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#0A1628",fontWeight:800,fontSize:15,flexShrink:0}}>{c.name[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <p style={{color:GOLD,fontWeight:700,fontSize:14}}>{c.name}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{c.phone||""}{c.id_number?` · ${c.id_number}`:""}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:GREEN,fontWeight:700,fontSize:13}}>{fmt$(total)}</p>
                <p style={{color:"#6B7280",fontSize:11}}>{sales.length} compras</p>
                {pending>0&&<p style={{color:YELLOW,fontSize:10}}>{fmt$(pending)} pend.</p>}
              </div>
            </div>
          </Card>
        })}
      </div>
    }

    {selected&&(()=>{
      const {sales,total,lastSale,pending,favProd}=getStats(selected)
      return <Modal title={selected.name} onClose={()=>setSelected(null)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[["Total Gastado",fmt$(total),GREEN],["Por Cobrar",fmt$(pending),YELLOW],["Compras",sales.length,GOLD],["Última",lastSale?new Date(lastSale.date).toLocaleDateString("es-VE"):"-",GOLD]].map(([l,v,c])=>(
            <Card key={l} style={{padding:12}}><p style={{color:"rgba(232,213,183,0.45)",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{l}</p><p style={{color:c,fontWeight:800,fontSize:16}}>{v}</p></Card>
          ))}
        </div>
        {favProd&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <p style={{color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>⭐ Producto Favorito</p>
          <p style={{color:GOLD,fontSize:14,fontWeight:600}}>{favProd.name}</p>
        </div>}
        <div style={{marginBottom:12}}>
          <p style={{color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Últimas Compras</p>
          {sales.slice(0,5).map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:"#9CA3AF",fontSize:12}}>{new Date(s.date).toLocaleDateString("es-VE")}</span>
            <span style={{color:GREEN,fontWeight:600,fontSize:12}}>{fmt$(s.total)}</span>
          </div>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          {selected.phone&&<Btn variant="ghost" onClick={()=>{sendWhatsApp(selected.phone,`Hola ${selected.name} 👋, te contactamos desde *GK Nova*. ¿En qué podemos ayudarte?`);toast("Abriendo WhatsApp")}} style={{flex:1,fontSize:12}}>💬 WhatsApp</Btn>}
          <Btn variant="danger" onClick={async()=>{await ops.removeCustomer(selected.id);setSelected(null)}} style={{fontSize:12}}>🗑</Btn>
        </div>
      </Modal>
    })()}

    {showAdd&&<Modal title="Nuevo Cliente" onClose={()=>setShowAdd(false)}>
      <Input label="Nombre *" value={newCust.name} onChange={e=>setNewCust(c=>({...c,name:e.target.value}))} placeholder="Nombre completo o razón social"/>
      <Input label="Identificación" value={newCust.id_number} onChange={e=>setNewCust(c=>({...c,id_number:e.target.value}))} placeholder="V-12345678 / J-123456789"/>
      <Input label="Teléfono / WhatsApp" value={newCust.phone} onChange={e=>setNewCust(c=>({...c,phone:e.target.value}))} placeholder="+584241234567"/>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn variant="ghost" onClick={()=>setShowAdd(false)} style={{flex:1}}>Cancelar</Btn>
        <Btn onClick={saveNewCust} style={{flex:2}} disabled={!newCust.name}>Guardar</Btn>
      </div>
    </Modal>}
  </div>
}
