import { useState, useEffect, useCallback, useRef } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, PAYMENT_METHODS, CATEGORIES, CAT_PREFIX, DEFAULT_STATE, uid, fmt$, fmtBs, today, sendWhatsApp } from "../constants.js"
import { Card, SLabel, Badge, StatusBadge, Input, Select, Btn, Modal } from "./ui.jsx"
import * as XLSX from "xlsx"
import { supabase } from "../supabase.js"
import { useToast } from "./Toast.jsx"

function Config({state, ops}){
  const toast = useToast()
  const [cfg,setCfg]=useState(state.config)
  const [newUserEmail,setNewUserEmail]=useState("")
  const [newUserPassword,setNewUserPassword]=useState("")
  const [userMsg,setUserMsg]=useState(null)
  const [loadingUser,setLoadingUser]=useState(false)

  const saveConfig=()=>{ops.updateConfig(cfg);toast("Configuración guardada")}

  const createUser=async()=>{
    if(!newUserEmail||!newUserPassword)return
    setLoadingUser(true); setUserMsg(null)
    try{
      const {data,error}=await supabase.auth.admin?.createUser({email:newUserEmail,password:newUserPassword,email_confirm:true})
      if(error)throw error
      setUserMsg({type:"success",text:`✅ Usuario ${newUserEmail} creado correctamente`})
      setNewUserEmail(""); setNewUserPassword("")
    }catch(e){
      // Try signup instead (admin API may not be available on anon key)
      try{
        const {error:e2}=await supabase.auth.signUp({email:newUserEmail,password:newUserPassword})
        if(e2)throw e2
        setUserMsg({type:"success",text:`✅ Invitación enviada a ${newUserEmail} — debe confirmar su correo`})
        setNewUserEmail(""); setNewUserPassword("")
      }catch(e3){
        setUserMsg({type:"error",text:`🚫 Error: ${e3.message}`})
      }
    }
    setLoadingUser(false)
  }

  const exportBackup=()=>{
    const wb=XLSX.utils.book_new()
    // Products
    const prodData=[["Código","Nombre","Categoría","Precio","Costo","Stock","Stock Mínimo","Unidad"],...(state.products||[]).map(p=>[p.code,p.name,p.category,p.price,p.cost,p.stock,p.minStock,p.unit])]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(prodData),"Productos")
    // Sales
    const salesData=[["Fecha","Cliente","Total","Estado","Método"],...(state.sales||[]).map(s=>[new Date(s.date).toLocaleDateString("es-VE"),s.customerName,s.total,s.paymentStatus,s.payments?.[0]?.method||"-"])]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(salesData),"Ventas")
    // Purchases
    const purchData=[["Fecha","Proveedor","Total","Notas"],...(state.purchases||[]).map(p=>[new Date(p.date).toLocaleDateString("es-VE"),p.supplier,p.total,p.notes||""])]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(purchData),"Compras")
    // Customers
    const custData=[["Nombre","Teléfono","Email","Identificación"],...(state.customers||[]).map(c=>[c.name,c.phone||"",c.email||"",c.id_number||""])]
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(custData),"Clientes")
    XLSX.writeFile(wb,`backup-gknova-${today()}.xlsx`)
    toast("Backup Excel descargado")
  }

  // Full JSON backup — this one can be restored exactly (preserves IDs and relationships)
  const exportFullBackup=()=>{
    const backup={
      version:1,
      exportedAt:new Date().toISOString(),
      config:state.config,
      products:state.products,
      customers:state.customers,
      sales:state.sales,
      purchases:state.purchases,
      quotes:state.quotes,
      movements:state.movements,
      cashLog:state.cashLog,
    }
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"})
    const url=URL.createObjectURL(blob)
    const a=document.createElement("a")
    a.href=url
    a.download=`backup-completo-gknova-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast("Backup completo descargado")
  }

  const [restoreFile,setRestoreFile]=useState(null)
  const [restoreMsg,setRestoreMsg]=useState(null)
  const [restoring,setRestoring]=useState(false)

  const handleRestoreFile=e=>{
    const file=e.target.files[0]
    if(!file)return
    setRestoreFile(file)
    setRestoreMsg(null)
  }

  const runRestore=async()=>{
    if(!restoreFile)return
    if(!window.confirm("⚠️ Esto reemplazará TODOS los datos actuales con los del backup. ¿Continuar?"))return
    setRestoring(true)
    setRestoreMsg(null)
    try{
      const text=await restoreFile.text()
      const backup=JSON.parse(text)
      if(!backup.products||!backup.config){
        throw new Error("Archivo de backup inválido")
      }
      await ops.restoreFromBackup(backup)
      setRestoreMsg({type:"success",text:"✅ Backup restaurado correctamente. Recarga la página."})
    }catch(e){
      setRestoreMsg({type:"error",text:`🚫 Error: ${e.message}`})
    }finally{
      setRestoring(false)
    }
  }

  // Check low stock products
  const lowStockProds=(state.products||[]).filter(p=>p.stock<=p.minStock)

  const sendLowStockAlert=()=>{
    const phone=cfg.whatsappNumber
    if(!phone){alert("Configura tu número de WhatsApp primero");return}
    const msg=`⚠️ *GK Nova — Alerta de Stock Bajo*\n\n${lowStockProds.map(p=>`• ${p.name} (${p.code}): *${p.stock} ${p.unit}* — mínimo: ${p.minStock}`).join("\n")}\n\n_Revisado: ${new Date().toLocaleString("es-VE")}_`
    sendWhatsApp(phone,msg)
  }

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Rate */}
    <Card style={{border:"1px solid rgba(232,213,183,0.2)"}}>
      <SLabel>💱 Tasa de Referencia (EUR BCV)</SLabel>
      <p style={{color:"rgba(232,213,183,0.4)",fontSize:11,marginBottom:8}}>Esta tasa se usa para convertir € a Bs en los recibos</p>
      <input type="number" value={cfg.exchangeRate} onChange={e=>setCfg(c=>({...c,exchangeRate:Number(e.target.value)}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.3)",borderRadius:9,padding:"12px 14px",color:GOLD,fontSize:26,fontWeight:800,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
      <Btn variant="ghost" onClick={async()=>{
        toast("Consultando BCV...","info")
        const apis=['https://ve.dolarapi.com/v1/euros/oficial','https://pydolarve.org/api/v2/dollar?page=bcv&monitor=eur']
        for(const url of apis){
          try{
            const d=await fetch(url).then(r=>r.json())
            const rate=d.price||d.promedio||d.venta||d.compra
            if(rate&&rate>0){setCfg(c=>({...c,exchangeRate:Math.round(rate)}));toast("Tasa actualizada desde BCV");return}
          }catch(e){continue}
        }
        toast("No se pudo obtener la tasa — ingrésala manualmente","error")
      }} style={{width:"100%",fontSize:12}}>Obtener Tasa BCV Automaticamente</Btn>
    </Card>

    {/* Company */}
    <Card>
      <SLabel>🏢 Empresa</SLabel>
      {[["Nombre","name"],["Dirección","address"],["CUIT / RIF","cuit"],["Teléfono","phone"],["Horario","schedule"]].map(([l,k])=>(
        <Input key={k} label={l} value={cfg[k]||""} onChange={e=>setCfg(c=>({...c,[k]:e.target.value}))}/>
      ))}
      <Input label="WhatsApp empresa" placeholder="+584241234567" value={cfg.whatsappNumber||""} onChange={e=>setCfg(c=>({...c,whatsappNumber:e.target.value}))}/>
    </Card>
    <Btn onClick={saveConfig} style={{width:"100%"}}>💾 Guardar Configuración</Btn>

    {/* Stock alert */}
    {lowStockProds.length>0&&<Card style={{border:"1px solid rgba(251,191,36,0.3)"}}>
      <SLabel color={YELLOW}>⚠️ Stock Bajo — {lowStockProds.length} productos</SLabel>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {lowStockProds.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{color:GOLD,fontSize:13}}>{p.name}</span>
          <Badge color={RED}>{p.stock} {p.unit}</Badge>
        </div>)}
      </div>
      <Btn variant="yellow" onClick={sendLowStockAlert} style={{width:"100%"}}>📱 Enviar Alerta por WhatsApp</Btn>
    </Card>}

    {/* Backup */}
    <Card>
      <SLabel>💾 Backup de Datos</SLabel>
      <p style={{color:"rgba(232,213,183,0.4)",fontSize:12,marginBottom:12}}>Exporta a Excel para revisar, o usa el backup completo (JSON) para poder restaurar todo si algo sale mal.</p>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <Btn variant="ghost" onClick={exportBackup} style={{flex:1,fontSize:12}}>📊 Excel (lectura)</Btn>
        <Btn onClick={exportFullBackup} style={{flex:1,fontSize:12}}>💾 Backup Completo</Btn>
      </div>
      <div style={{borderTop:"1px solid rgba(232,213,183,0.08)",paddingTop:14}}>
        <p style={{color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>⚠️ Restaurar Backup</p>
        <input type="file" accept="application/json" onChange={handleRestoreFile} style={{color:GOLD,fontSize:12,marginBottom:10}}/>
        {restoreMsg&&<div style={{background:restoreMsg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${restoreMsg.type==="success"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,borderRadius:9,padding:"9px 13px",marginBottom:10}}>
          <p style={{color:restoreMsg.type==="success"?GREEN:RED,fontSize:12,fontWeight:600}}>{restoreMsg.text}</p>
        </div>}
        <Btn variant="danger" onClick={runRestore} disabled={!restoreFile||restoring} style={{width:"100%"}}>{restoring?"Restaurando...":"⚠️ Restaurar (reemplaza todo)"}</Btn>
      </div>
    </Card>

    {/* Users */}
    <Card>
      <SLabel>👤 Gestión de Usuarios</SLabel>
      <p style={{color:"rgba(232,213,183,0.4)",fontSize:12,marginBottom:12}}>Agrega acceso a otras personas de tu equipo.</p>
      <Input label="Email del nuevo usuario" type="email" placeholder="kami@email.com" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)}/>
      <Input label="Contraseña temporal" type="password" placeholder="mínimo 6 caracteres" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)}/>
      {userMsg&&<div style={{background:userMsg.type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${userMsg.type==="success"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,borderRadius:9,padding:"9px 13px",marginBottom:12}}>
        <p style={{color:userMsg.type==="success"?GREEN:RED,fontSize:12,fontWeight:600}}>{userMsg.text}</p>
      </div>}
      <Btn onClick={createUser} disabled={!newUserEmail||!newUserPassword||loadingUser} style={{width:"100%"}}>{loadingUser?"Creando...":"➕ Crear Usuario"}</Btn>
      <p style={{color:"rgba(232,213,183,0.25)",fontSize:11,marginTop:8,textAlign:"center"}}>También puedes gestionar usuarios en supabase.com → Authentication → Users</p>
    </Card>
  </div>
}
export default Config
