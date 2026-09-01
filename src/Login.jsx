import { useState } from "react"
import { signIn } from "./supabase.js"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handle = async () => {
    if (!email||!password) return
    setLoading(true); setError("")
    try { await signIn(email, password) }
    catch { setError("Email o contraseña incorrectos") }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0A1628", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ background:"#0A1628", border:"1px solid rgba(232,213,183,0.2)", borderRadius:20, padding:"18px 24px", display:"inline-block", marginBottom:20, boxShadow:"0 8px 40px rgba(0,0,0,0.4)" }}>
            <img src="/logo.png" alt="GK Nova" style={{ height:40, display:"block" }} />
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#E8D5B7" }}>Sistema de Inventario</h1>
          <p style={{ color:"rgba(232,213,183,0.35)", fontSize:13, marginTop:4 }}>Inicia sesión para continuar</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(232,213,183,0.12)", borderRadius:20, padding:28 }}>
          {[["Email","email","tu@email.com",email,setEmail],["Contraseña","password","••••••••",password,setPassword]].map(([l,t,p,v,s])=>(
            <div key={l} style={{ marginBottom:16 }}>
              <label style={{ display:"block", color:"rgba(232,213,183,0.5)", fontSize:11, fontWeight:700, marginBottom:6, letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</label>
              <input type={t} placeholder={p} value={v} onChange={e=>s(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
                style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(232,213,183,0.15)", borderRadius:10, padding:"11px 14px", color:"#E8D5B7", fontSize:14, outline:"none" }} />
            </div>
          ))}
          {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"8px 12px", marginBottom:14 }}><p style={{ color:"#F87171", fontSize:12, fontWeight:600 }}>🚫 {error}</p></div>}
          <button onClick={handle} disabled={loading||!email||!password}
            style={{ width:"100%", background:"linear-gradient(135deg,#E8D5B7,#C9A96E)", border:"none", borderRadius:12, padding:"13px", color:"#0A1628", fontWeight:800, fontSize:15, cursor:"pointer", opacity:loading||!email||!password?0.6:1, marginTop:4 }}>
            {loading?"Entrando...":"Entrar"}
          </button>
        </div>
        <p style={{ color:"rgba(232,213,183,0.15)", fontSize:11, textAlign:"center", marginTop:16 }}>GK Nova Publicity & Design © 2026</p>
      </div>
    </div>
  )
}
