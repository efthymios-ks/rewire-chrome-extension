#Requires -Version 7.2

<#
.SYNOPSIS
    Rebuilds the extension on every save and opens a browser profile that loads it.

.DESCRIPTION
    Makes sure Node.js and the npm packages are there through Invoke-Test.ps1
    -InstallOnly, starts the esbuild watcher, waits for the first build, then opens
    the browser with its own profile and --load-extension pointing at dist.

    Branded Chrome 137 and later ignores --load-extension. There, the first run
    shows chrome://extensions: turn on Developer mode, click "Load unpacked" and
    pick dist. The debug profile keeps it, so every run after that loads it on its
    own. Chromium and Chrome for Testing take the flag.

    After a rebuild, press the reload icon on the extension card. Inspect the
    side panel with right-click > Inspect, and the worker with the
    "service worker" link on the card. Source maps are on.

    Exit codes:
      0  the watcher stopped
      1  the first build failed
      3  Node.js, the npm packages or the browser are unavailable

.PARAMETER Browser
    Chrome, Edge or Chromium. Default Chrome.

.PARAMETER BrowserPath
    Explicit browser executable, for example Chrome for Testing. Wins over -Browser.

.PARAMETER Url
    Page to open next to the extensions page.

.PARAMETER ProfilePath
    Browser profile folder. Default .debug-profile beside this script.

.PARAMETER NoWatch
    Build once, open the browser, and return.

.EXAMPLE
    ./Start-Debug.ps1

.EXAMPLE
    ./Start-Debug.ps1 -Browser Edge -Url https://localhost:3000
#>

[CmdletBinding()]
param(
    [ValidateSet('Chrome', 'Edge', 'Chromium')]
    [string]$Browser = 'Chrome',

    [ValidateNotNullOrEmpty()]
    [string]$BrowserPath,

    [ValidateNotNullOrEmpty()]
    [string]$Url = 'https://httpbin.org/#/',

    [ValidateNotNullOrEmpty()]
    [string]$ProfilePath = (Join-Path -Path $PSScriptRoot -ChildPath '.debug-profile'),

    [switch]$NoWatch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:DistPath = Join-Path $PSScriptRoot 'dist'
$script:BuildScript = Join-Path $PSScriptRoot 'scripts/build.mjs'
$script:FirstBuildTimeoutInSeconds = 60
$script:PollIntervalInMilliseconds = 250

$script:WindowsBrowserPaths = @{
    Chrome   = 'Google\Chrome\Application\chrome.exe'
    Edge     = 'Microsoft\Edge\Application\msedge.exe'
    Chromium = 'Chromium\Application\chrome.exe'
}

$script:OtherBrowserPaths = @{
    Chrome   = @('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'google-chrome-stable')
    Edge     = @('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'microsoft-edge', 'microsoft-edge-stable')
    Chromium = @('/Applications/Chromium.app/Contents/MacOS/Chromium', 'chromium', 'chromium-browser')
}

function Exit-WithError {
    param(
        [Parameter(Mandatory)][string]$Message,
        [Parameter(Mandatory)][int]$ExitCode
    )

    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit $ExitCode
}

function Resolve-BrowserPath {
    if ($BrowserPath) {
        if (-not (Test-Path -LiteralPath $BrowserPath)) { Exit-WithError "Browser not found: $BrowserPath" 3 }
        return $BrowserPath
    }

    $roots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA) | Where-Object { $_ }
    $candidates = @($roots | ForEach-Object { Join-Path $_ $script:WindowsBrowserPaths[$Browser] }) + $script:OtherBrowserPaths[$Browser]

    foreach ($candidate in $candidates) {
        if ([System.IO.Path]::IsPathRooted($candidate) -and (Test-Path -LiteralPath $candidate)) { return $candidate }
        $command = Get-Command -Name $candidate -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { return $command.Source }
    }

    Exit-WithError "$Browser not found. Pass -BrowserPath." 3
}

function Wait-FirstBuild {
    param([Parameter(Mandatory)][datetime]$StartedAt)

    $marker = Join-Path $script:DistPath 'background.js'
    $deadline = (Get-Date).AddSeconds($script:FirstBuildTimeoutInSeconds)
    while ((Get-Date) -lt $deadline) {
        if ((Test-Path -LiteralPath $marker) -and (Get-Item -LiteralPath $marker).LastWriteTime -ge $StartedAt) { return }
        Start-Sleep -Milliseconds $script:PollIntervalInMilliseconds
    }

    Exit-WithError "No build within $($script:FirstBuildTimeoutInSeconds)s. Run: node scripts/build.mjs" 1
}

& (Join-Path $PSScriptRoot 'Invoke-Test.ps1') -InstallOnly | Out-Host
if ($LASTEXITCODE -ne 0) { Exit-WithError 'Node.js or the npm packages are not ready; see above.' 3 }

Push-Location -LiteralPath $PSScriptRoot
$watcher = $null
try {
    $browserExecutable = Resolve-BrowserPath
    $startedAt = Get-Date

    if ($NoWatch) {
        & node $script:BuildScript
        if ($LASTEXITCODE -ne 0) { Exit-WithError 'Build failed.' 1 }
    }
    else {
        $watcher = Start-Process -FilePath (Get-Command node).Source -ArgumentList "`"$script:BuildScript`" --watch" -NoNewWindow -PassThru
        Wait-FirstBuild -StartedAt $startedAt
    }

    $null = New-Item -ItemType Directory -Path $ProfilePath -Force
    $browserArguments = @(
        "--user-data-dir=`"$ProfilePath`""
        "--load-extension=`"$script:DistPath`""
        '--no-first-run'
        '--no-default-browser-check'
        'chrome://extensions'
        $Url
    )
    Start-Process -FilePath $browserExecutable -ArgumentList $browserArguments | Out-Null

    Write-Host ''
    Write-Host "Browser:   $browserExecutable" -ForegroundColor Cyan
    Write-Host "Profile:   $ProfilePath" -ForegroundColor DarkGray
    Write-Host "Extension: $script:DistPath" -ForegroundColor DarkGray
    Write-Host 'Not listed in chrome://extensions? Developer mode > Load unpacked > pick the folder above. Once per profile.' -ForegroundColor Yellow
    Write-Host 'Click the toolbar icon to open the side panel.' -ForegroundColor DarkGray

    if ($NoWatch) { exit 0 }

    Write-Host 'Watching for changes. Reload the extension card after each rebuild. Ctrl+C stops.' -ForegroundColor Cyan
    $watcher.WaitForExit()
    exit 0
}
finally {
    if ($watcher -and -not $watcher.HasExited) { Stop-Process -Id $watcher.Id -Force }
    Pop-Location
}
