import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from './logoBase64.js'

const NAVY=[10,22,40], BEIGE=[232,213,183], GOLD=[201,169,110], GRAY=[120,120,120], LGRAY=[235,235,235]
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const fmtBs=(n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2})}`

export function generateQuotation({ quotation, products, customer, config, exchangeRate }) {
  const doc = new jsPDF({unit:'mm', format:'a4'})
  const W=210
  const rate = exchangeRate || config.exchangeRate || 655
  const quotNo = `COT-${String(quotation.quotationNumber||1).padStart(6,'0')}`
  const validUntil = new Date(quotation.date)
  validUntil.setDate(validUntil.getDate()+3)

  // Header
  doc.setFillColor(...NAVY)
  doc.rect(0,0,W,42,'F')
  try { doc.addImage(LOGO_B64,'PNG',12,6,55,20) } catch(e){}
  doc.setTextColor(...BEIGE)
  doc.setFontSize(20); doc.setFont('helvetica','bold')
  doc.text('COTIZACIÓN', W-14, 14, {align:'right'})
  doc.setFontSize(8); doc.setFont('helvetica','normal')
  doc.setTextColor(200,190,170)
  ;[config.address||'', `CUIT: ${config.cuit||'-'}`, `TEL: ${config.phone||'-'}`, `HORARIO: ${config.schedule||'-'}`]
    .forEach((l,i)=>{ if(l) doc.text(l, W-14, 20+i*4, {align:'right'}) })
  doc.setTextColor(...BEIGE); doc.setFontSize(9); doc.setFont('helvetica','bold')
  doc.text(new Date(quotation.date).toLocaleString('es-VE'), 12, 34)
  doc.text(quotNo, 12, 39)

  // Validity badge
  doc.setFillColor(201,169,110)
  doc.roundedRect(W-70,30,56,10,2,2,'F')
  doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont('helvetica','bold')
  doc.text(`Válida hasta: ${validUntil.toLocaleDateString('es-VE')}`, W-42, 36.5, {align:'center'})

  // Client info
  let y=48
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['CLIENTE', customer?.name||quotation.customerName||'-'],
    ['IDENTIFICACION', customer?.id_number||'-'],
    ['TELEFONO', customer?.phone||quotation.customerPhone||'-'],
    ['CORREO', customer?.email||'-'],
  ].forEach(([l,v])=>{
    doc.setFont('helvetica','bold'); doc.text(l,14,y)
    doc.setFont('helvetica','normal'); doc.text(String(v),55,y)
    y+=5
  })

  // Products table
  y+=4
  doc.autoTable({
    startY:y,
    head:[['CÓDIGO','CANT','DESCRIPCIÓN','PRECIO €','TOTAL €']],
    body: quotation.items.map(item=>{
      const p=products.find(pr=>pr.id===item.productId)||{}
      return [p.code||'-', Number(item.qty).toFixed(2), p.name||item.name||'-', fmt$(item.price), fmt$(item.qty*item.price)]
    }),
    headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:8,fontStyle:'bold'},
    bodyStyles:{fontSize:8,textColor:NAVY},
    alternateRowStyles:{fillColor:[245,245,245]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:14,halign:'center'},3:{halign:'right'},4:{halign:'right'}},
    margin:{left:14,right:14}, styles:{cellPadding:2}
  })

  // Totals
  y=doc.lastAutoTable.finalY+8
  const subtotal=quotation.items.reduce((s,i)=>s+i.qty*i.price,0)
  const discount=quotation.discount||0
  const total=subtotal-discount

  ;[['SUBTOTAL',subtotal,false],['DESCUENTO',-discount,false],['TOTAL',total,true]].forEach(([l,v,big])=>{
    const h=big?10:7
    if(big){doc.setFillColor(...NAVY);doc.rect(14,y-1,W-28,h+2,'F');doc.setTextColor(...BEIGE);doc.setFontSize(11)}
    else{doc.setFillColor(...LGRAY);doc.rect(100,y-1,W-114,h,'F');doc.setTextColor(...NAVY);doc.setFontSize(8)}
    doc.setFont('helvetica','bold')
    doc.text(l, big?18:104, y+4)
    doc.text(fmt$(v), W-14, y+4, {align:'right'})
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY)
    doc.text(fmtBs(v,rate), W-14, y+8, {align:'right'})
    y+=h+4
  })

  // Notes
  y+=4
  doc.setFillColor(240,235,225)
  doc.roundedRect(14,y,W-28,18,3,3,'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.roundedRect(14,y,W-28,18,3,3,'S')
  doc.setTextColor(...NAVY); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text('NOTAS IMPORTANTES:', 18, y+5)
  doc.setFont('helvetica','normal'); doc.setFontSize(7)
  doc.text('• Esta cotización es válida por 3 días a partir de la fecha de emisión.', 18, y+10)
  doc.text('• El total en Bs. puede variar según la tasa de cambio oficial BCV del día de pago.', 18, y+15)

  if(quotation.notes){
    y+=22
    doc.setTextColor(...NAVY); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('OBSERVACIONES:', 14, y)
    doc.setFont('helvetica','normal')
    doc.text(quotation.notes, 14, y+5)
  }

  // Footer
  y+=28
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`Tasa referencial: 1 EUR = Bs. ${rate} | ${config.name||'GK Nova'}`, W/2, y, {align:'center'})

  return doc
}
