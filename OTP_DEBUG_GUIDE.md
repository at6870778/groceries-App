# Debug OTP Issues - Step by Step Guide

## Step 1: Check if Backend is Running Locally

Your backend runs in Docker. To see logs:

### Option A: Using WSL (Windows Subsystem for Linux)
```bash
# Open WSL Terminal and go to your project
cd /mnt/c/Users/kabhis972/Learning

# View all running containers
docker ps

# View backend logs
docker logs <container_name> -f  # -f means follow (live)

# Example:
docker logs learning-backend-1 -f
```

### Option B: Using Docker Desktop UI
1. Open Docker Desktop
2. Go to "Containers" tab
3. Look for container named `learning-backend-1` or similar
4. Click it → View logs

---

## Step 2: What to Look For in Logs

When someone requests OTP, look for:

### ✅ Success (OTP should send):
```
INFO  OTP sent successfully to phone: 8860152106
INFO  REQUEST_SUCCESS - OTP dispatched
INFO  MSG91 SMS sent successfully
```

### ❌ Errors to check:
```
ERROR Rate limit exceeded for phone: 8860152106
ERROR Too many OTP requests - locked for 15 minutes
ERROR MSG91 service failed: Connection timeout
ERROR Invalid phone number format
ERROR Database error saving OTP record
```

---

## Step 3: Check OTP Database Records

If backend is running, you can query the database directly:

### Option A: Via MySQL in Docker
```bash
# Access MySQL terminal
docker exec -it <mysql_container> mysql -u root -p

# Enter password: root (or your DB_PASSWORD)

# Switch to database
USE grocery_mvp;

# Check OTP records
SELECT * FROM otp_records ORDER BY created_at DESC LIMIT 10;

# Check OTP audit logs
SELECT * FROM otp_audit_logs ORDER BY created_at DESC LIMIT 20;

# Check if phone exists in users table
SELECT * FROM users WHERE phone = '8860152106';
```

### Option B: Using MySQL GUI
- Download MySQL Workbench or DBeaver
- Connect to: `localhost:3306`
- Username: `root`
- Password: `root`
- Database: `grocery_mvp`

---

## Step 4: Common OTP Issues & Fixes

### Issue: "Rate Limit Exceeded"
**Cause:** Too many OTP requests in short time
**Solution:** Wait 15 minutes or clear OTP records:
```sql
DELETE FROM otp_records WHERE phone = '8860152106' AND invalidated = false;
```

### Issue: "MSG91 Service Error"
**Cause:** SMS provider not configured or API key wrong
**Check in logs:** Look for MSG91 API response
**Fix:** Verify MSG91_AUTH_KEY and MSG91_TOKEN_AUTH in docker-compose.yml

### Issue: "Invalid Phone Format"
**Cause:** Phone number doesn't match expected format
**Expected format:** 10 digits (e.g., 8860152106)

### Issue: No Error, But OTP Not Sent
**Cause:** Widget mode disabled, checking backend logs will show which mode
**Check:** Look for "ACCEPT_ANY_OTP" or "widgetEnabled" in logs

---

## Step 5: Test OTP Request Manually

### Option A: Using curl (if backend runs locally on 8080)
```bash
curl -X POST http://localhost:8080/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"8860152106"}'
```

### Option B: Using Postman
- POST: `http://localhost:8080/api/auth/request-otp`
- Body (JSON): `{"phone":"8860152106"}`

---

## Step 6: Environment Variables Check

Make sure these are set in docker-compose.yml:
```
MSG91_AUTH_KEY=515371AIRutVUf6a01ceaeP1
MSG91_TOKEN_AUTH=515371TBUKkcE2V69fffd1fP1
ACCEPT_ANY_OTP=false  (set to true for testing)
STATIC_OTP=123456
```

---

## Step 7: Real-time Debug Process

1. **Open terminal with backend logs:**
   ```bash
   docker logs learning-backend-1 -f
   ```

2. **Open another terminal:**
   ```bash
   # Clear recent OTP records
   docker exec -it <mysql_container> mysql -u root -proot grocery_mvp \
     -e "DELETE FROM otp_records WHERE phone = '8860152106' LIMIT 5;"
   ```

3. **Try OTP request from app/postman**

4. **Check logs for messages** - you'll see exactly what happened

---

## Quick Commands Summary

```bash
# Restart backend with fresh logs
docker restart learning-backend-1

# See only errors
docker logs learning-backend-1 | grep -i error

# See only OTP-related logs
docker logs learning-backend-1 | grep -i otp

# Follow logs in real-time
docker logs learning-backend-1 -f

# Get last 100 lines
docker logs learning-backend-1 --tail 100
```

---

## When Backend is Deployed (Production)

If using `https://api.orderkro.in`, you need server SSH access:

```bash
# SSH into server
ssh root@orderkro.in

# If using Docker on server
docker logs <container> -f

# If using systemd
journalctl -u backend -f
sudo tail -f /var/log/backend.log
```

---

## Next Steps

1. Start Docker backend locally
2. Run the logs command from Step 5
3. Try to request OTP from phone
4. Share the error from logs
5. I'll help identify the exact issue
