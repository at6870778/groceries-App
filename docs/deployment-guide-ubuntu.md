# Deployment Guide (Ubuntu VPS)

## 1. Provision Server
1. Create Ubuntu 24.04 VPS.
2. Open ports: 22, 80, 443.
3. Install Docker and Compose plugin.

## 2. Install Dependencies
```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```
Re-login after group update.

## 3. Clone Project and Configure
```bash
git clone <your-repo-url> khanago
cd khanago
cp .env.example .env
```
Update `.env` with production credentials and JWT secret.

## 4. MySQL
- Use Docker MySQL in compose for MVP.
- For managed DB, set backend env vars to managed endpoint.

## 5. Run Stack
```bash
docker compose up -d --build
```

## 6. Nginx Reverse Proxy
For host-based routing:
- Admin UI: `admin.yourdomain.com`
- API: `api.yourdomain.com`

Sample host Nginx:
```nginx
server {
  server_name api.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  server_name admin.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:4200;
    proxy_set_header Host $host;
  }
}
```

## 7. SSL Setup (Let's Encrypt)
```bash
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```
Enable auto-renew check:
```bash
sudo systemctl status certbot.timer
```

## 8. Java Deployment (without Docker optional)
- Install Java 17.
- Build jar: `mvn clean package -DskipTests`.
- Run with systemd service and profile `prod`.

## 9. Angular Deployment
- Build admin: `npm run build`.
- Serve static files with Nginx root and SPA fallback.

## 10. Domain Mapping
- Add A records for `api` and `admin` subdomains to VPS public IP.
- Wait for DNS propagation, then run Certbot.
