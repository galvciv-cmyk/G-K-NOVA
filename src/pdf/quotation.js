import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from '../logoBase64.js'

const NAVY=[10,22,40],BEIGE=[232,213,183],GOLD=[201,169,110],GRAY=[120,120,120],LGRAY=[235,235,235]
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const fmtBs=(n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2})}`

export function generateQuotation({quotation, products, customer, config}) {
  const doc=new jsPDF({unit:'mm',format:'a4'})
  const W=210
  const rate=config.exchangeRate||655
  const expiry=new Date(quotation.date)
  expiry.setDate(expiry.getDate()+3)

  // Header
  doc.setFillColor(...NAVY); doc.rect(0,0,W,45,'F')
  try{doc.addImage(LOGO_B64,'PNG',12,8,55,20)}catch(e){}
  doc.setTextColor(...BEIGE); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('COTIZACIÓN', W-14, 16, {align:'right'})
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(200,190,170)
  ;[config.address,`CUIT: ${config.cuit||'-'}`,`TEL: ${config.phone||'-'}`].forEach((l,i)=>doc.text(l,W-14,22+i*4,{align:'right'}))
  doc.setTextColor(...BEIGE); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(new Date(quotation.date).toLocaleString('es-VE'), 12, 36)
  doc.text(`COT-${String(quotation.quotationNumber||1).padStart(6,'0')}`, 12, 41)

  // Validity badge
  doc.setFillColor(201,169,110); doc.roundedRect(W-60,32,46,10,2,2,'F')
  doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont('helvetica','bold')
  doc.text(`Válida hasta: ${expiry.toLocaleDateString('es-VE')}`, W-37, 38.5, {align:'center'})

  // Client
  let y=52
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['CLIENTE',customer?.name||quotation.customerName||'-'],
    ['TELÉFONO',customer?.phone||quotation.customerPhone||'-'],
    ['CORREO',customer?.email||'-'],
  ].forEach(([l,v])=>{
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
    margin:{left:14,right:14},styles:{cellPadding:2}
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
    doc.text(l,big?18:104,y+4)
    doc.text(fmt$(v),W-14,y+4,{align:'right'})
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...GRAY)
    doc.text(fmtBs(v,rate),W-14,y+8,{align:'right'})
    y+=h+4
  })

  // BCV notice
  y+=4
  doc.setFillColor(255,243,200); doc.roundedRect(14,y,W-28,14,3,3,'F')
  doc.setTextColor(120,80,0); doc.setFontSize(7); doc.setFont('helvetica','bold')
  doc.text('⚠️ NOTA IMPORTANTE', 18, y+5)
  doc.setFont('helvetica','normal')
  doc.text('Los montos en Bs. son referenciales y pueden variar según la tasa BCV del día de pago.',18,y+10)

  // Footer
  y+=22
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`Tasa referencial: 1 EUR = Bs. ${rate} | ${config.name||'GK Nova'} | Válida por 3 días`, W/2, y, {align:'center'})

  return doc
}
