exports.handler = async function(event, context) {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
    const data = await response.json()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    // Fallback: try pydolarve
    try {
      const r2 = await fetch('https://pydolarve.org/api/v2/dollar?page=bcv&monitor=usd')
      const d2 = await r2.json()
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ promedio: d2.price, fuente: 'pydolarve' })
      }
    } catch(e) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No se pudo obtener la tasa' })
      }
    }
  }
}
