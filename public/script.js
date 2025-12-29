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
    
    // Format hostname - add indicator if it's a SAN
    const hostDisplay = host.isSAN ? `↳ ${host.host}` : host.host;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${hostDisplay}</td>
      <td>${host.up ? '✅ Up' : '❌ Down'}</td>
      <td>${host.tlsValid ? '✅' : '❌'}</td>
      <td class="${expirationClass}">${expirationDisplay}</td>
      <td>${host.issuer}</td>
      <td>${host.rtt ?? '-'}</td>
    `;
    tbody.appendChild(tr);
  });
});
