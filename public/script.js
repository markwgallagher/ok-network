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

  const response = await res.json();
  const { summary, results } = response;
  
  // Display summary
  const summaryDiv = document.getElementById('summary');
  const statsDiv = document.getElementById('stats');
  const metadataDiv = document.getElementById('metadata');
  
  statsDiv.innerHTML = `
    <strong>Summary:</strong> ${summary.totalUnique} unique hostnames detected | 
    ${summary.reachable} reachable | 
    ${summary.unresponsive} unresponsive
  `;
  
  const retrievedDate = new Date(summary.retrievedAt);
  const formattedDate = retrievedDate.toLocaleString();
  metadataDiv.innerHTML = `
    <small>Certificate data retrieved from <a href="https://crt.sh" target="_blank">crt.sh</a> on ${formattedDate}</small>
  `;
  
  summaryDiv.style.display = 'block';
  
  // Display results
  tbody.innerHTML = '';
  results.forEach(host => {
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
    
    // Format hostname - add designation for CN or SAN
    const hostDisplay = host.isSAN ? `${host.host} (SAN)` : `${host.host} (CN)`;
    
    // Create commands for clipboard
    const curlCmd = `curl -v https://${host.host}`;
    const opensslCmd = `openssl s_client -connect ${host.host}:443 -servername ${host.host}`;
    
    const tr = document.createElement('tr');
    const hostCell = document.createElement('td');
    hostCell.innerHTML = `
      <span>${hostDisplay}</span>
      <a href="#" class="copy-cmd" title="Copy curl command" data-cmd="${curlCmd.replace(/"/g, '&quot;')}">⬚curl</a>
      <a href="#" class="copy-cmd" title="Copy openssl command" data-cmd="${opensslCmd.replace(/"/g, '&quot;')}">⬚openssl</a>
    `;
    hostCell.style.whiteSpace = 'nowrap';
    
    tr.appendChild(hostCell);
    
    const statusCell = document.createElement('td');
    if (host.status === 'not resolved') {
      statusCell.textContent = '❌ Not Resolved';
    } else if (host.status === 'unreachable') {
      statusCell.textContent = '⚠️ Unreachable';
    } else {
      statusCell.textContent = host.up ? '✅ Up' : '❌ Down';
    }
    tr.appendChild(statusCell);
    
    const tlsCell = document.createElement('td');
    tlsCell.textContent = host.tlsValid ? '✅' : '❌';
    tr.appendChild(tlsCell);
    
    const expirationCell = document.createElement('td');
    expirationCell.className = expirationClass;
    expirationCell.textContent = expirationDisplay;
    tr.appendChild(expirationCell);
    
    const issuerCell = document.createElement('td');
    issuerCell.textContent = host.issuer;
    tr.appendChild(issuerCell);
    
    const rttCell = document.createElement('td');
    rttCell.textContent = host.rtt ?? '-';
    tr.appendChild(rttCell);
    
    tbody.appendChild(tr);
  });
  
  // Add event listeners for copy buttons
  document.querySelectorAll('.copy-cmd').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      navigator.clipboard.writeText(cmd).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      });
    });
  });
});
