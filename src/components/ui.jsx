import { NAVY, GOLD, GOLD2 } from '../constants.js'

export const Card=({children,style={}})=><div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:18,...style}}>{children}</div>
export const SLabel=({color=GOLD2,children,style={}})=><p style={{color,fontWeight:700,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,...style}}>{children}</p>
export const Badge=({color,children})=><span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:999,padding:"2px 9px",fontSize:11,fontWeight:600}}>{children}</span>
export const StatusBadge=({payStatus,delStatus})=><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
  <Badge color={payStatus==="paid"?"#22C55E":"#FBBF24"}>{payStatus==="paid"?"✅ Pagado":"🟡 Pendiente"}</Badge>
  <Badge color={delStatus==="delivered"?"#93C5FD":"#A78BFA"}>{delStatus==="delivered"?"📦 Entregado":"⚙️ En Producción"}</Badge>
</div>

export function Input({label,...props}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</label>}
    <input {...props} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:14,outline:"none",boxSizing:"border-box",...props.style}}/>
  </div>
}

export function Select({label,children,...props}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",color:"rgba(232,213,183,0.5)",fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</label>}
    <select {...props} style={{width:"100%",background:NAVY,border:"1px solid rgba(232,213,183,0.15)",borderRadius:9,padding:"10px 13px",color:GOLD,fontSize:14,outline:"none",boxSizing:"border-box"}}>{children}</select>
  </div>
}

export function Btn({children,onClick,variant="primary",style={},disabled}){
  const v={
    primary:{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:NAVY},
    ghost:{background:"rgba(255,255,255,0.07)",color:GOLD},
    danger:{background:"rgba(239,68,68,0.15)",color:"#F87171",border:"1px solid rgba(239,68,68,0.3)"},
    green:{background:"rgba(34,197,94,0.15)",color:"#4ADE80",border:"1px solid rgba(34,197,94,0.3)"},
    yellow:{background:"rgba(251,191,36,0.15)",color:"#FBBF24",border:"1px solid rgba(251,191,36,0.3)"},
  }
  return <button onClick={onClick} disabled={disabled} style={{border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,fontSize:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,...v[variant],...style}}>{children}</button>
}

export function Modal({title,onClose,children,wide}){
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
    <div style={{background:"#0D1E35",borderRadius:20,width:"100%",maxWidth:wide?720:500,maxHeight:"93vh",overflowY:"auto",border:"1px solid rgba(232,213,183,0.15)",boxShadow:"0 25px 60px rgba(0,0,0,0.7)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 0"}}>
        <h3 style={{fontWeight:700,fontSize:17,color:GOLD}}>{title}</h3>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",color:"#9CA3AF",borderRadius:7,width:30,height:30,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{padding:"14px 22px 22px"}}>{children}</div>
    </div>
  </div>
}
