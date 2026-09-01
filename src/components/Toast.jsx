import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { GREEN, RED, GOLD, NAVY } from "../constants.js"

const ToastContext = createContext(null)

export function ToastProvider({children}){
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type="success")=>{
    const id = Date.now()+Math.random()
    setToasts(t=>[...t, {id, message, type}])
    setTimeout(()=>{
      setToasts(t=>t.filter(toast=>toast.id!==id))
    }, 2800)
  },[])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:300,display:"flex",flexDirection:"column",gap:8,alignItems:"center",pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{
            background: t.type==="success" ? "rgba(34,197,94,0.95)" : t.type==="error" ? "rgba(239,68,68,0.95)" : "rgba(13,30,53,0.97)",
            color: t.type==="info" ? GOLD : "#fff",
            border: t.type==="info" ? "1px solid rgba(232,213,183,0.2)" : "none",
            padding:"10px 18px",
            borderRadius:999,
            fontSize:13,
            fontWeight:700,
            boxShadow:"0 8px 24px rgba(0,0,0,0.3)",
            animation:"toastIn .25s ease",
            whiteSpace:"nowrap"
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastContext)
  if(!ctx) return (msg)=>console.log('Toast:', msg) // fallback if no provider
  return ctx
}
