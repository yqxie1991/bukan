<#
  install-gh.ps1 - a wizard that walks you, step by step, through installing
  the GitHub CLI (gh) on this Windows machine.

  Official home: https://cli.github.com/   Source: https://github.com/cli/cli

  Run it from PowerShell:
      pwsh -NoProfile -File .\scripts\install-gh.ps1

  Everything above the STAGES marker is the wizard library: do not hand-edit
  it. Author the per-step stages below the marker.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

$script:TotalStages = 0
$script:StageIndex  = 0
$script:Done        = [System.Collections.Generic.List[string]]::new()
$script:Skipped     = [System.Collections.Generic.List[string]]::new()

function Test-Interactive {
  try { return -not [System.Console]::IsOutputRedirected } catch { return $true }
}

# Clear-HostFrame wipes the screen so only the current step is on screen.
# No-op when output isn't a terminal, so piped logs stay readable.
function Clear-HostFrame {
  if (Test-Interactive) { Clear-Host }
}

function Write-Banner {
  param([string]$Title, [string[]]$Lines)
  Clear-HostFrame
  Write-Host ""
  Write-Host "  $Title" -ForegroundColor Cyan
  Write-Host "  $script:TotalStages stages" -ForegroundColor DarkGray
  Write-Host ""
  foreach ($line in $Lines) { Write-Host "  $line" -ForegroundColor DarkGray }
  Write-Host ""
  Wait-Continue "Ready to start?"
}

# Start-Stage clears the screen, then announces a stage and shows progress.
function Start-Stage {
  param([string]$Name)
  Clear-HostFrame
  $script:StageIndex++
  Write-Host ""
  Write-Host "  ▸ Stage $script:StageIndex/$script:TotalStages · $Name" -ForegroundColor Cyan
}

function Write-Say  { param([string]$Text) Write-Host "  $Text" }
function Write-Step { param([string]$Text) Write-Host "  • $Text" -ForegroundColor Blue }
function Write-Note { param([string]$Text) Write-Host "  $Text" -ForegroundColor DarkGray }
function Write-Warn { param([string]$Text) Write-Host "  ⚠ $Text" -ForegroundColor Yellow }
function Write-Ok   { param([string]$Text) Write-Host "  ✓ $Text" -ForegroundColor Green }

# Open-Url opens it in the human's default browser.
function Open-Url {
  param([string]$Url)
  Write-Host "  ↗ opening $Url" -ForegroundColor Green
  try {
    Start-Process $Url | Out-Null
  } catch {
    Write-Warn "couldn't open a browser, so visit it manually: $Url"
  }
}

# Wait-Continue waits for the human to confirm they've done the manual part.
function Wait-Continue {
  param([string]$Message = 'Press Enter to continue')
  Write-Host "  $Message " -ForegroundColor DarkGray -NoNewline
  [void](Read-Host)
}

# Confirm-Gate is a y/N gate; returns $true on yes.
function Confirm-Gate {
  param([string]$Question)
  Write-Host "  ? $Question [y/N] " -ForegroundColor Yellow -NoNewline
  $reply = Read-Host
  return ($reply -match '^[Yy]')
}

# Ask-Secret reads hidden input (for tokens); Enter keeps the current value.
function Ask-Secret {
  param([string]$Prompt, [string]$Current)
  if ($Current) {
    Write-Host "  $Prompt [Enter keeps current] " -NoNewline
  } else {
    Write-Host "  $Prompt " -NoNewline
  }
  $secure = Read-Host -AsSecureString
  $plain  = [System.Net.NetworkCredential]::new('', $secure).Password
  if ([string]::IsNullOrEmpty($plain) -and $Current) { return $Current }
  return $plain
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES: author this section. One Start-Stage per step the human takes.
# ──────────────────────────────────────────────────────────────────────────

$script:WorkDir = Join-Path ([System.IO.Path]::GetTempPath()) 'gh-cli-install'
$script:GhExe   = $null

# Resolve-Gh finds a usable gh.exe: current PATH first, then the default
# MSI/winget install location. Returns the full path or $null.
function Resolve-Gh {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and (Test-Path $cmd.Source)) { return $cmd.Source }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'GitHub CLI\gh.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'GitHub CLI\gh.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\GitHub CLI\gh.exe')
  )
  foreach ($path in $candidates) {
    if ($path -and (Test-Path $path)) { return $path }
  }
  return $null
}

function Invoke-Gh {
  param([string[]]$Arguments)
  if (-not $script:GhExe) { throw 'gh.exe not resolved yet' }
  & $script:GhExe @Arguments 2>&1
}

# Get-GhVersion returns the version string, or $null.
function Get-GhVersion {
  param([string]$Path)
  if (-not $Path) { return $null }
  try {
    $out = & $Path --version 2>&1 | Select-Object -First 1
    if ("$out" -match 'gh version\s+([0-9][0-9.]*)') { return $Matches[1] }
  } catch {}
  return $null
}

# Use-Tls12 puts the modern protocols first; older PowerShell defaults to TLS 1.0
# and GitHub then refuses the handshake.
function Use-Tls12 {
  try {
    [Net.ServicePointManager]::SecurityProtocol = `
      [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
  } catch {}
}

# Get-LatestRelease fetches the latest cli/cli release. Returns $null when the
# GitHub API is unreachable, so the caller can fall back to a pinned version.
function Get-LatestRelease {
  Use-Tls12
  $headers = @{ 'User-Agent' = 'dsh-gh-wizard' }
  try {
    return Invoke-RestMethod -Uri 'https://api.github.com/repos/cli/cli/releases/latest' `
      -Headers $headers -TimeoutSec 45
  } catch {
    Write-Note "GitHub API unreachable: $($_.Exception.Message)"
    return $null
  }
}

# Get-ReleaseAssets fetches one release's asset list without the "latest" API.
function Get-ReleaseAssets {
  param([string]$Tag)
  Use-Tls12
  $headers = @{ 'User-Agent' = 'dsh-gh-wizard' }
  try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/cli/cli/releases/tags/${Tag}" `
      -Headers $headers -TimeoutSec 45
    return $release.assets
  } catch {
    Write-Note "could not list assets for ${Tag}: $($_.Exception.Message)"
    return $null
  }
}

# Install-ViaWinget tries the package manager. Returns $true when gh resolves
# afterwards. Handles a wedged App Installer by repairing it once.
function Install-ViaWinget {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Note "winget is not on PATH - skipping straight to the MSI route."
    return $false
  }

  Write-Note "running: winget install --id GitHub.cli --exact --source winget"
  try {
    & $winget.Source install --id GitHub.cli --exact --source winget `
      --accept-source-agreements --accept-package-agreements 2>&1 |
      ForEach-Object { Write-Note "    $_" }
    $code = $LASTEXITCODE
  } catch {
    Write-Note "winget threw: $($_.Exception.Message)"
    $code = -1
  }

  if ($code -eq 0 -and (Resolve-Gh)) { return $true }

  # 0x8A150001 and friends mean the App Installer itself is the problem, not
  # our package. One repair attempt, then give up on winget.
  Write-Warn ("winget did not deliver gh (exit {0}) - repairing App Installer once..." -f $code)
  try {
    & $winget.Source install --id Microsoft.AppInstaller --exact --source winget `
      --accept-source-agreements --accept-package-agreements 2>&1 |
      ForEach-Object { Write-Note "    $_" }
  } catch {
    Write-Note "App Installer repair threw: $($_.Exception.Message)"
  }

  if (-not (Confirm-Gate "Retry 'winget install GitHub.cli' once more?")) {
    Write-Note "skipping the winget retry."
    return $false
  }

  try {
    & $winget.Source install --id GitHub.cli --exact --source winget `
      --accept-source-agreements --accept-package-agreements 2>&1 |
      ForEach-Object { Write-Note "    $_" }
  } catch {
    Write-Note "winget retry threw: $($_.Exception.Message)"
  }

  return [bool](Resolve-Gh)
}

# Install-ViaMsi downloads the official MSI from the GitHub release, checks it
# against the published SHA256, and installs it (UAC prompt appears here).
# Never throws: a network dead end is reported and recorded as a manual step.
function Install-ViaMsi {
  # Pinned fallback, used when the GitHub API itself is unreachable. Bump this
  # when a newer release matters more than offline resilience.
  $fallbackVersion = '2.102.0'

  $arch = switch ($env:PROCESSOR_ARCHITECTURE) {
    'ARM64' { 'arm64' }
    'x86'   { '386' }
    default { 'amd64' }
  }

  try {
    New-Item -ItemType Directory -Path $script:WorkDir -Force | Out-Null

    Write-Step "Looking up the latest GitHub CLI release..."
    $release = Get-LatestRelease

    $version = if ($release) { $release.tag_name } else { "v$fallbackVersion" }
    $ver     = $version.TrimStart('v')
    $msiName   = "gh_${ver}_windows_$arch.msi"
    $sumsName  = "gh_${ver}_checksums.txt"
    $baseUrl   = "https://github.com/cli/cli/releases/download/$version"
    $msiUrl    = "$baseUrl/$msiName"
    $sumsUrl   = "$baseUrl/$sumsName"

    if ($release) {
      $msiAsset = $release.assets | Where-Object { $_.name -eq $msiName } | Select-Object -First 1
      if ($msiAsset) { $msiUrl = $msiAsset.browser_download_url }
      Write-Ok "latest release is $version"
    } else {
      Write-Warn "no API access - falling back to the pinned release $version"
    }

    $msiPath  = Join-Path $script:WorkDir $msiName
    $sumsPath = Join-Path $script:WorkDir $sumsName

    Write-Step "Downloading $msiName ..."
    Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -TimeoutSec 600 -UseBasicParsing

    $expected = $null
    try {
      Write-Step "Downloading the published checksums..."
      Invoke-WebRequest -Uri $sumsUrl -OutFile $sumsPath -TimeoutSec 120 -UseBasicParsing
      $line = Select-String -Path $sumsPath -SimpleMatch $msiName | Select-Object -First 1
      if ($line) { $expected = ($line.Line -split '\s+')[0].ToLower() }
    } catch {
      Write-Note "checksums unavailable: $($_.Exception.Message)"
    }

    if ($expected) {
      $actual = (Get-FileHash -Path $msiPath -Algorithm SHA256).Hash.ToLower()
      if ($actual -ne $expected) {
        Write-Warn "SHA256 MISMATCH for $msiName - refusing to install it."
        Write-Note "expected $expected"
        Write-Note "got      $actual"
        $script:Skipped.Add("downloaded MSI failed hash verification; download it by hand")
        return $false
      }
      Write-Ok "SHA256 verified against the release checksums"
    } else {
      Write-Warn "no checksum to compare against - installing unverified"
    }

    if (-not (Confirm-Gate "Install $msiName now? (a UAC prompt will appear)")) {
      Write-Note "left the installer at: $msiPath"
      $script:Skipped.Add("run the installer yourself: $msiPath")
      return $false
    }

    $log = Join-Path $script:WorkDir 'msiexec.log'
    Write-Step "Running msiexec (approve the UAC prompt)..."
    $proc = Start-Process -FilePath 'msiexec.exe' `
      -ArgumentList @('/i', "`"$msiPath`"", '/norestart', '/passive', '/l*v', "`"$log`"") `
      -Wait -PassThru

    if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
      Write-Warn "msiexec exited $($proc.ExitCode); see $log"
      $script:Skipped.Add("MSI install returned $($proc.ExitCode) - inspect $log")
      return $false
    }
    if ($proc.ExitCode -eq 3010) { Write-Warn "installer asked for a reboot to finish" }

    return [bool](Resolve-Gh)
  } catch {
    Write-Warn "MSI route failed: $($_.Exception.Message)"
    $script:Skipped.Add("download https://github.com/cli/cli/releases/latest and run the windows_$arch MSI by hand")
    return $false
  }
}

$script:TotalStages = 5

Write-Banner -Title "GitHub CLI (gh) install" -Lines @(
  'This wizard installs the GitHub CLI on this Windows machine, verifies it,',
  'and optionally signs you in. You drive the UAC prompt and the browser;',
  'everything else is automated. Stop any time with Ctrl-C and re-run later.'
)

# ── Stage 1: where we start from ──────────────────────────────────────────
Start-Stage "Current state"
$existing = Resolve-Gh
if ($existing) {
  $script:GhExe = $existing
  $version = Get-GhVersion -Path $existing
  Write-Ok "gh is already installed: $existing"
  if ($version) { Write-Note "version $version" }
  Write-Note "nothing to install - the remaining stages just verify and sign in."
} else {
  Write-Say "No gh.exe found on PATH or in the default install locations."
  Write-Note "Windows architecture: $env:PROCESSOR_ARCHITECTURE"
  Write-Note "winget present:       $([bool](Get-Command winget -ErrorAction SilentlyContinue))"
  Write-Note "Git for Windows:      $([bool](Get-Command git -ErrorAction SilentlyContinue))"
}
Wait-Continue

# ── Stage 2: install ──────────────────────────────────────────────────────
Start-Stage "Install GitHub CLI"
if ($existing) {
  Write-Ok "already installed - skipping."
} else {
  Write-Say "Two routes, in order. Route A is the official package manager; if your"
  Write-Note "App Installer is outdated or wedged (winget exits with 0x8A150001),"
  Write-Note "Route B installs the same official MSI, hash-verified, without winget."
  Write-Host ""
  Write-Step "Route A - winget:"
  $ok = Install-ViaWinget

  if ($ok) {
    Write-Ok "winget installed GitHub CLI"
  } else {
    Write-Host ""
    Write-Step "Route B - official MSI from the GitHub release:"
    $ok = Install-ViaMsi
    if ($ok) { Write-Ok "MSI installed GitHub CLI" }
  }

  if ($ok) {
    $script:GhExe = Resolve-Gh
    $script:Done.Add("installed GitHub CLI at $script:GhExe")
  } else {
    Write-Warn "both routes failed."
    Open-Url "https://github.com/cli/cli/releases/latest"
    Write-Say "Download the windows MSI by hand, run it, then re-run this wizard -"
    Write-Note "or ask the agent to pick it up from here."
    $script:Skipped.Add("gh is still not installed; both automated routes failed")
  }
}
Wait-Continue

# ── Stage 3: verify in this session ───────────────────────────────────────
Start-Stage "Verify"
if (-not $script:GhExe) { $script:GhExe = Resolve-Gh }
if ($script:GhExe) {
  $version = Get-GhVersion -Path $script:GhExe
  Write-Ok "gh $version - $script:GhExe"

  $ghDir  = Split-Path -Parent $script:GhExe
  $onPath = ($env:PATH -split ';') -contains $ghDir
  if ($onPath) {
    Write-Ok "its folder is already on this session's PATH"
  } else {
    Write-Say "This session started before gh existed, so add it now:"
    Write-Host ""
    Write-Host "    `$env:PATH = `"$ghDir;`$env:PATH`"" -ForegroundColor White
    Write-Host ""
    Write-Note "New terminals pick it up automatically; only this one needs that line."
  }

  Write-Host ""
  Write-Note "optional, one line each:"
  Write-Note "  gh auth setup-git        # use gh as git's credential helper"
  Write-Note "  gh config set git_protocol ssh"
} else {
  Write-Warn "still no gh.exe - Stage 2 did not land."
}
Wait-Continue

# ── Stage 4: sign in (optional) ───────────────────────────────────────────
Start-Stage "Sign in (optional)"
$signedIn = $false
if ($script:GhExe) {
  try {
    & $script:GhExe auth status 2>&1 | Out-Null
    $signedIn = ($LASTEXITCODE -eq 0)
  } catch { $signedIn = $false }
}

if (-not $script:GhExe) {
  Write-Warn "no gh to sign in with - skipping."
} elseif ($signedIn) {
  Write-Ok "already signed in:"
  Invoke-Gh @('auth','status') | ForEach-Object { Write-Note "    $_" }
} elseif (Confirm-Gate "Sign in to GitHub now? (opens your browser)") {
  Open-Url "https://github.com/login/device"
  Write-Say "GitHub shows a one-time code. Choose:"
  Write-Step "GitHub.com"
  Write-Step "HTTPS"
  Write-Step "Login with a web browser  (or paste a token instead)"
  Write-Note "The device code and the remaining prompts are handled by gh itself."
  Write-Host ""
  & $script:GhExe auth login
  Write-Host ""
  if ($LASTEXITCODE -eq 0) { Write-Ok "signed in" } else { Write-Warn "gh auth login exited $LASTEXITCODE" }
} else {
  Write-Note "skipped - run 'gh auth login' whenever you want."
  $script:Skipped.Add("sign in to GitHub: gh auth login")
}
Wait-Continue

# ── Stage 5: finish ───────────────────────────────────────────────────────
Start-Stage "Summary"
if ($script:GhExe) {
  Clear-HostFrame
  Write-Host ""
  Write-Host "  ✓ Done" -ForegroundColor Green
  Write-Note "gh: $script:GhExe  ($(Get-GhVersion -Path $script:GhExe))"
  foreach ($item in $script:Done) { Write-Note "done: $item" }
  if ($script:Skipped.Count) {
    Write-Host ""
    Write-Warn "still to do by hand:"
    foreach ($item in $script:Skipped) { Write-Note "  - $item" }
  }
  Write-Host ""
  Write-Note "Docs: https://cli.github.com/manual/"
} else {
  Write-Host ""
  Write-Warn "Not installed. Re-run this wizard after fixing the installer problem."
}

# Non-zero when the job didn't get done, so a wrapper script can tell.
$script:GhExe = Resolve-Gh
Write-Host ""
if (-not $script:GhExe) { exit 1 }
