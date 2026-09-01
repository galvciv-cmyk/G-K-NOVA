import { NAVY } from "../constants.js"

// Animated shimmer skeleton for loading states
const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

function SkeletonBlock({ width="100%", height=16, radius=8, style={} }){
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style
    }}/>
  )
}

export function DashboardSkeleton(){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <style>{shimmer}</style>
      {/* Day summary card */}
      <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:20}}>
        <SkeletonBlock width="40%" height={12} style={{marginBottom:12}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[1,2,3].map(i=><div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 6px"}}>
            <SkeletonBlock height={10} width="60%" style={{margin:"0 auto 8px"}}/>
            <SkeletonBlock height={20} width="80%" style={{margin:"0 auto"}}/>
          </div>)}
        </div>
      </div>
      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[1,2,3,4].map(i=><div key={i} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:18}}>
          <SkeletonBlock height={10} width="60%" style={{marginBottom:10}}/>
          <SkeletonBlock height={26} width="80%"/>
        </div>)}
      </div>
      {/* Chart */}
      <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:18}}>
        <SkeletonBlock height={12} width="40%" style={{marginBottom:14}}/>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120,paddingTop:10}}>
          {[60,80,45,90,70,55,85].map((h,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <SkeletonBlock height={`${h}%`} width="100%" radius={4}/>
              <SkeletonBlock height={8} width="70%"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({rows=4}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <style>{shimmer}</style>
      {Array.from({length:rows}).map((_,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <SkeletonBlock width={44} height={44} radius={8} style={{flexShrink:0}}/>
            <div style={{flex:1}}>
              <SkeletonBlock height={14} width={`${50+Math.random()*30}%`} style={{marginBottom:8}}/>
              <SkeletonBlock height={10} width={`${30+Math.random()*20}%`}/>
            </div>
            <SkeletonBlock width={60} height={20} radius={6}/>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConfigSkeleton(){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <style>{shimmer}</style>
      {[1,2,3].map(i=>(
        <div key={i} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(232,213,183,0.1)",borderRadius:16,padding:18}}>
          <SkeletonBlock height={12} width="30%" style={{marginBottom:14}}/>
          {[1,2,3].map(j=><div key={j} style={{marginBottom:12}}>
            <SkeletonBlock height={10} width="25%" style={{marginBottom:6}}/>
            <SkeletonBlock height={40} radius={9}/>
          </div>)}
        </div>
      ))}
    </div>
  )
}
