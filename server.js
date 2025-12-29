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
      
      // Extract SANs - use regex to properly extract all DNS entries
      let sans = [];
      if (cert.subjectAltName) {
        const dnsMatches = cert.subjectAltName.match(/DNS:([^\s,]+)/g) || [];
        sans = dnsMatches.map(entry => entry.replace('DNS:', ''));
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
  
  // Collect unique SANs from all certificates
  const sansSet = new Set();
  const sanToCertInfo = new Map(); // Map to track which cert info belongs to each SAN
  
  results.forEach(result => {
    if (result.sans && result.sans.length > 0) {
      result.sans.forEach(san => {
        sansSet.add(san);
        if (!sanToCertInfo.has(san)) {
          sanToCertInfo.set(san, {
            issuer: result.issuer,
            daysUntilExpiration: result.daysUntilExpiration,
            tlsValid: result.tlsValid
          });
        }
      });
    }
  });
  
  // Test each unique SAN
  const sanResults = [];
  for (const san of sansSet) {
    const start = Date.now();
    let up = false;
    try {
      await axios.get(`https://${san}`, { timeout: 3000 });
      up = true;
    } catch {
      up = false;
    }
    const rtt = Date.now() - start;
    const certInfo = sanToCertInfo.get(san);
    
    sanResults.push({
      host: san,
      isSAN: true,
      up,
      rtt,
      tlsValid: certInfo.tlsValid,
      daysUntilExpiration: certInfo.daysUntilExpiration,
      issuer: certInfo.issuer,
      sans: []
    });
  }
  
  // Combine results and sort - clear SANs from primary results since we're testing them separately
  const allResults = results.map(r => ({ ...r, isSAN: false, sans: [] })).concat(sanResults);
  res.json(allResults);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
