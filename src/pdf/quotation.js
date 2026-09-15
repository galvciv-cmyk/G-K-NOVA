import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from '../logoBase64.js'

const NAVY=[10,22,40],BEIGE=[232,213,183],GOLD=[201,169,110],GRAY=[120,120,120],LGRAY=[235,235,235]
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const fmtBs=(n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}`

function ensureSpace(doc, y, neededHeight, bottomMargin=20) {
  const pageHeight = doc.internal.pageSize.getHeight ? doc.internal.pageSize.getHeight() : 297
  if (y + neededHeight > pageHeight - bottomMargin) {
    doc.addPage()
    return 20
  }
  return y
}

export function generateQuotation({quotation, products, customer, config, exchangeRate}) {
  const doc=new jsPDF({unit:'mm',format:'a4'})
  const W=210
  const rate=exchangeRate||config?.exchangeRate||655
  const quoteNo=`COT-${String(quotation.quotationNumber||1).padStart(6,'0')}`

  // Header
  doc.setFillColor(...NAVY); doc.rect(0,0,W,45,'F')
  try{doc.addImage(LOGO_B64,'PNG',12,8,55,20)}catch(e){}
  doc.setTextColor(...BEIGE); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('COTIZACIÓN', W-14, 16, {align:'right'})
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(200,190,170)
  ;[config?.address,`CUIT: ${config?.cuit||'-'}`,`TEL: ${config?.phone||'-'}`].forEach((l,i)=>doc.text(l,W-14,22+i*4,{align:'right'}))
  doc.setTextColor(...BEIGE); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(quoteNo, 12, 36)
  doc.text(new Date(quotation.date).toLocaleDateString('es-VE'), 12, 41)

  // Rate badge
  doc.setFillColor(...GOLD); doc.roundedRect(W-66,31,52,10,2,2,'F')
  doc.setTextColor(...NAVY); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text('TASA BCV DEL DÍA', W-40, 37.5, {align:'center'})

  // Client
  let y=50
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['CLIENTE',customer?.name||quotation.customerName||''],
    ['IDENTIFICACION',customer?.id_number||''],
    ['TELEFONO',customer?.phone||quotation.customerPhone||''],
    ['CORREO',customer?.email||''],
  ].filter(([,v])=>v&&v!=='-').forEach(([l,v])=>{
    doc.setFont('helvetica','bold'); doc.text(l,14,y)
    doc.setFont('helvetica','normal'); doc.text(String(v),55,y); y+=5
  })

  // Products table
  y+=4
  doc.autoTable({
    startY:y,
    head:[['CÓDIGO','CANT','DESCRIPCIÓN','PRECIO €','TOTAL €']],
    body:quotation.items.map(item=>{
      const p=products.find(pr=>pr.id===item.productId)||{}
      return [p.code||'-',Number(item.qty).toFixed(2),p.name||item.name||'-',fmt$(item.price),fmt$(item.qty*item.price)]
    }),
    headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:8,fontStyle:'bold'},
    bodyStyles:{fontSize:8,textColor:NAVY},
    alternateRowStyles:{fillColor:[245,245,245]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:14,halign:'center'},3:{halign:'right'},4:{halign:'right'}},
    margin:{left:14,right:14},styles:{cellPadding:2.5}
  })

  // Totals
  y=doc.lastAutoTable.finalY+8
  const subtotal=quotation.items.reduce((s,i)=>s+i.qty*i.price,0)
  const discount=quotation.discount||0
  const total=subtotal-discount

  const totalRows=[['SUBTOTAL',subtotal,false],['DESCUENTO',-discount,false],['TOTAL',total,true]]
  y=ensureSpace(doc, y, totalRows.length*12+6)

  totalRows.forEach(([l,v,big])=>{
    const h=big?11:7
    if(big){doc.setFillColor(...NAVY);doc.rect(14,y-1,W-28,h+2,'F');doc.setTextColor(...BEIGE);doc.setFontSize(12)}
    else{doc.setFillColor(...LGRAY);doc.rect(100,y-1,W-114,h,'F');doc.setTextColor(...NAVY);doc.setFontSize(8)}
    doc.setFont('helvetica','bold')
    doc.text(l,big?18:104,y+5)
    doc.text(fmt$(v),W-14,y+5,{align:'right'})
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...GRAY)
    doc.text(fmtBs(v,rate),W-14,y+9,{align:'right'})
    y+=h+4
  })

  // Important Note box
  y+=6
  y=ensureSpace(doc, y, 22)
  doc.setFillColor(240,235,220); doc.roundedRect(14,y,W-28,16,3,3,'F')
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.roundedRect(14,y,W-28,16,3,3,'S')
  doc.setTextColor(80,60,20); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text('NOTA IMPORTANTE:', 18, y+5.5)
  doc.setFont('helvetica','normal'); doc.setFontSize(7)
  doc.text('• El precio en Bs. puede variar diariamente según la tasa oficial BCV del día de pago.',18,y+10.5)
  doc.text('• Los montos en divisa (€) se mantienen como referencia base de la cotización.',18,y+14.5)
  y+=20

  // Seller note
  const qNote = quotation.note || quotation.notes
  if(qNote){
    const noteLines=doc.splitTextToSize(qNote, W-40)
    const noteH=10+(noteLines.length*4.5)
    y=ensureSpace(doc, y, noteH+6)
    doc.setFillColor(20,36,60); doc.roundedRect(14,y,W-28,noteH,3,3,'F')
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.roundedRect(14,y,W-28,noteH,3,3,'S')
    doc.setTextColor(...BEIGE); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('NOTA DEL VENDEDOR:',18,y+5.5)
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
    doc.text(noteLines,18,y+10.5)
    y+=noteH+4
  }

  // Footer
  y=ensureSpace(doc, y, 16)
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`Tasa referencial BCV: 1 EUR = Bs. ${rate} | ${config?.name||'GK Nova'} — ${quoteNo}`, W/2, y, {align:'center'})

  return doc
}

