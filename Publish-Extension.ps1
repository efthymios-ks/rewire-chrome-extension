#Requires -Version 5.1

<#
.SYNOPSIS
    Tests, builds and packages the extension for manual upload to the Chrome Web Store.

.DESCRIPTION
    Checks the version first: it must look like 1.2.3, without leading zeros, and be
    higher than the one in public/manifest.json, compared number by number (1.0.10 is
    higher than 1.0.9), because the Chrome Web Store takes each upload only with a
    higher version than the last. A package already in the output folder for that
    version stops the script too, unless -Force is passed.

    Then runs Invoke-Test.ps1, which also makes sure Node.js and the npm packages
    are there, and stops on a red suite, so a failing test never produces a
    package. Writes the version into public/manifest.json (the source of truth),
    builds dist, copies the result into <OutputPath>/Rewire-<version>/ without
    source maps, zips the same content into <OutputPath>/Rewire-<version>.zip and
    checks the zip.

    Called without -Version, the script prints the version from
    public/manifest.json and prompts for the next one, suggesting the next patch.

    Supports -WhatIf and -Confirm: -WhatIf checks the version and the output
    folder, then reports what it would do without testing, stamping, building or
    packaging.

    Upload the zip by hand in the Chrome Web Store developer dashboard.

    Exit codes:
      0  packaged, or nothing done under -WhatIf
      1  the version is invalid or not higher, the package exists without -Force,
         or a step failed

.PARAMETER Version
    Version to stamp, as 1.2.3; must be higher than the one in public/manifest.json.
    If omitted, the script prompts.

.PARAMETER OutputPath
    Where the folder and zip go. Default the artifacts folder beside this script.

.PARAMETER SkipTests
    Package without the suite. Node.js and the npm packages are still installed
    when missing.

.PARAMETER Force
    Replace an existing folder and zip for the same version. Without it, an
    existing package stops the script before anything runs.

.EXAMPLE
    ./Publish-Extension.ps1

.EXAMPLE
    ./Publish-Extension.ps1 -Version 1.0.1

.EXAMPLE
    ./Publish-Extension.ps1 -Version 1.0.1 -Force

.EXAMPLE
    ./Publish-Extension.ps1 -Version 1.0.1 -WhatIf
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Position = 0)]
    [string]$Version,

    [string]$OutputPath,

    [switch]$SkipTests,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# powershell.exe -File leaves $PSScriptRoot empty in the param defaults of an advanced script.
if (-not $OutputPath) { $OutputPath = Join-Path $PSScriptRoot 'artifacts' }

$script:PackageName = 'Rewire'
$script:DistPath = Join-Path $PSScriptRoot 'dist'
$script:SourceManifestPath = Join-Path $PSScriptRoot 'public/manifest.json'
# Three numbers without leading zeros, which the store refuses.
$script:VersionPattern = '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$'
# What the store accepts in a manifest: one to four dot-separated numbers.
$script:ManifestVersionPattern = '^\d+(\.\d+){0,3}$'
# The value of the manifest's "version" property, without its quotes.
$script:ManifestVersionValuePattern = '(?<="version"\s*:\s*")[^"]*'
$script:ExcludedExtensions = @('.map')
$script:RequiredEntries = @(
    'manifest.json'
    'background.js'
    'sidepanel/index.html'
    'sidepanel/main.js'
    'sidepanel/app.css'
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
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json).version
}

# Replaces only the version value, so the rest of the file keeps its formatting; a ConvertTo-Json
# round trip on Windows PowerShell 5.1 re-indents the file and escapes characters such as < and >.
function Set-ManifestVersion {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$NewVersion
    )

    $text = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    $versionValue = [regex]$script:ManifestVersionValuePattern
    if (-not $versionValue.IsMatch($text)) { Exit-WithError "no version property in $Path" }
    $updated = $versionValue.Replace($text, $NewVersion, 1)
    [System.IO.File]::WriteAllText($Path, $updated, (New-Object System.Text.UTF8Encoding $false))
}

# -1, 0 or 1 as $Left is lower than, equal to or higher than $Right, number by number;
# a missing trailing number counts as 0. Both are dot-separated numbers.
function Compare-Version {
    param(
        [Parameter(Mandatory)][string]$Left,
        [Parameter(Mandatory)][string]$Right
    )

    $leftParts = @($Left -split '\.' | ForEach-Object { [long]$_ })
    $rightParts = @($Right -split '\.' | ForEach-Object { [long]$_ })
    $length = [math]::Max($leftParts.Count, $rightParts.Count)
    for ($index = 0; $index -lt $length; $index++) {
        $leftPart = 0
        $rightPart = 0
        if ($index -lt $leftParts.Count) { $leftPart = $leftParts[$index] }
        if ($index -lt $rightParts.Count) { $rightPart = $rightParts[$index] }
        if ($leftPart -ne $rightPart) { return [math]::Sign($leftPart - $rightPart) }
    }
    return 0
}

function Get-SuggestedNextVersion {
    param([Parameter(Mandatory)][string]$CurrentVersion)

    if ($CurrentVersion -notmatch $script:VersionPattern) { return '' }
    $parts = $CurrentVersion -split '\.'
    return "{0}.{1}.{2}" -f $parts[0], $parts[1], ([int]$parts[2] + 1)
}

# $Path below $BasePath, as [System.IO.Path]::GetRelativePath gives it; .NET Framework has
# no such method. $Path is a full path; one outside $BasePath comes back whole.
function Get-RelativePath {
    param(
        [Parameter(Mandatory)][string]$BasePath,
        [Parameter(Mandatory)][string]$Path
    )

    $base = (Convert-Path -LiteralPath $BasePath).TrimEnd('\', '/')
    $full = $Path.TrimEnd('\', '/')
    if ($full -eq $base) { return '.' }
    if (-not $full.StartsWith("$base\", [System.StringComparison]::OrdinalIgnoreCase)) { return $full }
    return $full.Substring($base.Length + 1)
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
        $relative = Get-RelativePath -BasePath $SourcePath -Path $file.FullName
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
            $entryName = (Get-RelativePath -BasePath $SourcePath -Path $file.FullName) -replace '\\', '/'
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

# Windows PowerShell 5.1 does not load the zip types on its own.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

# --- version --------------------------------------------------------------------

if (-not (Test-Path -LiteralPath $script:SourceManifestPath)) {
    Exit-WithError "source manifest not found at $script:SourceManifestPath"
}
$currentVersion = Get-ManifestVersion -Path $script:SourceManifestPath

Write-Host ''
Write-Host "$script:PackageName" -ForegroundColor White
Write-Note "manifest version: $currentVersion"

if (-not $Version) {
    $suggested = Get-SuggestedNextVersion -CurrentVersion $currentVersion
    $prompt = if ($suggested) { "Next version [press Enter for $suggested]" } else { "Next version (as 1.2.3)" }
    $entered = Read-Host $prompt
    $Version = if ([string]::IsNullOrWhiteSpace($entered)) { $suggested } else { $entered.Trim() }
}

if ($Version -notmatch $script:VersionPattern) {
    Exit-WithError "version '$Version' is not valid; use 1.2.3"
}
if ($currentVersion -notmatch $script:ManifestVersionPattern) {
    Exit-WithError "public/manifest.json has version '$currentVersion'; the store takes 1 to 4 dot-separated numbers"
}
if ((Compare-Version -Left $Version -Right $currentVersion) -le 0) {
    Exit-WithError "version $Version is not higher than $currentVersion in public/manifest.json; the store needs a higher version than the last upload"
}
Write-Host "   next version: $Version" -ForegroundColor White

$folderPath = Join-Path $OutputPath "$script:PackageName-$Version"
$zipPath = Join-Path $OutputPath "$script:PackageName-$Version.zip"
$existing = @(@($folderPath, $zipPath) | Where-Object { Test-Path -LiteralPath $_ })
if ($existing.Count -gt 0 -and -not $Force) {
    Exit-WithError "a $Version package exists ($($existing -join ', ')); pass -Force to replace it"
}

if (-not $PSCmdlet.ShouldProcess($folderPath, "Test, stamp public/manifest.json with $Version, build and package")) {
    exit 0
}

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

Write-Step "package -> $folderPath (+ .zip)"

# Only -Force gets this far with an existing package; the check above stops the rest.
foreach ($target in @($folderPath, $zipPath)) {
    if (-not (Test-Path -LiteralPath $target)) { continue }
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Note "replaced $target (-Force)"
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
