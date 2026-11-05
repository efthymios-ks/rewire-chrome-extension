#Requires -Version 7.2

<#
.SYNOPSIS
    Tests, builds and packages the extension for manual upload to the Chrome Web Store.

.DESCRIPTION
    Runs Invoke-Test.ps1 first, which also makes sure Node.js and the npm packages
    are there, and stops on a red suite, so a failing test can never produce a
    package. Writes the new version into public/manifest.json (the source of truth),
    builds dist, copies the result into artifacts/Rewire-<version>/ without source
    maps, and zips the same content into artifacts/Rewire-<version>.zip.

    Called without -Version, the script prints the current version from
    public/manifest.json and prompts for the new one, suggesting the next patch.

    Upload the zip by hand in the Chrome Web Store developer dashboard. The store
    only takes dot-separated numbers and each upload needs a higher version than
    the previous one.

    Exit codes:
      0  packaged
      1  a step failed

.PARAMETER Version
    Version to stamp, as 1.2.3. If omitted, the script prompts.

.PARAMETER OutputPath
    Where the folder and zip go. Default .\artifacts.

.PARAMETER SkipTests
    Package without the suite.

.PARAMETER Force
    Overwrite the existing versioned folder and zip.

.EXAMPLE
    ./Publish-Extension.ps1

.EXAMPLE
    ./Publish-Extension.ps1 -Version 1.0.1 -Force
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Position = 0)]
    [string]$Version,

    [string]$OutputPath = (Join-Path $PSScriptRoot 'artifacts'),

    [switch]$SkipTests,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:PackageName = 'Rewire'
$script:DistPath = Join-Path $PSScriptRoot 'dist'
$script:SourceManifestPath = Join-Path $PSScriptRoot 'public' 'manifest.json'
$script:VersionPattern = '^\d+\.\d+\.\d+$'
$script:ExcludedExtensions = @('.map')
$script:RequiredEntries = @(
    'manifest.json'
    'background.js'
    'sidepanel/index.html'
    'sidepanel/main.js'
    'sidepanel/styles.css'
)

function Write-Step {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host ''
    Write-Host "== $Message" -ForegroundColor Cyan
}

function Write-Good {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "   [ok]   $Message" -ForegroundColor Green
}

function Write-Note {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "          $Message" -ForegroundColor DarkGray
}

function Exit-WithError {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "   [fail] $Message" -ForegroundColor Red
    exit 1
}

function Invoke-Native {
    param(
        [Parameter(Mandatory)][string]$Description,
        [Parameter(Mandatory)][scriptblock]$Command
    )

    & $Command | Out-Host
    if ($LASTEXITCODE -ne 0) { Exit-WithError "$Description failed (exit $LASTEXITCODE)" }
}

function Get-ManifestVersion {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json).version
}

function Set-ManifestVersion {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$NewVersion
    )

    $manifest = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $manifest.version = $NewVersion
    Set-Content -LiteralPath $Path -Value ($manifest | ConvertTo-Json -Depth 10) -Encoding utf8NoBOM
}

function Get-SuggestedNextVersion {
    param([Parameter(Mandatory)][string]$CurrentVersion)

    if ($CurrentVersion -notmatch $script:VersionPattern) { return '' }
    $parts = $CurrentVersion -split '\.'
    return "{0}.{1}.{2}" -f $parts[0], $parts[1], ([int]$parts[2] + 1)
}

function Copy-ExtensionFolder {
    param(
        [Parameter(Mandatory)][string]$SourcePath,
        [Parameter(Mandatory)][string]$DestinationPath
    )

    $null = New-Item -ItemType Directory -Path $DestinationPath -Force
    $files = Get-ChildItem -LiteralPath $SourcePath -Recurse -File |
        Where-Object { $script:ExcludedExtensions -notcontains $_.Extension }

    foreach ($file in $files) {
        $relative = [System.IO.Path]::GetRelativePath($SourcePath, $file.FullName)
        $target = Join-Path $DestinationPath $relative
        $null = New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    }

    return @($files).Count
}

function New-ExtensionZip {
    param(
        [Parameter(Mandatory)][string]$SourcePath,
        [Parameter(Mandatory)][string]$ZipPath
    )

    $zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in Get-ChildItem -LiteralPath $SourcePath -Recurse -File) {
            $entryName = [System.IO.Path]::GetRelativePath($SourcePath, $file.FullName) -replace '\\', '/'
            $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip,
                $file.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    }
    finally {
        $zip.Dispose()
    }
}

function Test-ExtensionZip {
    param(
        [Parameter(Mandatory)][string]$ZipPath,
        [Parameter(Mandatory)][string]$ExpectedVersion
    )

    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entryNames = @($zip.Entries | ForEach-Object FullName)
        $manifestEntry = $zip.GetEntry('manifest.json')
        if (-not $manifestEntry) { Exit-WithError 'manifest.json is not at the zip root' }

        $reader = [System.IO.StreamReader]::new($manifestEntry.Open())
        try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json }
        finally { $reader.Dispose() }

        $iconEntries = @($manifest.icons.PSObject.Properties.Value)
        $missing = @($script:RequiredEntries + $iconEntries | Where-Object { $entryNames -notcontains $_ })
        if ($missing.Count -gt 0) { Exit-WithError "missing from the zip: $($missing -join ', ')" }
        if ($manifest.version -ne $ExpectedVersion) { Exit-WithError "manifest says $($manifest.version), expected $ExpectedVersion" }
        if (@($entryNames | Where-Object { $_ -like '*.map' }).Count -gt 0) { Exit-WithError 'source maps leaked into the zip' }
    }
    finally {
        $zip.Dispose()
    }
}

# --- version --------------------------------------------------------------------

if (-not (Test-Path -LiteralPath $script:SourceManifestPath)) {
    Exit-WithError "source manifest not found at $script:SourceManifestPath"
}
$currentVersion = Get-ManifestVersion -Path $script:SourceManifestPath

Write-Host ''
Write-Host "$script:PackageName" -ForegroundColor White
Write-Note "current version: $currentVersion"

if (-not $Version) {
    $suggested = Get-SuggestedNextVersion -CurrentVersion $currentVersion
    $prompt = if ($suggested) { "New version [press Enter for $suggested]" } else { "New version (as 1.2.3)" }
    $entered = Read-Host $prompt
    $Version = if ([string]::IsNullOrWhiteSpace($entered)) { $suggested } else { $entered.Trim() }
}

if ($Version -notmatch $script:VersionPattern) {
    Exit-WithError "version '$Version' is not valid; use 1.2.3"
}
if ($Version -eq $currentVersion) {
    Exit-WithError "version '$Version' matches the current one; the store needs a higher number than the last upload"
}
Write-Host "   new version: $Version" -ForegroundColor White

# --- tests ----------------------------------------------------------------------

Write-Step 'tests'

$testRunner = Join-Path $PSScriptRoot 'Invoke-Test.ps1'
if ($SkipTests) {
    & $testRunner -InstallOnly | Out-Host
    if ($LASTEXITCODE -ne 0) { Exit-WithError "Node.js or the npm packages are not ready (exit $LASTEXITCODE)" }
    Write-Note 'skipped (-SkipTests), packaging only'
}
else {
    & $testRunner -Output None | Out-Host
    if ($LASTEXITCODE -ne 0) { Exit-WithError "tests failed (exit $LASTEXITCODE), nothing was packaged" }
    Write-Good 'suite green'
}

# --- build ----------------------------------------------------------------------

Write-Step 'build'

Set-ManifestVersion -Path $script:SourceManifestPath -NewVersion $Version
Write-Good "public/manifest.json stamped $Version"

Push-Location -LiteralPath $PSScriptRoot
try {
    Invoke-Native 'build' { node scripts/build.mjs }
}
finally {
    Pop-Location
}
Write-Good 'dist built'

# --- package --------------------------------------------------------------------

$folderPath = Join-Path $OutputPath "$script:PackageName-$Version"
$zipPath = Join-Path $OutputPath "$script:PackageName-$Version.zip"
Write-Step "package -> $folderPath (+ .zip)"

foreach ($target in @($folderPath, $zipPath)) {
    if (-not (Test-Path -LiteralPath $target)) { continue }
    if (-not ($Force -or $PSCmdlet.ShouldProcess($target, 'Overwrite existing package'))) {
        Exit-WithError 'package exists; pass -Force to overwrite'
    }
    Remove-Item -LiteralPath $target -Recurse -Force
}
$null = New-Item -ItemType Directory -Path $OutputPath -Force

$fileCount = Copy-ExtensionFolder -SourcePath $script:DistPath -DestinationPath $folderPath
Write-Good "folder: $fileCount files"

New-ExtensionZip -SourcePath $folderPath -ZipPath $zipPath
Write-Good "zip:    $((Get-Item -LiteralPath $zipPath).Length) bytes"

Test-ExtensionZip -ZipPath $zipPath -ExpectedVersion $Version
Write-Good 'manifest, entry points and icons present; no source maps'

Write-Host ''
Write-Host "Packaged $script:PackageName $Version" -ForegroundColor Green
Write-Note "upload: $zipPath"
Write-Note '        chrome.google.com/webstore/devconsole -> this item -> Package -> Upload new package'
Write-Host ''
exit 0
