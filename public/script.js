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
    const tr = document.createElement('tr');
    tr.className = host.up ? (host.expiresSoon ? 'warn' : 'up') : 'down';
    tr.innerHTML = `
      <td>${host.host}</td>
      <td>${host.up ? '✅ Up' : '❌ Down'}</td>
      <td>${host.tlsValid ? '✅' : '❌'}</td>
      <td>${host.expiresSoon ? '⚠️' : ''}</td>
      <td>${host.rtt ?? '-'}</td>
    `;
    tbody.appendChild(tr);
  });
});
