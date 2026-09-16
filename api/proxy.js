export default async function handler(req, res) {
  // Configurar encabezados CORS para permitir llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Si es una petición OPTIONS (preflight), responder OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extraer la URL de destino de los parámetros
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Falta la URL de destino (?url=...)' });
  }

  try {
    // Realizar la petición fetch hacia la URL de destino (webhook de Autosud)
    const fetchRes = await fetch(decodeURIComponent(targetUrl), {
      method: req.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Vercel ya parsea req.body como JSON, debemos convertirlo a string nuevamente
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const resText = await fetchRes.text();
    
    // Devolver la respuesta de Autosud al cliente
    res.status(fetchRes.status).send(resText);
  } catch (err) {
    console.error('Error en el proxy de Vercel:', err);
    res.status(500).json({ error: err.message || 'Error interno en el proxy de Vercel' });
  }
}
