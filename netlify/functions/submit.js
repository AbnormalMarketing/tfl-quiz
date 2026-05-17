const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Format row for Google Sheets
    const row = [
      data.name || '', data.email || '', data.date || '',
      data.stage || '', data.income || '', data.lifestyle || '',
      data.goal || '', data.skills || '', data.passion || '',
      data.fear || '', data.year1 || '', data.learn || '', data.speed || ''
    ];

    // Write to Google Sheets via API
    const sheetData = JSON.stringify({ values: [row] });
    const sheetId = '1D3jP_hI_V-dT0YxjzER6wl4ak0KhNKI46ASOKjAMW60';
    
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${sheetId}/values/Form%20Responses!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${process.env.GOOGLE_API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(sheetData)
        }
      }, resolve);
      req.on('error', reject);
      req.write(sheetData);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true })
    };
  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};