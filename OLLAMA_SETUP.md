# Ollama Setup Guide for LYNQ

## Overview
LYNQ now uses Ollama (Llama 3.2) as the primary AI service for dev/MVP. The fallback chain is:
**Gemini → Ollama → Grok → OpenAI**

If any service responds successfully, the system stops trying others and returns the result immediately.

---

## Step 1: Install Ollama

### Windows
1. Download Ollama from: https://ollama.com/download
2. Run the installer
3. Ollama will start automatically and run on `http://localhost:11434`

### macOS
```bash
brew install ollama
ollama serve
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

---

## Step 2: Pull Llama 3.2 Model

Open a terminal and run:
```bash
ollama pull llama3.2
```

This will download the Llama 3.2 model (approximately 2GB). Wait for it to complete.

**Verify installation:**
```bash
ollama list
```

You should see `llama3.2` in the list.

---

## Step 3: Test Ollama Locally

Test that Ollama is working:
```bash
ollama run llama3.2 "Hello, can you help me format text?"
```

If you get a response, Ollama is working correctly!

---

## Step 4: Configure Environment Variables

### For Local Development

Add to your `.env` file in `backend-api/`:
```env
# Ollama Configuration (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_ENABLED=true

# Other AI services (optional fallbacks)
GEMINI_API_KEY=your_gemini_key_here
XAI_API_KEY=your_grok_key_here
OPENAI_API_KEY=your_openai_key_here
```

### For Production Testing (with ngrok)

When using ngrok, you'll set:
```env
OLLAMA_BASE_URL=https://your-ngrok-url.ngrok.io
OLLAMA_MODEL=llama3.2
OLLAMA_ENABLED=true
```

---

## Step 5: Setup ngrok for Production Testing

### Install ngrok

1. Download from: https://ngrok.com/download
2. Extract and add to your PATH, or use the executable directly

### Start Ollama (if not already running)

```bash
ollama serve
```

### Expose Ollama via ngrok

In a new terminal, run:
```bash
ngrok http 11434
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:11434
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Update Environment Variables

Update your `.env` file:
```env
OLLAMA_BASE_URL=https://abc123.ngrok.io
OLLAMA_MODEL=llama3.2
OLLAMA_ENABLED=true
```

**Important:** If ngrok restarts, you'll get a new URL. Update `OLLAMA_BASE_URL` accordingly.

### Keep ngrok Running

- Keep the ngrok terminal window open while testing
- For production, consider using ngrok's paid plan for static URLs

---

## Step 6: Test the Integration

### Start Your Backend API

```bash
cd backend-api
uvicorn main:app --reload
```

### Test with a Simple Request

The system will automatically try:
1. **Gemini** (if configured)
2. **Ollama** (your local/ngrok instance) ← Primary for dev/MVP
3. **Grok** (if configured)
4. **OpenAI** (if configured)

### Check Logs

When you add a company or format text, you should see:
```
✓ Ollama responded successfully for analysis
```

This confirms Ollama is working!

---

## Troubleshooting

### Ollama Not Responding

1. **Check if Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should return a JSON list of models.

2. **Check if model is installed:**
   ```bash
   ollama list
   ```

3. **Restart Ollama:**
   ```bash
   # Stop: Ctrl+C in the terminal running ollama serve
   # Start: ollama serve
   ```

### ngrok Issues

1. **ngrok URL changed:** Update `OLLAMA_BASE_URL` in `.env`
2. **Connection timeout:** Make sure ngrok is still running
3. **HTTPS required:** Use the HTTPS URL from ngrok, not HTTP

### Model Not Found

If you see "model not found" errors:
```bash
ollama pull llama3.2
```

### Timeout Errors

Ollama can be slow on first request. The timeout is set to 60 seconds. If you consistently get timeouts:
- Check your system resources (CPU/RAM)
- Consider using a smaller model or upgrading hardware

---

## Production Deployment

For production, you have two options:

### Option 1: Keep Using ngrok (Testing)
- Use ngrok paid plan for static URLs
- Update `OLLAMA_BASE_URL` to your ngrok URL

### Option 2: Deploy Ollama on Your Server
- Install Ollama on your production server
- Expose port 11434 (or use a reverse proxy)
- Update `OLLAMA_BASE_URL` to your server URL

---

## Summary

✅ **What You Need to Do:**

1. Install Ollama: https://ollama.com/download
2. Pull Llama 3.2: `ollama pull llama3.2`
3. Test locally: `ollama run llama3.2 "test"`
4. Add to `.env`:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   OLLAMA_ENABLED=true
   ```
5. For production testing: Install ngrok and expose Ollama
6. Update `OLLAMA_BASE_URL` to your ngrok URL when using ngrok

**That's it!** The system will automatically use Ollama as the primary AI service for dev/MVP.

