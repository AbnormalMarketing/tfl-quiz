const https = require('https');
const crypto = require('crypto');

function getJWT() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(privateKey, 'base64url');
  return `${header}.${claim}.${signature}`;
}

async function getAccessToken() {
  const jwt = getJWT();
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).access_token); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const acKey = process.env.AC_API_KEY;

    // --- ACTIVECAMPAIGN ---
    const acBody = JSON.stringify({
      contact: {
        email: data.email,
        firstName: data.name,
        fieldValues: [
          { field: 'TFL_STAGE',     value: data.stage     || '' },
          { field: 'TFL_INCOME',    value: data.income    || '' },
          { field: 'TFL_LIFESTYLE', value: data.lifestyle || '' },
          { field: 'TFL_GOAL',      value: data.goal      || '' },
          { field: 'TFL_SKILLS',    value: data.skills    || '' },
          { field: 'TFL_PASSION',   value: data.passion   || '' },
          { field: 'TFL_FEAR',      value: data.fear      || '' },
          { field: 'TFL_YEAR1',     value: data.year1     || '' },
          { field: 'TFL_LEARN',     value: data.learn     || '' },
          { field: 'TFL_SPEED',     value: data.speed     || '' },
        ]
      }
    });

    await httpsPost(
      'abnormalmarketing.api-us1.com',
      '/api/3/contacts',
      {
        'Content-Type': 'application/json',
        'Api-Token': acKey,
        'Content-Length': Buffer.byteLength(acBody)
      },
      acBody
    );

    // --- GOOGLE SHEETS ---
    const token = await getAccessToken();
    const row = [
      data.name || '', data.email || '', data.date || '',
      data.stage || '', data.income || '', data.lifestyle || '',
      data.goal || '', data.skills || '', data.passion || '',
      data.fear || '', data.year1 || '', data.learn || '', data.speed || ''
    ];
    const sheetData = JSON.stringify({ values: [row] });
    const sheetId = '1D3jP_hI_V-dT0YxjzER6wl4ak0KhNKI46ASOKjAMW60';

    await httpsPost(
      'sheets.googleapis.com',
      `/v4/spreadsheets/${sheetId}/values/Form%20Responses!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(sheetData)
      },
      sheetData
    );

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