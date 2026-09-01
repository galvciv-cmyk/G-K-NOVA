import { createClient } from '@supabase/supabase-js'

const URL = 'https://wsjmzingkbrzyffauzyg.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzam16aW5na2JyenlmZmF1enlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDY0NTgsImV4cCI6MjA5NjI4MjQ1OH0.Hll5AjjTKkbNE4zNkDCmiu_jhWvcAGbmfcKdIRL7HY8'

export const supabase = createClient(URL, KEY)

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}
export async function signOut() { await supabase.auth.signOut() }

// ── Config ────────────────────────────────────────────────────────────────────
export async function loadConfig() {
  const { data, error } = await supabase.from('config').select('*').eq('id','main').single()
  if (error) return null
  return {
    name: data.name || 'GK Nova Publicity & Design',
    address: data.address || 'Torre CrediCard, Av. Ppal. El Bosque, Chacao, Caracas, Venezuela',
    cuit: data.cuit || '1564567',
    phone: data.phone || '4241895407',
    schedule: data.schedule || '8:00am - 7:30pm',
    exchangeRate: data.exchange_rate || 655,
    whatsappNumber: data.whatsapp_number || '',
    receiptCounter: data.receipt_counter || 1,
    purchaseCounter: data.purchase_counter || 1,
    quoteCounter: data.quote_counter || 1,
    closedMonths: data.closed_months || [],
    lastRateReminder: data.last_rate_reminder || '',
    lastCloseReminder: data.last_close_reminder || '',
  }
}

export async function saveConfig(cfg) {
  const { error } = await supabase.from('config').upsert({
    id: 'main',
    name: cfg.name, address: cfg.address, cuit: cfg.cuit,
    phone: cfg.phone, schedule: cfg.schedule,
    exchange_rate: cfg.exchangeRate,
    whatsapp_number: cfg.whatsappNumber || '',
    receipt_counter: cfg.receiptCounter || 1,
    purchase_counter: cfg.purchaseCounter || 1,
    quote_counter: cfg.quoteCounter || 1,
    closed_months: cfg.closedMonths || [],
    last_rate_reminder: cfg.lastRateReminder || '',
    last_close_reminder: cfg.lastCloseReminder || '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' })
  if (error) throw error
}

// Atomic counter — prevents duplicate receipt numbers when two sales happen at once
export async function getNextCounter(counterName) {
  try {
    const { data, error } = await supabase.rpc('get_next_counter', { counter_name: counterName })
    if (error) throw error
    return data
  } catch (e) {
    console.error('Counter RPC failed, falling back:', e)
    // Fallback: read current value directly (less safe but functional)
    const { data } = await supabase.from('config').select('receipt_counter,purchase_counter,quote_counter').eq('id','main').single()
    if (counterName === 'receipt') return data?.receipt_counter || 1
    if (counterName === 'purchase') return data?.purchase_counter || 1
    if (counterName === 'quote') return data?.quote_counter || 1
    return 1
  }
}

// ── Products ──────────────────────────────────────────────────────────────────
export async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) return []
  return data.map(p => ({
    id: p.id, name: p.name, code: p.code, category: p.category,
    price: p.price, cost: p.cost, stock: p.stock, minStock: p.min_stock,
    unit: p.unit, image: p.image, showInCatalog: p.show_in_catalog,
    priceHistory: p.price_history || []
  }))
}

export async function saveProduct(p) {
  const { error } = await supabase.from('products').upsert({
    id: p.id, name: p.name, code: p.code, category: p.category,
    price: p.price, cost: p.cost, stock: p.stock, min_stock: p.minStock,
    unit: p.unit, image: p.image || null, show_in_catalog: p.showInCatalog !== false,
    price_history: p.priceHistory || [], updated_at: new Date().toISOString()
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function updateProductStock(id, newStock) {
  const { error } = await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function loadCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('name')
  if (error) return []
  return data.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, id_number: c.id_number }))
}

export async function saveCustomer(c) {
  const { error } = await supabase.from('customers').upsert({
    id: c.id, name: c.name, phone: c.phone || null,
    email: c.email || null, id_number: c.id_number || null
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export async function loadSales() {
  const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false })
  if (error) return []
  return data.map(s => ({
    id: s.id, date: s.date, customerId: s.customer_id,
    customerName: s.customer_name, customerPhone: s.customer_phone,
    items: s.items || [], payments: s.payments || [],
    discount: s.discount, subtotal: s.subtotal, total: s.total,
    paymentStatus: s.payment_status, deliveryStatus: s.delivery_status,
    note: s.note, receiptNumber: s.receipt_number, exchangeRate: s.exchange_rate
  }))
}

export async function saveSale(s) {
  const { error } = await supabase.from('sales').upsert({
    id: s.id, date: s.date, customer_id: s.customerId || null,
    customer_name: s.customerName, customer_phone: s.customerPhone || null,
    items: s.items, payments: s.payments,
    discount: s.discount, subtotal: s.subtotal, total: s.total,
    payment_status: s.paymentStatus, delivery_status: s.deliveryStatus,
    note: s.note || null, receipt_number: s.receiptNumber,
    exchange_rate: s.exchangeRate || 655
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteSale(id) {
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) throw error
}

// ── Purchases ─────────────────────────────────────────────────────────────────
export async function loadPurchases() {
  const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false })
  if (error) return []
  return data.map(p => ({
    id: p.id, date: p.date, supplier: p.supplier,
    items: p.items || [], total: p.total,
    notes: p.notes, receiptNumber: p.receipt_number
  }))
}

export async function savePurchase(p) {
  const { error } = await supabase.from('purchases').upsert({
    id: p.id, date: p.date, supplier: p.supplier || null,
    items: p.items, total: p.total,
    notes: p.notes || null, receipt_number: p.receiptNumber
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deletePurchase(id) {
  const { error } = await supabase.from('purchases').delete().eq('id', id)
  if (error) throw error
}

// ── Quotes ────────────────────────────────────────────────────────────────────
export async function loadQuotes() {
  const { data, error } = await supabase.from('quotes').select('*').order('date', { ascending: false })
  if (error) return []
  return data.map(q => ({
    id: q.id, date: q.date, customerId: q.customer_id,
    customerName: q.customer_name, customerPhone: q.customer_phone,
    items: q.items || [], discount: q.discount,
    subtotal: q.subtotal, total: q.total,
    status: q.status, note: q.note,
    quoteNumber: q.quote_number, exchangeRate: q.exchange_rate
  }))
}

export async function saveQuote(q) {
  const { error } = await supabase.from('quotes').upsert({
    id: q.id, date: q.date, customer_id: q.customerId || null,
    customer_name: q.customerName, customer_phone: q.customerPhone || null,
    items: q.items, discount: q.discount,
    subtotal: q.subtotal, total: q.total,
    status: q.status, note: q.note || null,
    quote_number: q.quoteNumber, exchange_rate: q.exchangeRate || 655
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteQuote(id) {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}

// ── Movements ─────────────────────────────────────────────────────────────────
export async function loadMovements() {
  const { data, error } = await supabase.from('movements').select('*').order('date', { ascending: false })
  if (error) return []
  return data.map(m => ({
    id: m.id, type: m.type, date: m.date,
    description: m.description, total: m.total,
    status: m.status, saleId: m.sale_id, purchaseId: m.purchase_id
  }))
}

export async function saveMovement(m) {
  const { error } = await supabase.from('movements').upsert({
    id: m.id, type: m.type, date: m.date,
    description: m.description, total: m.total,
    status: m.status, sale_id: m.saleId || null, purchase_id: m.purchaseId || null
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteMovement(id) {
  const { error } = await supabase.from('movements').delete().eq('id', id)
  if (error) throw error
}

// ── Cash Log ──────────────────────────────────────────────────────────────────
export async function loadCashLog() {
  const { data, error } = await supabase.from('cash_log').select('*').order('date', { ascending: false })
  if (error) return []
  return data.map(e => ({
    id: e.id, type: e.type, date: e.date,
    amount: e.amount, description: e.description, method: e.method
  }))
}

export async function saveCashEntry(e) {
  const { error } = await supabase.from('cash_log').upsert({
    id: e.id, type: e.type, date: e.date,
    amount: e.amount, description: e.description || null, method: e.method || null
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteCashEntry(id) {
  const { error } = await supabase.from('cash_log').delete().eq('id', id)
  if (error) throw error
}

// ── Load All (initial load) ───────────────────────────────────────────────────
export async function loadAllData() {
  const [config, products, customers, sales, purchases, quotes, movements, cashLog] = await Promise.all([
    loadConfig(), loadProducts(), loadCustomers(), loadSales(),
    loadPurchases(), loadQuotes(), loadMovements(), loadCashLog()
  ])
  return { config: config || {}, products, customers, sales, purchases, quotes, movements, cashLog }
}

// ── Restore from full JSON backup ─────────────────────────────────────────────
// Wipes all tables and re-inserts everything from the backup object.
// Used when something goes wrong and the user needs to roll back.
export async function restoreAllData(backup) {
  // Delete everything first
  await Promise.all([
    supabase.from('products').delete().neq('id', '___none___'),
    supabase.from('customers').delete().neq('id', '___none___'),
    supabase.from('sales').delete().neq('id', '___none___'),
    supabase.from('purchases').delete().neq('id', '___none___'),
    supabase.from('quotes').delete().neq('id', '___none___'),
    supabase.from('movements').delete().neq('id', '___none___'),
    supabase.from('cash_log').delete().neq('id', '___none___'),
  ])

  // Re-insert in order: products and customers first (referenced by others)
  if (backup.products?.length) await Promise.all(backup.products.map(saveProduct))
  if (backup.customers?.length) await Promise.all(backup.customers.map(saveCustomer))
  if (backup.sales?.length) await Promise.all(backup.sales.map(saveSale))
  if (backup.purchases?.length) await Promise.all(backup.purchases.map(savePurchase))
  if (backup.quotes?.length) await Promise.all(backup.quotes.map(saveQuote))
  if (backup.movements?.length) await Promise.all(backup.movements.map(saveMovement))
  if (backup.cashLog?.length) await Promise.all(backup.cashLog.map(saveCashEntry))
  if (backup.config) await saveConfig(backup.config)
}
