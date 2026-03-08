# OK-Network 👌 📶

A rapid domain reconnaissance tool that checks the status of public certificates and network connectivity for domain names and FQDNs.

## What It Does

OK-Network helps you quickly assess the health and security of your domain infrastructure by:

- **Certificate Discovery**: Queries [crt.sh](https://crt.sh) to find all unexpired SSL/TLS certificates for a given domain
- **Certificate Analysis**: Displays certificate validity, expiration dates, and issuer information
- **Network Reachability**: Tests whether each discovered hostname is reachable and responding
- **RTT Measurement**: Measures round-trip time to identify latency issues
- **Result Caching**: Stores previous search results locally so you can see cached data while fetching fresh results
- **CSV Export**: Download results as a CSV file for further analysis

## Features

✅ **Async RTT and TLS Checks** - Quickly test multiple hosts in parallel  
✅ **Dynamic HTML Table** - Real-time results display with sortable data  
✅ **Dark Mode** - Easy on the eyes with persistent preference  
✅ **Copy Commands** - One-click copy curl and openssl commands for quick verification  
✅ **Cross-Platform** - Works on Windows, macOS, and Linux  

## Quick Start (Local)

### Prerequisites
- Node.js 14+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/markwgallagher/ok-network.git
cd ok-network
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Server Deployment

### Option 1: Direct PM2 (Recommended)

```bash
npm install -g pm2

# Start the app
pm2 start server.js --name "ok-network"

# Make it restart on boot
pm2 startup
pm2 save
```

### Option 2: Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ok-network .
docker run -p 3000:3000 ok-network
```

### Option 3: systemd Service (Linux)

Create `/etc/systemd/system/ok-network.service`:
```ini
[Unit]
Description=OK-Network Domain Checker
After=network.target

[Service]
Type=simple
User=www
WorkingDirectory=/opt/ok-network
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable ok-network
sudo systemctl start ok-network
```

## Usage

1. Enter an **apex domain** (e.g., `google.com`) in the input field
2. Click **Check Hosts** 
3. The tool queries crt.sh and tests all discovered hostnames
4. Results are cached for instant display on future searches
5. Export results to CSV if needed

## Configuration

Port is hardcoded to `3000`. To change, edit `server.js`:
```javascript
const PORT = 3000; // Change this line
```

## License

MIT
