// Dark mode functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Load saved dark mode preference or use system preference
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode !== null) {
  if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
  }
} else if (prefersDarkScheme.matches) {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '☀️';
}

darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
});

document.getElementById('checkBtn').addEventListener('click', async () => {
  const domain = document.getElementById('domain').value;
  if (!domain) return alert('Enter a domain!');
  const tbody = document.querySelector('#results tbody');
  tbody.innerHTML = 'Loading...';
  
  // Show progress in summary while loading
  const summaryDiv = document.getElementById('summary');
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = '<strong>Status:</strong> Querying Certificate Transparency (crt.sh)...';
  summaryDiv.style.display = 'block';

  const res = await fetch('/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain })
  });

  const response = await res.json();
  const { summary, results } = response;
  
  // Get DOM elements
  const metadataDiv = document.getElementById('metadata');
  const lastSearchDiv = document.getElementById('lastSearch');
  
  // Show last search info
  lastSearchDiv.innerHTML = `<strong>Last Search:</strong> ${summary.domain} - ${summary.totalUnique} FQDNs fetched`;
  
  // Update status
  statsDiv.innerHTML = `<strong>Status:</strong> Testing ${summary.totalUnique} hostnames...`;
  
  // Display summary once complete
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
  
  // Enable export button
  document.getElementById('exportCsv').disabled = false;
  
  // Display results
  tbody.innerHTML = '';
  results.forEach(host => {
    // Determine expiration color and display
    let expirationDisplay = '-';
    let expirationClass = '';
    if (host.tlsValid && host.daysUntilExpiration !== null) {
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
    } else if (!host.tlsValid) {
      expirationDisplay = 'No Cert';
      expirationClass = 'expired';
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
      statusCell.textContent = host.up ? '✅ Responding' : '❌ Down';
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
    issuerCell.textContent = host.issuer || 'No Cert';
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
  
  // Add export to CSV functionality
  document.getElementById('exportCsv').addEventListener('click', () => {
    const csvData = [];
    
    // Add summary header
    csvData.push(['Summary']);
    csvData.push(['Domain', summary.domain]);
    csvData.push(['Total Unique Hostnames', summary.totalUnique]);
    csvData.push(['Reachable', summary.reachable]);
    csvData.push(['Unresponsive', summary.unresponsive]);
    csvData.push(['Retrieved At', new Date(summary.retrievedAt).toLocaleString()]);
    csvData.push([]); // Empty row for spacing
    
    // Add table header
    csvData.push(['Hostname', 'Status', 'TLS Valid', 'Days Until Expiration', 'Publisher', 'RTT (ms)']);
    
    // Add results
    results.forEach(host => {
      let status = '';
      if (host.status === 'not resolved') {
        status = 'Not Resolved';
      } else if (host.status === 'unreachable') {
        status = 'Unreachable';
      } else {
        status = host.up ? 'Responding' : 'Down';
      }
      
      let expirationDisplay = '-';
      if (host.tlsValid && host.daysUntilExpiration !== null) {
        if (host.daysUntilExpiration === -1) {
          expirationDisplay = 'EXPIRED';
        } else {
          expirationDisplay = `${host.daysUntilExpiration} days`;
        }
      } else if (!host.tlsValid) {
        expirationDisplay = 'No Cert';
      }
      
      const hostname = host.isSAN ? `${host.host} (SAN)` : `${host.host} (CN)`;
      
      csvData.push([
        hostname,
        status,
        host.tlsValid ? 'Yes' : 'No',
        expirationDisplay,
        host.issuer || 'No Cert',
        host.rtt || '-'
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(',')
    ).join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `${summary.domain}-status-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
