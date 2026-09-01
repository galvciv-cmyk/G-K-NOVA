import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from '../logoBase64.js'

const NAVY=[10,22,40],BEIGE=[232,213,183],GOLD=[201,169,110],GRAY=[120,120,120],LGRAY=[235,235,235]
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const fmtBs=(n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2})}`

export function generateQuote({quote,products,customer,config,exchangeRate}){
  const doc=new jsPDF({unit:'mm',format:'a4'})
  const W=210, rate=exchangeRate||config.exchangeRate||655
  const quoteNo=`COT-${String(quote.quoteNumber||1).padStart(6,'0')}`
  const validUntil=new Date(new Date(quote.date).getTime()+3*24*60*60*1000).toLocaleDateString('es-VE')

  // Header
  doc.setFillColor(...NAVY); doc.rect(0,0,W,45,'F')
  try{doc.addImage(LOGO_B64,'PNG',12,8,55,20)}catch(e){}
  doc.setTextColor(...BEIGE); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('COTIZACIÓN',W-14,16,{align:'right'})
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(200,190,170)
  ;[config.address,`CUIT: ${config.cuit||'-'}`,`TEL: ${config.phone||'-'}`].forEach((l,i)=>doc.text(l,W-14,22+i*4,{align:'right'}))
  doc.setTextColor(...BEIGE); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(quoteNo,12,36); doc.text(new Date(quote.date).toLocaleDateString('es-VE'),12,41)

  // Valid until badge
  doc.setFillColor(200,150,0); doc.roundedRect(W-65,32,52,10,2,2,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text(`Válida hasta: ${validUntil}`,W-39,38.5,{align:'center'})

  // Client
  let y=50
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['CLIENTE',customer?.name||quote.customerName||''],
    ['IDENTIFICACION',customer?.id_number||''],
    ['TELEFONO',customer?.phone||quote.customerPhone||''],
  ].filter(([,v])=>v&&v!=='-').forEach(([l,v])=>{doc.setFont('helvetica','bold');doc.text(l,14,y);doc.setFont('helvetica','normal');doc.text(String(v),55,y);y+=5})

  // Products table
  y+=4
  doc.autoTable({
    startY:y,
    head:[['CÓDIGO','CANT','DESCRIPCIÓN','PRECIO €','TOTAL €']],
    body:quote.items.map(item=>{
      const p=products.find(pr=>pr.id===item.productId)||{}
      return[p.code||'-',Number(item.qty).toFixed(2),p.name||item.name||'-',fmt$(item.price),fmt$(item.qty*item.price)]
    }),
    headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:8,fontStyle:'bold'},
    bodyStyles:{fontSize:8,textColor:NAVY},
    alternateRowStyles:{fillColor:[245,245,245]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:14,halign:'center'},3:{halign:'right'},4:{halign:'right'}},
    margin:{left:14,right:14},styles:{cellPadding:2}
  })

  // Totals
  y=doc.lastAutoTable.finalY+8
  const subtotal=quote.items.reduce((s,i)=>s+i.qty*i.price,0)
  const discount=quote.discount||0
  const total=subtotal-discount

  ;[['SUBTOTAL',subtotal,false],['DESCUENTO',-discount,false],['TOTAL',total,true]].forEach(([l,v,big])=>{
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

  // Notes
  y+=6
  doc.setFillColor(240,235,220); doc.roundedRect(14,y,W-28,18,3,3,'F')
  doc.setTextColor(80,60,20); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
  doc.text('NOTA IMPORTANTE',17,y+6)
  doc.setFont('helvetica','normal')
  doc.text('El total en Bs. es referencial y puede variar según la tasa BCV del día de pago.',17,y+11)
  doc.text(`Cotización válida por 3 días. Vence: ${validUntil}`,17,y+16)

  // Custom note from quote
  if(quote.note){
    y+=24
    const noteLines=doc.splitTextToSize(quote.note, W-40)
    const noteH=8+(noteLines.length*4.5)
    doc.setFillColor(20,36,60); doc.roundedRect(14,y,W-28,noteH,3,3,'F')
    doc.setTextColor(...BEIGE); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('NOTA DEL VENDEDOR',17,y+6)
    doc.setFont('helvetica','normal')
    doc.text(noteLines,17,y+11)
    y+=noteH+2
  }

  // Footer
  y+=24
  doc.setDrawColor(...LGRAY);doc.line(14,y,W-14,y);y+=4
  doc.setFontSize(6.5);doc.setTextColor(...GRAY);doc.setFont('helvetica','italic')
  doc.text(`${config.name||'GK Nova'} — ${quoteNo}`,W/2,y,{align:'center'})

  return doc
}
