#Requires -Version 5.1

<#
.SYNOPSIS
    Zips the repo's source, leaving out everything git ignores.

.DESCRIPTION
    Zips every file git would commit: tracked and untracked files, minus everything the ignore
    rules exclude, so node_modules, dist, artifacts, .debug-profile, *.log and *.zip files never
    go in. Nothing in the repo is deleted or changed. The git history (the .git folder) stays out.

    The zip is written next to this script as Rewire.zip, replacing the previous one,
    with one top folder named after the repo. Git ignores zip files, so it never ends up in a
    commit or in the next zip. When git is missing or can't list the files, the same folders
    are left out by name.

    Runs on Windows PowerShell 5.1 and PowerShell 7. Started from Explorer, it waits for Enter
    before the window closes.

    Exit codes:
      0  zipped
      1  a step failed

.EXAMPLE
    .\Compress-Source.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Root = $PSScriptRoot.TrimEnd('\')
$script:ZipPath = Join-Path $script:Root 'rewire-chrome-extension.zip'
# Left out of the zip by name when git can't say what it ignores; mirrors .gitignore.
$script:FallbackExcludedFolders = @('node_modules', 'dist', 'artifacts', '.debug-profile', '.git')
$script:FallbackExcludedPatterns = @('*.log', '*.zip', 'testResults.xml')

# A window opened from Explorer closes when the script ends; this keeps the result readable.
function Test-StartedFromExplorer {
    try {
        $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
        return (Get-Process -Id $parentId -ErrorAction Stop).ProcessName -eq 'explorer'
    } catch {
        return $false
    }
}

function Exit-Script {
    param([Parameter(Mandatory)][int]$ExitCode)
    if (Test-StartedFromExplorer) { $null = Read-Host 'Press Enter to close' }
    exit $ExitCode
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
    Exit-Script 1
}

# Path below the repo root, with forward slashes, as zip entries and git write them.
function Get-RelativePath {
    param([Parameter(Mandatory)][string]$FullName)
    return $FullName.Substring($script:Root.Length + 1).Replace('\', '/')
}

# Relative paths of the files git would commit, or nothing when git can't tell.
function Get-GitFile {
    # git writes UTF-8; the console code page would garble names outside ASCII.
    $previousEncoding = [Console]::OutputEncoding
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    try {
        $output = & git -C $script:Root ls-files --cached --others --exclude-standard -z 2>$null
    } catch {
        return $null
    } finally {
        [Console]::OutputEncoding = $previousEncoding
    }
    if ($LASTEXITCODE -ne 0) { return $null }
    $paths = ($output -join '') -split "`0" | Where-Object { $_ }
    # --cached still lists tracked files deleted from the working tree.
    return @($paths | Where-Object { Test-Path -LiteralPath (Join-Path $script:Root $_) -PathType Leaf })
}

function Get-FallbackFile {
    Get-ChildItem -LiteralPath $script:Root -Recurse -File -Force |
        ForEach-Object { Get-RelativePath -FullName $_.FullName } |
        Where-Object {
            $relative = $_
            $topFolder = $relative.Split('/')[0]
            $name = Split-Path -Leaf $relative
            $isExcludedFolder = $relative.Contains('/') -and $topFolder -in $script:FallbackExcludedFolders
            $isExcludedFile = @($script:FallbackExcludedPatterns | Where-Object { $name -like $_ }).Count -gt 0
            -not ($isExcludedFolder -or $isExcludedFile)
        }
}

function Get-SourceFile {
    $files = $null
    if (Get-Command git -ErrorAction SilentlyContinue) { $files = Get-GitFile }
    if ($null -eq $files) {
        Write-Note 'git is not available here; leaving out the ignored folders by name'
        $files = @(Get-FallbackFile)
    }
    return @($files | Sort-Object -Unique)
}

function New-SourceZip {
    param([Parameter(Mandatory)][string[]]$Files)

    $topFolder = Split-Path -Leaf $script:Root
    $zip = [System.IO.Compression.ZipFile]::Open($script:ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($relative in $Files) {
            $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip,
                (Join-Path $script:Root $relative),
                "$topFolder/$relative",
                [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    } finally {
        $zip.Dispose()
    }
}

Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

Write-Host ''
Write-Host "Rewire source -> $script:ZipPath" -ForegroundColor White

$files = @(Get-SourceFile)
if ($files.Count -eq 0) { Exit-WithError 'found no files to zip' }
try {
    # The previous zip is this script's own output; ZipFile can't overwrite it in place.
    if (Test-Path -LiteralPath $script:ZipPath) { Remove-Item -LiteralPath $script:ZipPath -Force }
    New-SourceZip -Files $files
} catch {
    Exit-WithError "zip failed: $($_.Exception.Message)"
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $script:ZipPath).Length / 1MB, 2)
Write-Good "$($files.Count) files, $sizeMb MB"
Write-Host ''
Exit-Script 0
