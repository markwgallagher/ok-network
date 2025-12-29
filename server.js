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
    const res = await axios.get(`https://crt.sh/?q=${domain}&output=json`);
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
      
      // Calculate days until expiration
      let daysUntilExpiration = null;
      if (cert.valid_to) {
        const expiryDate = new Date(cert.valid_to);
        const isExpired = expiryDate <= now;
        if (isExpired) {
          daysUntilExpiration = -1; // Negative indicates expired
        } else {
          daysUntilExpiration = Math.floor((expiryDate - now) / (24 * 60 * 60 * 1000));
        }
      }
      
      // Extract issuer (publisher)
      const issuer = cert.issuer ? cert.issuer.O || cert.issuer.CN || 'Unknown' : 'Unknown';
      
      // Extract SANs
      let sans = [];
      if (cert.subjectAltName) {
        sans = cert.subjectAltName.split(', ').map(san => san.replace('DNS:', '').trim());
      }
      
      socket.end();
      resolve({ host, tlsValid: !!cert, daysUntilExpiration, issuer, sans });
    });
    socket.on('error', () => resolve({ host, tlsValid: false, daysUntilExpiration: null, issuer: 'Unknown', sans: [] }));
  });
}

async function checkHost(host) {
  const start = Date.now();
  const tlsInfo = await checkTLS(host);
  try {
    await axios.get(`https://${host}`, { timeout: 3000 });
    const rtt = Date.now() - start;
    return { host, ...tlsInfo, rtt, up: true };
  } catch {
    const rtt = Date.now() - start;
    return { host, ...tlsInfo, rtt, up: false };
  }
}

app.post('/check', async (req, res) => {
  const { domain } = req.body;
  const hosts = await getHostnames(domain);
  const results = await Promise.all(hosts.map(checkHost));
  res.json(results);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
