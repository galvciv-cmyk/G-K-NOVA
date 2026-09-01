import { useState, useEffect } from "react"
import { GOLD, GOLD2, GREEN, RED, YELLOW, NAVY, CATEGORIES, CAT_PREFIX, uid, fmt$ } from "../constants.js"
import { Card, SLabel, Badge, Input, Select, Btn, Modal } from "./ui.jsx"
import { generateCatalog } from "../pdf/catalog.js"
import { useToast } from "./Toast.jsx"
import * as XLSX from "xlsx"

const CAT_COLORS={Publicidad:"#A78BFA",Diseño:"#93C5FD",Sublimación:"#FCA5A5",Papelería:"#FDE68A",Gigantografía:"#6EE7B7",Uniformes:"#6EE7B7",Franelas:"#93C5FD",Chemises:"#FCA5A5",Otros:"#9CA3AF"}

function generateCode(category, products){
  const prefix=CAT_PREFIX[category]||"OT"
  const existing=products.filter(p=>p.code?.startsWith(prefix)).map(p=>parseInt(p.code.replace(prefix,""))||0)
  const next=existing.length>0?Math.max(...existing)+1:200
  return `${prefix}${next}`
}

function ProductForm({title, initial, products, onSave, onClose}){
  const EMPTY={name:"",code:"",category:"Otros",price:"",cost:"",stock:"",minStock:5,unit:"Unid",image:null,showInCatalog:true}
  const [form,setForm]=useState(initial||EMPTY)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    if(!initial&&form.category) set("code",generateCode(form.category,products))
  },[form.category])

  const handleImage=e=>{
    const file=e.target.files[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=ev=>set("image",ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave=()=>{
    if(!form.name)return
    const code=form.code||generateCode(form.category,products)
    onSave({...form,code,id:initial?.id||uid(),price:Number(form.price||0),cost:Number(form.cost||0),stock:Number(form.stock||0),minStock:Number(form.minStock||5)})
  }

  return <Modal title={title} onClose={onClose}>
    <Input label="Nombre *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="ej: Uniforme Classic"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Input label="Código (auto)" value={form.code} onChange={e=>set("code",e.target.value.toUpperCase())}/>
      <Select label="Categoría" value={form.category} onChange={e=>set("category",e.target.value)}>
        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
      </Select>
      <Input label="Precio Venta €" type="number" value={form.price} onChange={e=>set("price",e.target.value)}/>
      <Input label="Costo €" type="number" value={form.cost} onChange={e=>set("cost",e.target.value)}/>
      <Input label="Stock" type="number" value={form.stock} onChange={e=>set("stock",e.target.value)}/>
      <Input label="Stock Mínimo" type="number" value={form.minStock} onChange={e=>set("minStock",e.target.value)}/>
      <Input label="Unidad" value={form.unit} onChange={e=>set("unit",e.target.value)} placeholder="Unid / m2 / kg"/>
    </div>
    <div style={{marginBottom:12}}>
      <label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>Foto del producto</label>
      {form.image&&<img src={form.image} alt="" style={{width:"100%",height:120,objectFit:"cover",borderRadius:8,marginBottom:8}}/>}
      <input type="file" accept="image/*" onChange={handleImage} style={{color:GOLD,fontSize:12}}/>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <input type="checkbox" checked={form.showInCatalog!==false} onChange={e=>set("showInCatalog",e.target.checked)} id="catalog" style={{width:16,height:16,accentColor:GOLD2}}/>
      <label htmlFor="catalog" style={{color:GOLD,fontSize:13,cursor:"pointer"}}>Visible en catálogo público</label>
    </div>
    <div style={{display:"flex",gap:10}}>
      <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Cancelar</Btn>
      <Btn onClick={handleSave} style={{flex:2}} disabled={!form.name}>Guardar</Btn>
    </div>
  </Modal>
}

export default function Inventory({state, ops}){
  const toast = useToast()
  const [showAdd,setShowAdd]=useState(false)
  const [showImport,setShowImport]=useState(false)
  const [editProduct,setEditProduct]=useState(null)
  const [priceHistoryProduct,setPriceHistoryProduct]=useState(null)
  const [search,setSearch]=useState("")
  const [filterCat,setFilterCat]=useState("Todas")

  const filtered=state.products.filter(p=>{
    const matchSearch=!search||p.name.toLowerCase().includes(search.toLowerCase())||p.code?.toLowerCase().includes(search.toLowerCase())
    const matchCat=filterCat==="Todas"||p.category===filterCat
    return matchSearch&&matchCat
  })

  const downloadTemplate=()=>{
    const ws=XLSX.utils.aoa_to_sheet([
      ["codigo","nombre","categoria","precio_venta","costo","stock_inicial","stock_minimo","unidad"],
      ["UN200","UNIFORME CLASSIC","Uniformes",18,10,50,5,"Unid"],
    ])
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Productos")
    XLSX.writeFile(wb,"plantilla_inventario_gknova.xlsx")
  }

  const importExcel=async e=>{
    const file=e.target.files[0]; if(!file)return
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    for(const r of rows){
      if(!r.nombre&&!r.name)continue
      const p={id:uid(),code:String(r.codigo||r.code||""),name:String(r.nombre||r.name||""),category:String(r.categoria||r.category||"Otros"),price:Number(r.precio_venta||r.price||0),cost:Number(r.costo||r.cost||0),stock:Number(r.stock_inicial||r.stock||0),minStock:Number(r.stock_minimo||r.minStock||5),unit:String(r.unidad||r.unit||"Unid"),showInCatalog:true}
      await ops.addProduct(p)
    }
    setShowImport(false)
  }

  const exportInventory=()=>{
    const data=[["Código","Nombre","Categoría","Precio €","Costo €","Stock","Mín.","Unidad"],...state.products.map(p=>[p.code,p.name,p.category,p.price,p.cost,p.stock,p.minStock,p.unit])]
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"Inventario")
    XLSX.writeFile(wb,"inventario-gknova.xlsx")
  }

  return <div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{flex:1,minWidth:140,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"9px 13px",color:GOLD,fontSize:13,outline:"none"}}/>
      <Btn onClick={()=>setShowAdd(true)}>+ Agregar</Btn>
      <Btn variant="ghost" onClick={downloadTemplate} style={{fontSize:11}}>📥 Plantilla</Btn>
      <Btn variant="ghost" onClick={()=>setShowImport(true)} style={{fontSize:11}}>📤 Importar</Btn>
      <Btn variant="ghost" onClick={exportInventory} style={{fontSize:11}}>📊 Exportar</Btn>
      <Btn variant="ghost" onClick={()=>{const doc=generateCatalog({products:state.products,config:state.config});doc.save("catalogo-gknova.pdf");toast("Catálogo descargado")}} style={{fontSize:11}}>📖 Catálogo PDF</Btn>
    </div>

    {/* Category filter */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
      {["Todas",...CATEGORIES].map(cat=>(
        <button key={cat} onClick={()=>setFilterCat(cat)} style={{padding:"4px 12px",borderRadius:999,border:"none",fontWeight:600,fontSize:11,cursor:"pointer",background:filterCat===cat?`linear-gradient(135deg,${GOLD},${GOLD2})`:"rgba(255,255,255,0.07)",color:filterCat===cat?NAVY:GOLD}}>
          {cat}
        </button>
      ))}
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.length===0
        ?<Card><p style={{color:"#4B5563",textAlign:"center",padding:"20px 0"}}>Sin productos{search?` para "${search}`:""}</p></Card>
        :filtered.map(p=>{
          const sc=p.stock<=0?RED:p.stock<=p.minStock?YELLOW:GREEN
          const catColor=CAT_COLORS[p.category]||"#9CA3AF"
          return <Card key={p.id}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {p.image
                ?<img src={p.image} alt={p.name} style={{width:44,height:44,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                :<div style={{width:44,height:44,borderRadius:8,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏷️</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
                  <span style={{color:GOLD,fontWeight:700,fontSize:14}}>{p.name}</span>
                  <Badge color={GOLD2}>{p.code}</Badge>
                  <Badge color={catColor}>{p.category}</Badge>
                  {!p.showInCatalog&&<Badge color="#6B7280">Oculto</Badge>}
                </div>
                <div style={{display:"flex",gap:14}}>
                  <span style={{color:"#6B7280",fontSize:12}}>Venta: <b style={{color:GREEN}}>{fmt$(p.price)}</b></span>
                  <span style={{color:"#6B7280",fontSize:12}}>Costo: <b style={{color:"#9CA3AF"}}>{fmt$(p.cost)}</b></span>
                  <span style={{color:"#6B7280",fontSize:12}}>Stock: <b style={{color:sc}}>{p.stock} {p.unit}</b></span>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditProduct(p)} style={{background:"rgba(232,213,183,0.08)",border:"none",borderRadius:7,color:GOLD2,cursor:"pointer",padding:"6px 8px",fontSize:13}}>✏️</button>
                {p.priceHistory?.length>0&&<button onClick={()=>setPriceHistoryProduct(p)} style={{background:"rgba(147,197,253,0.08)",border:"none",borderRadius:7,color:"#93C5FD",cursor:"pointer",padding:"6px 8px",fontSize:13}}>📈</button>}
                <button onClick={()=>{if(window.confirm(`¿Eliminar ${p.name}?`))ops.removeProduct(p.id)}} style={{background:"none",border:"none",color:"#4B5563",cursor:"pointer",fontSize:16}}>🗑</button>
              </div>
            </div>
          </Card>
        })
      }
    </div>

    {showAdd&&<ProductForm title="Nuevo Producto" products={state.products} onSave={p=>{ops.addProduct(p);setShowAdd(false)}} onClose={()=>setShowAdd(false)}/>}
    {editProduct&&<ProductForm title="Editar Producto" initial={editProduct} products={state.products} onSave={p=>{
      const priceChanged = Number(p.price) !== Number(editProduct.price)
      const updated = priceChanged
        ? {...p, priceHistory:[...(editProduct.priceHistory||[]), {date:new Date().toISOString(), from:editProduct.price, to:p.price}]}
        : p
      ops.updateProduct(updated)
      setEditProduct(null)
    }} onClose={()=>setEditProduct(null)}/>}

    {showImport&&<Modal title="Importar desde Excel" onClose={()=>setShowImport(false)}>
      <p style={{color:"rgba(232,213,183,0.6)",fontSize:13,marginBottom:14}}>Descarga la plantilla, llénala y súbela aquí.</p>
      <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{color:GOLD,fontSize:13}}/>
    </Modal>}

    {priceHistoryProduct&&<Modal title={`Historial de Precio — ${priceHistoryProduct.name}`} onClose={()=>setPriceHistoryProduct(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{background:"rgba(34,197,94,0.08)",borderRadius:9,padding:"10px 14px"}}>
          <p style={{color:"#6B7280",fontSize:11}}>Precio actual</p>
          <p style={{color:GREEN,fontWeight:800,fontSize:18}}>{fmt$(priceHistoryProduct.price)}</p>
        </div>
        {[...(priceHistoryProduct.priceHistory||[])].reverse().map((h,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{color:"#9CA3AF",fontSize:12}}>{new Date(h.date).toLocaleDateString("es-VE")}</span>
            <span style={{color:GOLD,fontSize:13}}>{fmt$(h.from)} → <b style={{color:GREEN}}>{fmt$(h.to)}</b></span>
          </div>
        ))}
      </div>
    </Modal>}
  </div>
}
