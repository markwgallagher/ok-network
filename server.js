import express from 'express';
import axios from 'axios';
import tls from 'tls';
import https from 'https';

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

async function getHostnames(domain) {
  try {
    const res = await axios.get(`https://crt.sh/?q=%25${domain}&output=json`);
    const hostnames = new Set();
    res.data.forEach(entry => {
      if (entry.not_after && new Date(entry.not_after) > new Date()) {
        hostnames.add(entry.name_value.replace(/\*\./g, '')); // remove wildcards
      }
    });
    return Array.from(hostnames);
  } catch (err) {
    console.error(err);
    return [];
  }
}

function checkTLS(host) {
  return new Promise((resolve) => {
    const socket = tls.connect(443, host, { servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      const now = new Date();
      const expiresSoon = cert.valid_to ? (new Date(cert.valid_to) - now) < 30*24*60*60*1000 : false;
      socket.end();
      resolve({ host, tlsValid: !!cert, expiresSoon });
    });
    socket.on('error', () => resolve({ host, tlsValid: false, expiresSoon: false }));
  });
}

async function checkHost(host) {
  const start = Date.now();
  try {
    await axios.get(`https://${host}`, { timeout: 3000 });
    const rtt = Date.now() - start;
    const tlsInfo = await checkTLS(host);
    return { ...tlsInfo, rtt, up: true };
  } catch {
    return { host, up: false, rtt: null, tlsValid: false, expiresSoon: false };
  }
}

app.post('/check', async (req, res) => {
  const { domain } = req.body;
  const hosts = await getHostnames(domain);
  const results = await Promise.all(hosts.map(checkHost));
  res.json(results);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
