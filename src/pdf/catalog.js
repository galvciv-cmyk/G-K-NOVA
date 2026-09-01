import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from '../logoBase64.js'

const NAVY=[10,22,40], BEIGE=[232,213,183], GOLD=[201,169,110], GRAY=[160,150,130], LGRAY=[30,45,65]

export function generateCatalog({ products, config }) {
  const doc = new jsPDF({ unit:'mm', format:'a4' })
  const W=210, H=297
  const visibleProds = products.filter(p=>p.showInCatalog!==false && p.name)

  // Group by category
  const byCategory = {}
  visibleProds.forEach(p=>{
    if(!byCategory[p.category]) byCategory[p.category]=[]
    byCategory[p.category].push(p)
  })

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0,0,W,H,'F')

  // Decorative geometric shapes
  doc.setFillColor(20,38,65)
  doc.rect(0,0,W,8,'F')
  doc.rect(0,H-8,W,8,'F')
  // Accent lines
  doc.setFillColor(...GOLD)
  doc.rect(0,8,W,1,'F')
  doc.rect(0,H-9,W,1,'F')
  // Side accent
  doc.setFillColor(20,38,65)
  doc.rect(W-50,0,50,H,'F')
  doc.setFillColor(...GOLD)
  doc.rect(W-51,0,1,H,'F')

  // Logo centered
  try {
    doc.addImage(LOGO_B64,'PNG', W/2-45, 70, 90, 32)
  } catch(e){}

  // Title
  doc.setTextColor(...BEIGE)
  doc.setFontSize(36); doc.setFont('helvetica','bold')
  doc.text('CATÁLOGO', W/2-38, 130)
  doc.setFontSize(18); doc.setFont('helvetica','normal')
  doc.setTextColor(...GOLD)
  doc.text('PRODUCTOS & SERVICIOS', W/2-38, 142)

  // Divider
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(20, 150, W-55, 150)

  // Company info
  doc.setTextColor(...BEIGE); doc.setFontSize(9); doc.setFont('helvetica','normal')
  const info = [
    config.name||'GK Nova Publicity & Design',
    config.address||'',
    `Tel: ${config.phone||''}`,
    `Horario: ${config.schedule||''}`,
  ]
  info.forEach((line,i)=>{ if(line) doc.text(line, 20, 160+i*6) })

  // Date
  doc.setTextColor(...GOLD); doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('es-VE',{year:'numeric',month:'long',day:'numeric'}), 20, H-15)
  doc.text(`${visibleProds.length} productos`, 20, H-9)

  // ── CATEGORY PAGES ──────────────────────────────────────────────────────────
  Object.entries(byCategory).forEach(([category, prods])=>{
    doc.addPage()
    doc.setFillColor(...NAVY); doc.rect(0,0,W,H,'F')

    // Category header bar
    doc.setFillColor(...LGRAY); doc.rect(0,0,W,28,'F')
    doc.setFillColor(...GOLD); doc.rect(0,27,W,1,'F')
    try { doc.addImage(LOGO_B64,'PNG', W-70, 4, 55, 20) } catch(e){}
    doc.setTextColor(...BEIGE); doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.text(category.toUpperCase(), 14, 18)
    doc.setTextColor(...GOLD); doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text(`${prods.length} producto(s)`, 14, 24)

    // Products grid - 2 columns
    const colW=(W-42)/2
    const cardH=65
    const cols=2
    let col=0, row=0
    const startY=36

    prods.forEach((p,idx)=>{
      col=idx%cols
      row=Math.floor(idx/cols)

      // New page if needed
      if(startY+row*cardH+cardH > H-10){
        if(col===0){
          doc.addPage()
          doc.setFillColor(...NAVY); doc.rect(0,0,W,H,'F')
          doc.setFillColor(...LGRAY); doc.rect(0,0,W,14,'F')
          doc.setFillColor(...GOLD); doc.rect(0,13,W,0.5,'F')
          doc.setTextColor(...BEIGE); doc.setFontSize(10); doc.setFont('helvetica','bold')
          doc.text(`${category.toUpperCase()} (cont.)`, 14, 10)
          row=0
        }
      }

      const x=14+col*(colW+14)
      const y=startY+row*cardH

      // Card background
      doc.setFillColor(...LGRAY)
      doc.roundedRect(x,y,colW,cardH-4,3,3,'F')
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.3)
      doc.roundedRect(x,y,colW,cardH-4,3,3,'S')

      // Product image
      const imgSize=28
      if(p.image){
        try {
          doc.addImage(p.image,'PNG',x+4,y+4,imgSize,imgSize)
        } catch(e){
          // placeholder if image fails
          doc.setFillColor(20,38,65); doc.rect(x+4,y+4,imgSize,imgSize,'F')
          doc.setTextColor(...GOLD); doc.setFontSize(16)
          doc.text('📦', x+10, y+22)
        }
      } else {
        doc.setFillColor(20,38,65); doc.roundedRect(x+4,y+4,imgSize,imgSize,2,2,'F')
        doc.setTextColor(...GOLD); doc.setFontSize(20)
        doc.text('🏷', x+8, y+22)
      }

      // Product info
      const infoX=x+imgSize+8
      const infoW=colW-imgSize-12

      doc.setTextColor(...BEIGE); doc.setFontSize(9); doc.setFont('helvetica','bold')
      const nameLines=doc.splitTextToSize(p.name, infoW)
      doc.text(nameLines.slice(0,2), infoX, y+10)

      doc.setTextColor(...GOLD); doc.setFontSize(7.5); doc.setFont('helvetica','normal')
      doc.text(`Cód: ${p.code}`, infoX, y+20)

      if(p.unit){ doc.setTextColor(150,140,120); doc.setFontSize(7); doc.text(p.unit, infoX, y+25) }

      // Price
      doc.setFillColor(...NAVY); doc.roundedRect(infoX, y+cardH-22, infoW, 14, 2, 2, 'F')
      doc.setTextColor(...GOLD); doc.setFontSize(13); doc.setFont('helvetica','bold')
      doc.text(`€${Number(p.price).toFixed(2)}`, infoX+4, y+cardH-12)
    })

    // Page footer
    doc.setFillColor(...LGRAY); doc.rect(0,H-8,W,8,'F')
    doc.setTextColor(...GOLD); doc.setFontSize(7)
    doc.text(config.name||'GK Nova', 14, H-3)
    doc.text(`Página ${doc.internal.pages.length-1}`, W-20, H-3)
  })

  // ── BACK COVER ──────────────────────────────────────────────────────────────
  doc.addPage()
  doc.setFillColor(...NAVY); doc.rect(0,0,W,H,'F')
  doc.setFillColor(...LGRAY); doc.rect(0,H/2-60,W,120,'F')
  doc.setFillColor(...GOLD); doc.rect(0,H/2-61,W,1,'F'); doc.rect(0,H/2+59,W,1,'F')

  try { doc.addImage(LOGO_B64,'PNG', W/2-45, H/2-50, 90, 32) } catch(e){}

  doc.setTextColor(...BEIGE); doc.setFontSize(12); doc.setFont('helvetica','bold')
  doc.text('¡Gracias por tu preferencia!', W/2, H/2, {align:'center'})
  doc.setTextColor(...GOLD); doc.setFontSize(9); doc.setFont('helvetica','normal')
  ;[config.phone, config.address, config.schedule].filter(Boolean).forEach((l,i)=>{
    doc.text(l, W/2, H/2+12+i*7, {align:'center'})
  })

  return doc
}
