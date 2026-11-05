#Requires -Version 7.2

<#
.SYNOPSIS
    Type-checks the sources and runs every Vitest unit test; fails if anything fails.

.DESCRIPTION
    Makes sure the tools are there first: Node.js (installed with winget when it is missing
    or too old) and the npm packages (restored with npm ci when node_modules is missing or
    older than package-lock.json). Then type-checks src and tests with tsc, and runs Vitest
    over the tests folder. For local use and CI; Start-Debug.ps1 and Publish-Extension.ps1
    call it too.

    Exit codes:
      0  all tests passed, or the tools are ready with -InstallOnly
      1  type errors, or one or more tests failed
      2  no tests were discovered
      3  Node.js is missing or too old and could not be installed, or npm ci failed

.PARAMETER Path
    Test folder or file to run. Defaults to the tests folder beside this script.

.PARAMETER TestName
    Only run tests whose name contains this text, or matches it as a regex.

.PARAMETER Output
    Vitest output: None, Normal, Detailed. Default Detailed.

.PARAMETER ResultPath
    Write JUnit XML test results to this path.

.PARAMETER Watch
    Rerun the affected tests on every save, until Ctrl+C. Skips the type check.

.PARAMETER SkipTypeCheck
    Run the tests without the tsc type check.

.PARAMETER MinimumNodeVersion
    Oldest Node.js major version accepted. Default 20.

.PARAMETER InstallOnly
    Make sure Node.js and the npm packages are there, then stop without running anything.

.PARAMETER SkipInstall
    Never install Node.js; fail instead. The npm packages still restore, since they stay
    inside the repo.

.EXAMPLE
    ./Invoke-Test.ps1

.EXAMPLE
    ./Invoke-Test.ps1 -Path ./tests/Common/Redirects -Output Normal

.EXAMPLE
    ./Invoke-Test.ps1 -TestName 'compile_Should' -Watch

.EXAMPLE
    ./Invoke-Test.ps1 -InstallOnly
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$Path = (Join-Path -Path $PSScriptRoot -ChildPath 'tests'),

    [ValidateNotNullOrEmpty()]
    [string]$TestName,

    [ValidateSet('None', 'Normal', 'Detailed')]
    [string]$Output = 'Detailed',

    [ValidateNotNullOrEmpty()]
    [string]$ResultPath,

    [switch]$Watch,

    [switch]$SkipTypeCheck,

    [ValidateRange(18, 99)]
    [int]$MinimumNodeVersion = 20,

    [switch]$InstallOnly,

    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:NodePackageId = 'OpenJS.NodeJS.LTS'
$script:TestFilePattern = '*Tests.ts'
$script:Reporters = @{
    None     = 'dot'
    Normal   = 'default'
    Detailed = 'verbose'
}

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
    param(
        [Parameter(Mandatory)][string]$Message,
        [Parameter(Mandatory)][ValidateRange(1, 255)][int]$ExitCode
    )
    Write-Host "   [fail] $Message" -ForegroundColor Red
    exit $ExitCode
}

# The major version of the node on PATH, or 0 when there is none.
function Get-NodeMajorVersion {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return 0 }
    $text = (& node --version) -replace '^v', ''
    return [int]($text.Split('.')[0])
}

function Install-Node {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Exit-WithError "Node.js $MinimumNodeVersion+ is needed and winget is missing: install Node.js LTS from https://nodejs.org" 3
    }
    Write-Note "installing $script:NodePackageId with winget"
    & winget install --id $script:NodePackageId --exact --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Exit-WithError "winget could not install $script:NodePackageId (exit $LASTEXITCODE)" 3 }
    # winget updates PATH for later sessions only; read it back for this one.
    $env:Path = @(
        [Environment]::GetEnvironmentVariable('Path', 'Machine')
        [Environment]::GetEnvironmentVariable('Path', 'User')
    ) -join [System.IO.Path]::PathSeparator
}

# node_modules is current when npm's own record of it is newer than package-lock.json.
function Test-PackagesCurrent {
    $lock = Join-Path $PSScriptRoot 'package-lock.json'
    $installed = Join-Path $PSScriptRoot 'node_modules/.package-lock.json'
    if (-not (Test-Path -LiteralPath $installed)) { return $false }
    return (Get-Item -LiteralPath $installed).LastWriteTimeUtc -ge (Get-Item -LiteralPath $lock).LastWriteTimeUtc
}

function Get-VitestArguments {
    param([Parameter(Mandatory)][string]$RelativePath)

    $arguments = [System.Collections.Generic.List[string]]::new()
    $arguments.Add('vitest')
    if (-not $Watch) { $arguments.Add('run') }
    $arguments.Add($RelativePath)
    $arguments.Add("--reporter=$($script:Reporters[$Output])")
    if ($TestName) { $arguments.AddRange([string[]]@('--testNamePattern', $TestName)) }
    if ($ResultPath) {
        $resultFolder = Split-Path -Parent ([System.IO.Path]::GetFullPath($ResultPath))
        $null = New-Item -ItemType Directory -Path $resultFolder -Force
        $arguments.AddRange([string[]]@('--reporter=junit', "--outputFile.junit=$ResultPath"))
    }

    return $arguments.ToArray()
}

Push-Location -LiteralPath $PSScriptRoot
try {
    Write-Step 'node'
    $nodeMajor = Get-NodeMajorVersion
    if ($nodeMajor -lt $MinimumNodeVersion) {
        $found = if ($nodeMajor -eq 0) { 'not found' } else { "v$nodeMajor found" }
        if ($SkipInstall) { Exit-WithError "Node.js $MinimumNodeVersion+ is needed, $found (-SkipInstall)" 3 }
        Write-Note "Node.js $MinimumNodeVersion+ is needed, $found"
        Install-Node
        $nodeMajor = Get-NodeMajorVersion
        if ($nodeMajor -lt $MinimumNodeVersion) {
            Exit-WithError "Node.js $MinimumNodeVersion+ is still not on PATH; open another terminal and run this again" 3
        }
    }
    Write-Good "node $(& node --version)"

    Write-Step 'packages'
    if (Test-PackagesCurrent) {
        Write-Good 'node_modules is current'
    }
    else {
        Write-Note 'node_modules is missing or older than package-lock.json; running npm ci'
        & npm ci --no-audit --no-fund | Out-Host
        if ($LASTEXITCODE -ne 0) { Exit-WithError "npm ci failed (exit $LASTEXITCODE)" 3 }
        Write-Good 'restored'
    }

    if ($InstallOnly) { exit 0 }

    Write-Step 'tests'
    if (-not (Test-Path -LiteralPath $Path)) { Exit-WithError "test path not found: $Path" 2 }
    $testFiles = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Filter $script:TestFilePattern)
    if ($testFiles.Count -eq 0) { Exit-WithError "no $script:TestFilePattern files under $Path" 2 }
    $relativePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, (Resolve-Path -LiteralPath $Path).Path) -replace '\\', '/'
    Write-Note "$($testFiles.Count) test files in $relativePath"

    if ($SkipTypeCheck -or $Watch) {
        Write-Note 'type check skipped'
    }
    else {
        & npx tsc --noEmit | Out-Host
        if ($LASTEXITCODE -ne 0) { Exit-WithError 'type check failed' 1 }
        Write-Good 'no type errors'
    }

    $vitestArguments = Get-VitestArguments -RelativePath $relativePath
    & npx @vitestArguments | Out-Host
    if ($LASTEXITCODE -ne 0) { Exit-WithError 'tests failed' 1 }
    Write-Good 'all tests passed'
    if ($ResultPath) { Write-Note "results: $ResultPath" }
    Write-Host ''
    exit 0
}
finally {
    Pop-Location
}
