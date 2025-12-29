document.getElementById('checkBtn').addEventListener('click', async () => {
  const domain = document.getElementById('domain').value;
  if (!domain) return alert('Enter a domain!');
  const tbody = document.querySelector('#results tbody');
  tbody.innerHTML = 'Loading...';

  const res = await fetch('/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain })
  });

  const data = await res.json();
  tbody.innerHTML = '';
  data.forEach(host => {
    const baseRowClass = host.up ? 'up' : 'down';
    
    // Determine expiration color
    let expirationDisplay = '-';
    let expirationClass = '';
    if (host.daysUntilExpiration !== null) {
      if (host.daysUntilExpiration === -1) {
        expirationDisplay = 'EXPIRED';
        expirationClass = 'expired';
      } else if (host.daysUntilExpiration < 30) {
        expirationDisplay = `${host.daysUntilExpiration} days`;
        expirationClass = 'expiring-soon';
      } else {
        expirationDisplay = `${host.daysUntilExpiration} days`;
        expirationClass = 'valid';
      }
    }
    
    // First row with the main hostname and info
    const tr = document.createElement('tr');
    tr.className = baseRowClass;
    tr.innerHTML = `
      <td>${host.host}</td>
      <td>${host.up ? '✅ Up' : '❌ Down'}</td>
      <td>${host.tlsValid ? '✅' : '❌'}</td>
      <td class="${expirationClass}">${expirationDisplay}</td>
      <td>${host.issuer}</td>
      <td>${host.rtt ?? '-'}</td>
    `;
    tbody.appendChild(tr);
    
    // Add rows for each SAN
    if (host.sans && host.sans.length > 0) {
      host.sans.forEach(san => {
        const sanTr = document.createElement('tr');
        sanTr.className = baseRowClass;
        sanTr.innerHTML = `
          <td style="padding-left: 20px;">↳ ${san}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        `;
        tbody.appendChild(sanTr);
      });
    }
  });
});
