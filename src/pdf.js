import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from './logoBase64.js'

const fmt$ = n => `€${Number(n||0).toFixed(2)}`
const fmtBs = (n, rate) => `Bs. ${(Number(n||0)*rate).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const NAVY=[10,22,40], BEIGE=[232,213,183], GRAY=[120,120,120], LGRAY=[235,235,235], GREEN=[34,139,34]

function buildHeader(doc, title, config, date, receiptNo) {
  const W=210
  doc.setFillColor(...NAVY)
  doc.rect(0,0,W,42,'F')
  // Logo
  try { doc.addImage(LOGO_B64,'PNG',12,6,55,20) } catch(e){}
  // Title & info
  doc.setTextColor(...BEIGE)
  doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(title, W-14, 14, {align:'right'})
  doc.setFontSize(7); doc.setFont('helvetica','normal')
  doc.setTextColor(200,190,170)
  ;[config.address, `CUIT: ${config.cuit||'-'}`, `TEL: ${config.phone||'-'}`, `HORARIO: ${config.schedule||'-'}`]
    .forEach((l,i)=>doc.text(l, W-14, 21+i*4, {align:'right'}))
  // Receipt info
  doc.setTextColor(...BEIGE)
  doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text(new Date(date).toLocaleString('es-VE'), 12, 36)
  doc.text(`Nº ${receiptNo}`, 12, 41)
}

export function generateSaleReceipt({ sale, products, customer, config, exchangeRate }) {
  const doc = new jsPDF({unit:'mm',format:'a4'})
  const W=210
  const rate = exchangeRate || config.exchangeRate || 46.50
  const receiptNo = `00001-${String(sale.receiptNumber||1).padStart(8,'0')}`

  buildHeader(doc, 'NOTA DE ENTREGA', config, sale.date, receiptNo)

  // Client
  let y=48
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['CLIENTE', customer?.name||sale.customerName||'-'],
    ['IDENTIFICACION', customer?.id_number||'-'],
    ['TELEFONO', customer?.phone||sale.customerPhone||'-'],
    ['CORREO', customer?.email||'-'],
  ].forEach(([l,v])=>{
    doc.setFont('helvetica','bold'); doc.text(l,14,y)
    doc.setFont('helvetica','normal'); doc.text(String(v),55,y)
    y+=5
  })

  // Payment status badge
  const isPaid = sale.paymentStatus==='paid'
  doc.setFillColor(...(isPaid?GREEN:[200,100,0]))
  doc.roundedRect(W-50,46,36,8,2,2,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold')
  doc.text(isPaid?'PAGADO':'PAGO PENDIENTE', W-32, 51.5, {align:'center'})

  // Delivery status
  const isDelivered = sale.deliveryStatus==='delivered'
  doc.setFillColor(...(isDelivered?GREEN:[80,80,200]))
  doc.roundedRect(W-50,56,36,8,2,2,'F')
  doc.setTextColor(255,255,255)
  doc.text(isDelivered?'ENTREGADO':'EN PRODUCCIÓN', W-32, 61.5, {align:'center'})

  // Products table
  y+=6
  doc.autoTable({
    startY:y,
    head:[['CÓDIGO','CANT','DESCRIPCIÓN','PRECIO €','TOTAL €']],
    body: sale.items.map(item=>{
      const p=products.find(pr=>pr.id===item.productId)||{}
      return [p.code||'-', Number(item.qty).toFixed(2), p.name||item.name||'-', fmt$(item.price), fmt$(item.qty*item.price)]
    }),
    headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:8,fontStyle:'bold'},
    bodyStyles:{fontSize:8,textColor:NAVY},
    alternateRowStyles:{fillColor:[245,245,245]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:14,halign:'center'},3:{halign:'right'},4:{halign:'right'}},
    margin:{left:14,right:14}, styles:{cellPadding:2}
  })

  // Payments
  y = doc.lastAutoTable.finalY + 6
  if (sale.payments?.length>0) {
    doc.setFillColor(...LGRAY)
    doc.rect(14,y,W-28,6,'F')
    doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont('helvetica','bold')
    doc.text('ABONOS REALIZADOS',16,y+4)
    y+=8
    sale.payments.forEach(p=>{
      doc.setFont('helvetica','normal'); doc.setFontSize(7)
      doc.text(`${new Date(p.date).toLocaleDateString('es-VE')} — ${p.method}`, 16, y)
      doc.text(fmt$(p.amount), W-14, y, {align:'right'})
      y+=4.5
    })
    y+=2
  }

  // Totals
  const subtotal=sale.items.reduce((s,i)=>s+i.qty*i.price,0)
  const discount=sale.discount||0
  const total=subtotal-discount
  const paid=sale.payments?.reduce((s,p)=>s+p.amount,0)||sale.amountPaid||0
  const pending=Math.max(0,total-paid)

  const rows=[
    ['SUBTOTAL',subtotal,false],
    ['DESCUENTO',-discount,false],
    ['TOTAL',total,true],
    ['PAGADO',paid,false],
    ['PENDIENTE',pending,false],
  ]
  rows.forEach(([label,val,isTotal])=>{
    const h=isTotal?10:7
    if(isTotal){doc.setFillColor(...NAVY);doc.rect(14,y-1,W-28,h+2,'F');doc.setTextColor(...BEIGE);doc.setFontSize(11)}
    else{doc.setFillColor(...LGRAY);doc.rect(100,y-1,W-114,h,'F');doc.setTextColor(...NAVY);doc.setFontSize(8)}
    doc.setFont('helvetica','bold')
    doc.text(label, isTotal?18:104, y+4)
    doc.text(fmt$(val), W-14, y+4, {align:'right'})
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...GRAY)
    doc.text(fmtBs(val,rate), W-14, y+8, {align:'right'})
    y+=h+4
  })

  // Footer
  y+=4
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`Tasa: 1 EUR = Bs. ${rate} | ${config.name||'GK Nova'}`, W/2, y, {align:'center'})

  return doc
}

export function generatePurchaseReceipt({ purchase, products, config }) {
  const doc = new jsPDF({unit:'mm',format:'a4'})
  const W=210
  const receiptNo = `OC-${String(purchase.receiptNumber||1).padStart(6,'0')}`

  buildHeader(doc, 'ORDEN DE COMPRA', config, purchase.date, receiptNo)

  let y=50
  doc.setFontSize(8); doc.setTextColor(...NAVY)
  ;[['PROVEEDOR', purchase.supplier||'-'], ['NOTAS', purchase.notes||'-']].forEach(([l,v])=>{
    doc.setFont('helvetica','bold'); doc.text(l,14,y)
    doc.setFont('helvetica','normal'); doc.text(String(v),55,y)
    y+=5
  })

  y+=4
  doc.autoTable({
    startY:y,
    head:[['CÓDIGO','CANT','DESCRIPCIÓN','COSTO €','TOTAL €']],
    body: purchase.items.map(item=>{
      const p=products.find(pr=>pr.id===item.productId)||{}
      return [p.code||'-', Number(item.qty).toFixed(2), p.name||'-', fmt$(item.cost), fmt$(item.qty*item.cost)]
    }),
    headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:8,fontStyle:'bold'},
    bodyStyles:{fontSize:8,textColor:NAVY},
    alternateRowStyles:{fillColor:[245,245,245]},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:14,halign:'center'},3:{halign:'right'},4:{halign:'right'}},
    margin:{left:14,right:14}, styles:{cellPadding:2}
  })

  const total=purchase.items.reduce((s,i)=>s+Number(i.qty)*Number(i.cost),0)
  y=doc.lastAutoTable.finalY+8
  doc.setFillColor(...NAVY); doc.rect(14,y-1,W-28,12,'F')
  doc.setTextColor(...BEIGE); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('TOTAL', 18, y+6)
  doc.text(fmt$(total), W-14, y+6, {align:'right'})

  y+=20
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`${config.name||'GK Nova'} — Orden de Compra`, W/2, y, {align:'center'})

  return doc
}

export function generatePaymentReceipt({ sale, payment, customer, config, exchangeRate }) {
  const doc = new jsPDF({unit:'mm',format:'a4'})
  const W=210
  const rate = exchangeRate || config.exchangeRate || 46.50

  buildHeader(doc, 'COMPROBANTE DE PAGO', config, payment.date, `CP-${payment.id.slice(0,8).toUpperCase()}`)

  let y=52
  const total=sale.items.reduce((s,i)=>s+i.qty*i.price,0)-(sale.discount||0)
  const paid=(sale.payments||[]).reduce((s,p)=>s+p.amount,0)
  const pending=Math.max(0,total-paid)

  doc.setFontSize(9); doc.setTextColor(...NAVY)
  ;[
    ['CLIENTE', customer?.name||sale.customerName||'-'],
    ['MÉTODO DE PAGO', payment.method],
    ['REFERENCIA', payment.reference||'-'],
  ].forEach(([l,v])=>{
    doc.setFont('helvetica','bold'); doc.text(l,14,y)
    doc.setFont('helvetica','normal'); doc.text(String(v),70,y)
    y+=6
  })

  y+=4
  const rows=[['TOTAL VENTA',total],['ESTE ABONO',payment.amount],['TOTAL PAGADO',paid],['SALDO PENDIENTE',pending]]
  rows.forEach(([l,v],i)=>{
    const isBig=i===1
    if(isBig){doc.setFillColor(...NAVY);doc.rect(14,y-1,W-28,12,'F');doc.setTextColor(...BEIGE);doc.setFontSize(13)}
    else{doc.setFillColor(...LGRAY);doc.rect(100,y-1,W-114,8,'F');doc.setTextColor(...NAVY);doc.setFontSize(9)}
    doc.setFont('helvetica','bold')
    doc.text(l, isBig?18:104, y+(isBig?7:5))
    doc.text(fmt$(v), W-14, y+(isBig?7:5), {align:'right'})
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY)
    doc.text(fmtBs(v,rate), W-14, y+(isBig?11.5:9), {align:'right'})
    y+=isBig?16:12
  })

  y+=6
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=4
  doc.setFontSize(6.5); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`Tasa: 1 EUR = Bs. ${rate} | ${config.name}`, W/2, y, {align:'center'})

  return doc
}
