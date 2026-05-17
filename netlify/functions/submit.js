const https = require('https');
const crypto = require('crypto');

function getJWT() {
  const email = 'tfl-sheet-writer@abnormal-marketing.iam.gserviceaccount.com';
  const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC+hYsjeODwEXsN\nUg5B4z8g2eRUSvye5VADkm730MJNbp/hQriP4Jh71NLOlXMtCy2kfFMZMteNPuNi\n9RdyACalfNcRPBtbgzvfwnLaawU7o4kXEL2GVJ17tdIwaZdSd2awkSFBAw2qU4BY\ntfqunDmbeH6Ap3Sq6Pj2I/jnTz1+fO7/lvJhUgeV/NDT7+SmCB77re5jve9Q+hc/\nk1rP0o2PWDi/HJqYfdHUy5okZhadM0aptZFSAZCkDVuklHuxSCYoVVhg144Hh+tN\nObUgKZtiZFpftR0/gIZMuUR5juEOssCxvvV4thv1+H+yqnD0HARidQhJLZIbNuED\nwPR1btxLAgMBAAECggEAUDvuKiycUg2SjDwLvAynB78rTKJdu87ngPGYoO19/l0B\noLxX/GOB49hvRMekfwovmQ8wcbK7GwUqfoCn9H8Cx3uJGP1+qe3c97EsbDZYuFJ5\nB8kpf5o/zhr2nyPAsd6N1Prxja7rANl0eid9IC6zhflbEPQ0iktdmU7x4fu5cnwR\nThHzpLisTnMx9OfR8N651qTIMY7MMbwi34kDtH0lgiUFYhaKpbpVx1BM7/rItGv6\nL+Mi0JLIIY7or7+FrLafe+gSR+OmFpnEn71KmEiKzyvD7nwwn5xL0GkpNOi8vuhA\n+IcijNVrcXflGnwNi08pX7MGZMqj/BfveKOWRjj/9QKBgQDq7zs0Yj01C31vAXEA\ndzXnFr6s/kVwg5nc8PuTuEMpK8wNdP9KjZgrScOd+VAXNCeMqKvsiW9HgDyniCih\nhsWYl6adW4QyRL9yEpDEzHv48uk7xV/Zn1GAL7lVdIkt5RJKew6U0xYT/UrrTc8C\nTlbsIud7I/mnspitUbBvUqNO9QKBgQDPmtgjk2YVyGcHs0RcCh74rsht+d62xm9K\nS+KuFc3FJgNt0Taa17NxKmlyAbXa6MJG++2x09vd2MCthPDQIePnCWJu1Ptx9tRV\nuhtC366NS2hfbC55Dyu49R6tI7cr+ZytsU5NTsri2z0v+TtSh7Esf36na4LQvbjB\n1nYPYoP2PwKBgQDBBJQL0bqf3jTMAs8opsiud81oq++5JSZAk+zdzMHBDa60T69/\nPR4MUqpZHABlUAA+XEYELFY01HMA4akgLG4jlFTba9kMw9bWjdJLHgWs30YoSV0a\nmv6G5q7KOtiJ0G5aqwer1lGJUs0+zcqKBnr7vyGX1lLDKMSvgTIIBEkQEQKBgQC6\nVVrFo5iu2G5RJP+oNJVT01ymCO1y02w0HSRZ58wGtXXCbVM7a3rtiYmXAB3/W4Z0\nO84+G89tsQxPMdEKnkB1r6CfpZ4Bze8K+r1ZKnb67sHBU9Hqaklt+uQLttDDMYkF\nBO0oyh2ju++RTXuHOa82J0DAd+iz/nUD1b+lU2Dp9QKBgDYkIo1x/PWSrpuKY/10\nNsVd+K7P5Et4t9XeHnECaVsHdQ4PKO5VsU1wCexu9RKKMzXO/jyVXeOf+LDAr27B\nW0MPEINVoZCBnFDXRBpWXlfq6WptdEu2JBCCWYQ8OPppRdRylTHC6tvj0c908hwH\nUtMoAJlosBXEFfXeqe26zsaM\n-----END PRIVATE KEY-----\n";

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
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
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

  const logs = [];

  try {
    const data = JSON.parse(event.body);
    logs.push('DATA RECEIVED: ' + JSON.stringify(data));

    const acKey = 'f689b5e705d9bf14ec81fa709a68e2426515d3ecd35b1394f7d8493d81694088b81943cd';

    // --- ACTIVECAMPAIGN ---
    const acBody = JSON.stringify({
      contact: {
        email: data.email,
        firstName: data.name,
        fieldValues: [
          { field: '8',  value: data.stage     || '' },
          { field: '1',  value: data.income    || '' },
          { field: '7',  value: data.lifestyle || '' },
          { field: '9',  value: data.goal      || '' },
          { field: '2',  value: data.skills    || '' },
          { field: '3',  value: data.passion   || '' },
          { field: '4',  value: data.fear      || '' },
          { field: '5',  value: data.year1     || '' },
          { field: '6',  value: data.learn     || '' },
          { field: '10', value: data.speed     || '' },
        ]
      }
    });

    const acResult = await httpsPost(
      'abnormalmarketing.api-us1.com',
      '/api/3/contacts',
      {
        'Content-Type': 'application/json',
        'Api-Token': acKey,
        'Content-Length': Buffer.byteLength(acBody)
      },
      acBody
    );
    logs.push('AC STATUS: ' + acResult.status);
    logs.push('AC RESPONSE: ' + acResult.body);

    // --- GOOGLE SHEETS ---
    const token = await getAccessToken();
    logs.push('GOT SHEETS TOKEN: ' + (token ? 'yes' : 'no'));

    const row = [
      data.name || '', data.email || '', data.date || '',
      data.stage || '', data.income || '', data.lifestyle || '',
      data.goal || '', data.skills || '', data.passion || '',
      data.fear || '', data.year1 || '', data.learn || '', data.speed || ''
    ];
    const sheetData = JSON.stringify({ values: [row] });
    const sheetId = '1D3jP_hI_V-dT0YxjzER6wl4ak0KhNKI46ASOKjAMW60';

    const sheetResult = await httpsPost(
      'sheets.googleapis.com',
      `/v4/spreadsheets/${sheetId}/values/Form%20Responses!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(sheetData)
      },
      sheetData
    );
    logs.push('SHEETS STATUS: ' + sheetResult.status);
    logs.push('SHEETS RESPONSE: ' + sheetResult.body);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, logs })
    };

  } catch(err) {
    logs.push('ERROR: ' + err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message, logs })
    };
  }
};