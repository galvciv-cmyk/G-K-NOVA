import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LOGO_B64 } from '../logoBase64.js'

const NAVY=[10,22,40], BEIGE=[232,213,183], GOLD2=[201,169,110], GRAY=[120,120,120], GREEN=[34,139,34], RED=[200,50,50], LGRAY=[235,235,235]
const fmt$=n=>`€${Number(n||0).toFixed(2)}`
const fmtBs=(n,r)=>`Bs. ${(Number(n||0)*Number(r||655)).toLocaleString('es-VE',{minimumFractionDigits:2})}`

export function generateMonthlyClosing({ month, year, sales, purchases, products, config }) {
  const doc = new jsPDF({unit:'mm', format:'a4'})
  const W=210
  const rate = config.exchangeRate || 655

  const monthName = new Date(year, month-1, 1).toLocaleString('es-VE',{month:'long',year:'numeric'})

  // ── Header ──
  doc.setFillColor(...NAVY)
  doc.rect(0,0,W,45,'F')
  try { doc.addImage(LOGO_B64,'PNG',12,8,55,20) } catch(e){}
  doc.setTextColor(...BEIGE)
  doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('CIERRE MENSUAL', W-14, 16, {align:'right'})
  doc.setFontSize(12)
  doc.text(monthName.toUpperCase(), W-14, 24, {align:'right'})
  doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(200,190,170)
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, W-14, 30, {align:'right'})
  doc.text(`Tasa: 1 EUR = Bs. ${rate}`, W-14, 35, {align:'right'})

  let y = 52

  // ── Summary box ──
  const totalSales    = sales.reduce((s,sale)=>s+sale.total,0)
  const totalPurchases= purchases.reduce((s,p)=>s+p.total,0)
  const grossProfit   = totalSales - totalPurchases
  const totalPaid     = sales.reduce((s,sale)=>s+(sale.payments||[]).reduce((a,p)=>a+p.amount,0),0)
  const totalPending  = Math.max(0, totalSales - totalPaid)
  const salesCount    = sales.length
  const purchasesCount= purchases.length
  const itemsSold     = sales.reduce((s,sale)=>s+sale.items.reduce((a,i)=>a+i.qty,0),0)

  // Summary grid
  const summaryItems = [
    ['VENTAS TOTALES', fmt$(totalSales), fmtBs(totalSales,rate), [...GREEN]],
    ['COMPRAS TOTALES', fmt$(totalPurchases), fmtBs(totalPurchases,rate), [...RED]],
    ['GANANCIA BRUTA', fmt$(grossProfit), fmtBs(grossProfit,rate), grossProfit>=0?[...GREEN]:[...RED]],
    ['POR COBRAR', fmt$(totalPending), fmtBs(totalPending,rate), [200,150,0]],
  ]

  summaryItems.forEach((item,i)=>{
    const col = i%2===0 ? 14 : W/2+4
    const row = Math.floor(i/2)
    const bx = col, by = y + row*22, bw = W/2-18, bh = 20
    doc.setFillColor(20,35,58)
    doc.roundedRect(bx,by,bw,bh,3,3,'F')
    doc.setDrawColor(...item[3])
    doc.setLineWidth(0.5)
    doc.roundedRect(bx,by,bw,bh,3,3,'S')
    doc.setTextColor(...GRAY); doc.setFontSize(7); doc.setFont('helvetica','bold')
    doc.text(item[0], bx+5, by+6)
    doc.setTextColor(...item[3]); doc.setFontSize(12); doc.setFont('helvetica','bold')
    doc.text(item[1], bx+5, by+13)
    doc.setTextColor(...GRAY); doc.setFontSize(6.5); doc.setFont('helvetica','normal')
    doc.text(item[2], bx+5, by+18)
  })

  y += 48

  // Stats row
  doc.setFillColor(...NAVY)
  doc.rect(14,y,W-28,14,'F')
  const stats=[`${salesCount} Ventas`,`${purchasesCount} Compras`,`${itemsSold} Unidades vendidas`]
  stats.forEach((s,i)=>{
    doc.setTextColor(...BEIGE); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text(s, 14+(W-28)/stats.length*i + (W-28)/stats.length/2, y+9, {align:'center'})
  })
  y += 22

  // ── Sales detail ──
  if(sales.length>0){
    doc.setFillColor(...LGRAY)
    doc.rect(14,y,W-28,7,'F')
    doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text(`VENTAS DEL MES (${salesCount})`, 17, y+5)
    y+=9

    doc.autoTable({
      startY:y,
      head:[['FECHA','CLIENTE','ITEMS','MÉTODO','TOTAL €','ESTADO']],
      body: sales.map(s=>{
        const paid=(s.payments||[]).reduce((a,p)=>a+p.amount,0)
        return [
          new Date(s.date).toLocaleDateString('es-VE'),
          s.customerName||'-',
          s.items?.length||0,
          s.payments?.[0]?.method||'-',
          fmt$(s.total),
          s.paymentStatus==='paid'?'Pagado':'Pendiente'
        ]
      }),
      headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:7,fontStyle:'bold'},
      bodyStyles:{fontSize:7,textColor:NAVY},
      alternateRowStyles:{fillColor:[245,245,245]},
      columnStyles:{
        0:{cellWidth:22},1:{cellWidth:40},2:{cellWidth:12,halign:'center'},
        3:{cellWidth:28},4:{cellWidth:20,halign:'right'},5:{cellWidth:20,halign:'center'}
      },
      didDrawCell:(data)=>{
        if(data.section==='body'&&data.column.index===5){
          const val=data.cell.text[0]
          doc.setTextColor(val==='Pagado'?34:200, val==='Pagado'?139:100, val==='Pagado'?34:0)
        }
      },
      margin:{left:14,right:14}, styles:{cellPadding:1.5}
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Purchases detail ──
  if(purchases.length>0){
    if(y > 240){ doc.addPage(); y=20 }
    doc.setFillColor(...LGRAY)
    doc.rect(14,y,W-28,7,'F')
    doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text(`COMPRAS DEL MES (${purchasesCount})`, 17, y+5)
    y+=9

    doc.autoTable({
      startY:y,
      head:[['FECHA','PROVEEDOR','PRODUCTOS','TOTAL €']],
      body: purchases.map(p=>[
        new Date(p.date).toLocaleDateString('es-VE'),
        p.supplier||'-',
        p.items?.length||0,
        fmt$(p.total)
      ]),
      headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:7,fontStyle:'bold'},
      bodyStyles:{fontSize:7,textColor:NAVY},
      alternateRowStyles:{fillColor:[245,245,245]},
      columnStyles:{0:{cellWidth:25},3:{cellWidth:25,halign:'right'}},
      margin:{left:14,right:14}, styles:{cellPadding:1.5}
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Top products ──
  const productSales = {}
  sales.forEach(sale=>{
    sale.items?.forEach(item=>{
      if(!productSales[item.productId]) productSales[item.productId]={qty:0,revenue:0}
      productSales[item.productId].qty += item.qty
      productSales[item.productId].revenue += item.qty*item.price
    })
  })
  const topProducts = Object.entries(productSales)
    .map(([id,data])=>({...data,product:products.find(p=>p.id===id)}))
    .filter(d=>d.product)
    .sort((a,b)=>b.revenue-a.revenue)
    .slice(0,5)

  if(topProducts.length>0){
    if(y > 240){ doc.addPage(); y=20 }
    doc.setFillColor(...LGRAY)
    doc.rect(14,y,W-28,7,'F')
    doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text('TOP PRODUCTOS DEL MES', 17, y+5)
    y+=9

    doc.autoTable({
      startY:y,
      head:[['#','PRODUCTO','CÓDIGO','UNIDADES','INGRESOS €']],
      body: topProducts.map((d,i)=>[i+1, d.product.name, d.product.code, d.qty.toFixed(0), fmt$(d.revenue)]),
      headStyles:{fillColor:NAVY,textColor:BEIGE,fontSize:7,fontStyle:'bold'},
      bodyStyles:{fontSize:7,textColor:NAVY},
      alternateRowStyles:{fillColor:[245,245,245]},
      columnStyles:{0:{cellWidth:8,halign:'center'},2:{cellWidth:20},3:{cellWidth:20,halign:'center'},4:{cellWidth:25,halign:'right'}},
      margin:{left:14,right:14}, styles:{cellPadding:1.5}
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Footer ──
  if(y > 265){ doc.addPage(); y=20 }
  doc.setDrawColor(...LGRAY); doc.line(14,y,W-14,y); y+=5
  doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica','italic')
  doc.text(`${config.name||'GK Nova'} — Cierre Mensual ${monthName}`, W/2, y, {align:'center'})

  return doc
}
