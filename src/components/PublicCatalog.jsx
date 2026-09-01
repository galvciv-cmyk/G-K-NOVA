import { useState, useEffect } from "react"
import { loadAllData } from "../supabase.js"

const NAVY="#0A1628", GOLD="#E8D5B7", GOLD2="#C9A96E", GREEN="#22C55E"
const fmt$ = n=>`€${Number(n||0).toFixed(2)}`
const CATEGORIES=["Publicidad","Diseño","Sublimación","Papelería","Gigantografía","Uniformes","Franelas","Chemises","Otros"]

export default function PublicCatalog() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [search, setSearch] = useState("")

  useEffect(()=>{
    loadAllData().then(d=>{ setState(d); setLoading(false) })
  },[])

  if(loading) return(
    <div style={{minHeight:"100vh",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:"3px solid rgba(232,213,183,0.15)",borderTopColor:GOLD,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
        <p style={{color:"rgba(232,213,183,0.4)",fontSize:13}}>Cargando catálogo...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  const products = (state?.products||[]).filter(p=>p.showInCatalog!==false&&p.name)
  const categories = ["Todos", ...new Set(products.map(p=>p.category).filter(Boolean))]
  const filtered = products.filter(p=>{
    const matchCat = activeCategory==="Todos"||p.category===activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())||p.code.toLowerCase().includes(search.toLowerCase())
    return matchCat&&matchSearch
  })
  const config = state?.config||{}

  return(
    <div style={{minHeight:"100vh",background:NAVY,fontFamily:"'DM Sans',system-ui,sans-serif",color:GOLD}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap')`}</style>

      {/* Header */}
      <div style={{background:"rgba(10,22,40,0.97)",borderBottom:"1px solid rgba(232,213,183,0.1)",padding:"16px 20px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo.png" alt="GK Nova" style={{height:36}}/>
            <div>
              <h1 style={{fontSize:18,fontWeight:800,color:GOLD}}>Catálogo</h1>
              <p style={{color:"rgba(232,213,183,0.4)",fontSize:11}}>{products.length} productos disponibles</p>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar producto..." style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:20,padding:"8px 16px",color:GOLD,fontSize:13,outline:"none",minWidth:200}}/>
        </div>
      </div>

      {/* Company info */}
      <div style={{background:"linear-gradient(135deg,rgba(20,38,65,0.8),rgba(10,22,40,0.8))",borderBottom:"1px solid rgba(232,213,183,0.08)",padding:"12px 20px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",gap:24,flexWrap:"wrap"}}>
          {[config.phone&&`📞 ${config.phone}`,config.schedule&&`⏰ ${config.schedule}`,config.address&&`📍 ${config.address}`].filter(Boolean).map((item,i)=>(
            <p key={i} style={{color:"rgba(232,213,183,0.5)",fontSize:12}}>{item}</p>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{padding:"16px 20px",overflowX:"auto"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",gap:8,minWidth:"max-content"}}>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setActiveCategory(cat)} style={{padding:"7px 16px",borderRadius:20,border:"none",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",background:activeCategory===cat?`linear-gradient(135deg,${GOLD},${GOLD2})`:"rgba(255,255,255,0.07)",color:activeCategory===cat?NAVY:GOLD}}>
              {cat} {cat!=="Todos"&&`(${products.filter(p=>p.category===cat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"0 20px 60px"}}>
        {filtered.length===0
          ?<div style={{textAlign:"center",padding:"60px 0",color:"rgba(232,213,183,0.3)"}}>
            <p style={{fontSize:40,marginBottom:12}}>📦</p>
            <p style={{fontSize:16}}>Sin productos en esta categoría</p>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
            {filtered.map(p=>(
              <div key={p.id} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,overflow:"hidden",transition:"transform .2s",cursor:"default"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                {/* Image */}
                <div style={{height:160,background:"rgba(20,38,65,0.8)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {p.image
                    ?<img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<span style={{fontSize:48,opacity:0.3}}>📦</span>
                  }
                </div>
                {/* Info */}
                <div style={{padding:"12px 14px"}}>
                  <p style={{color:GOLD,fontWeight:700,fontSize:13,marginBottom:4,lineHeight:1.3}}>{p.name}</p>
                  <p style={{color:"rgba(232,213,183,0.4)",fontSize:11,marginBottom:8}}>Cód: {p.code} · {p.category}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <p style={{color:GREEN,fontWeight:800,fontSize:18}}>{fmt$(p.price)}</p>
                    <p style={{color:"rgba(232,213,183,0.3)",fontSize:10}}>{p.unit}</p>
                  </div>
                  {p.stock<=p.minStock&&p.stock>0&&<p style={{color:"#FBBF24",fontSize:10,marginTop:4}}>⚠️ Pocas unidades</p>}
                  {p.stock===0&&<p style={{color:"#EF4444",fontSize:10,marginTop:4}}>❌ Sin stock</p>}
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Footer */}
      <div style={{background:"rgba(10,22,40,0.97)",borderTop:"1px solid rgba(232,213,183,0.08)",padding:"20px",textAlign:"center"}}>
        <img src="/logo.png" alt="GK Nova" style={{height:28,marginBottom:8,opacity:0.7}}/>
        <p style={{color:"rgba(232,213,183,0.3)",fontSize:11}}>{config.name} · {config.phone}</p>
        <p style={{color:"rgba(232,213,183,0.2)",fontSize:10,marginTop:4}}>Precios en USD · Sujetos a disponibilidad</p>
      </div>
    </div>
  )
}
