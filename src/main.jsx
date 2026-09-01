import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import CatalogPage from './CatalogPage.jsx'
import { supabase, signOut } from './supabase.js'
import { ToastProvider } from './components/Toast.jsx'

function Root() {
  const [session, setSession] = useState(undefined)
  const isCatalog = window.location.pathname === '/catalogo' || window.location.pathname === '/catalogo/'

  useEffect(() => {
    if(isCatalog) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [isCatalog])

  if(isCatalog) return <CatalogPage/>

  if (session === undefined) return (
    <div style={{ minHeight:"100vh", background:"#0A1628", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:48, height:48, border:"3px solid rgba(232,213,183,0.15)", borderTopColor:"#E8D5B7", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!session) return <Login />
  return <App onSignOut={signOut} userEmail={session.user.email} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </React.StrictMode>
)
