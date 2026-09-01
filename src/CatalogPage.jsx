import { useState, useEffect } from "react"
import { loadAllData } from "./supabase.js"

const NAVY="#0A1628", GOLD="#E8D5B7", GOLD2="#C9A96E", GREEN="#22C55E"
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const CATEGORIES=["Publicidad","Diseño","Sublimación","Papelería","Gigantografía","Uniformes","Franelas","Chemises","Otros"]

export default function CatalogPage(){
  const [state,setState]=useState(null)
  const [loading,setLoading]=useState(true)
  const [activeCategory,setActiveCategory]=useState("Todos")
  const [search,setSearch]=useState("")

  useEffect(()=>{
    loadAllData().then(d=>{setState(d);setLoading(false)})
  },[])

  if(loading) return(
    <div style={{minHeight:"100vh",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <img src="/logo.png" alt="GK Nova" style={{height:40,marginBottom:20,opacity:0.7}}/>
        <div style={{width:36,height:36,border:"3px solid rgba(232,213,183,0.15)",borderTopColor:GOLD,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if(!state) return(
    <div style={{minHeight:"100vh",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <p style={{color:GOLD,fontFamily:"sans-serif"}}>Catálogo no disponible</p>
    </div>
  )

  const visibleProds=(state.products||[]).filter(p=>p.showInCatalog!==false&&p.name)
  const categories=["Todos",...new Set(visibleProds.map(p=>p.category).filter(Boolean))]

  const filtered=visibleProds.filter(p=>{
    const matchCat=activeCategory==="Todos"||p.category===activeCategory
    const matchSearch=!search||p.name.toLowerCase().includes(search.toLowerCase())||p.code.toLowerCase().includes(search.toLowerCase())
    return matchCat&&matchSearch
  })

  const config=state.config||{}
  const whatsapp=config.whatsappNumber||config.phone||""

  return(
    <div style={{minHeight:"100vh",background:NAVY,fontFamily:"'DM Sans',system-ui,sans-serif",color:GOLD}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{background:"rgba(10,22,40,0.97)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(232,213,183,0.08)",padding:"14px 20px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo.png" alt="GK Nova" style={{height:32}}/>
            <div>
              <p style={{fontSize:11,color:GOLD2,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Catálogo Digital</p>
              <p style={{fontSize:13,color:"rgba(232,213,183,0.5)"}}>{config.name||"GK Nova"}</p>
            </div>
          </div>
          {whatsapp&&<a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`} target="_blank" style={{background:"linear-gradient(135deg,#25D366,#128C7E)",color:"white",padding:"8px 16px",borderRadius:10,fontWeight:700,fontSize:13,textDecoration:"none"}}>📱 Contactar por WhatsApp</a>}
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px 60px"}}>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar producto..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:12,padding:"12px 16px",color:GOLD,fontSize:14,outline:"none",marginBottom:16}}/>

        {/* Category filter */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setActiveCategory(cat)} style={{padding:"7px 16px",borderRadius:999,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",background:activeCategory===cat?`linear-gradient(135deg,${GOLD},${GOLD2})`:"rgba(255,255,255,0.07)",color:activeCategory===cat?NAVY:GOLD}}>
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {filtered.length===0?
          <div style={{textAlign:"center",padding:"60px 0",color:"#4B5563"}}>Sin productos en esta categoría</div>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
            {filtered.map(p=>(
              <div key={p.id} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,overflow:"hidden",transition:"transform .2s",cursor:"default"}}>
                {/* Image */}
                <div style={{height:160,background:"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {p.image
                    ?<img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<span style={{fontSize:40,opacity:0.3}}>🏷️</span>
                  }
                </div>
                {/* Info */}
                <div style={{padding:"12px 14px"}}>
                  <p style={{color:GOLD,fontWeight:700,fontSize:14,marginBottom:4,lineHeight:1.3}}>{p.name}</p>
                  <p style={{color:"#6B7280",fontSize:11,marginBottom:8}}>{p.code} · {p.unit||"Unid"}</p>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <p style={{color:GREEN,fontWeight:800,fontSize:18}}>{fmt$(p.price)}</p>
                    <span style={{background:"rgba(201,169,110,0.15)",color:GOLD2,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{p.category}</span>
                  </div>
                  {whatsapp&&<a href={`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola! Me interesa: ${p.name} (${p.code}) a ${fmt$(p.price)}`)}` } target="_blank" style={{display:"block",marginTop:10,background:"rgba(37,211,102,0.15)",color:"#25D366",border:"1px solid rgba(37,211,102,0.3)",borderRadius:8,padding:"7px",textAlign:"center",fontSize:12,fontWeight:700,textDecoration:"none"}}>💬 Consultar</a>}
                </div>
              </div>
            ))}
          </div>
        }

        {/* Footer */}
        <div style={{marginTop:40,textAlign:"center",borderTop:"1px solid rgba(232,213,183,0.08)",paddingTop:20}}>
          <p style={{color:"rgba(232,213,183,0.3)",fontSize:12}}>{config.name} · {config.address}</p>
          <p style={{color:"rgba(232,213,183,0.2)",fontSize:11,marginTop:4}}>{config.phone} · {config.schedule}</p>
        </div>
      </div>
    </div>
  )
}
