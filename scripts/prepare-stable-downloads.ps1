param([Parameter(Mandatory=$true)][string]$OutputDirectory,
      [string]$HistoryPath = "$PSScriptRoot/../src/wujie-history.json")
$ErrorActionPreference = 'Stop'
$history = Get-Content -LiteralPath $HistoryPath -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$records = @()
foreach ($release in $history.releases) {
    if ($release.channel -ne 'Stable' -or $release.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid stable release' }
    $source = "https://github.com/adventurer2008/obsidian-smart-sync-release-cn/releases/download/$($release.version)/"
    if ($release.baseUrl -ne $source) { throw 'Unexpected source repository' }
    $directory = Join-Path $OutputDirectory "stable/$($release.version)"
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    foreach ($file in @('manifest.json','main.js','styles.css')) {
        $target = Join-Path $directory $file
        Invoke-WebRequest ($source + $file) -OutFile $target
        $digest = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($digest -ne $release.sha256.$file) { throw "Digest mismatch: $($release.version)/$file" }
    }
    $manifest = Get-Content (Join-Path $directory 'manifest.json') -Raw | ConvertFrom-Json
    if ($manifest.id -ne 'wujie-sync' -or $manifest.version -ne $release.version) { throw 'Manifest mismatch' }
    $zipName = "wujie-sync-$($release.version).zip"
    Compress-Archive -Path (Join-Path $directory 'manifest.json'),(Join-Path $directory 'main.js'),(Join-Path $directory 'styles.css') -DestinationPath (Join-Path $directory $zipName) -Force
    $base = "https://user.wujiesync.cc/download/stable/$($release.version)/"
    $record = @{version=$release.version;channel='Stable';baseUrl=$base;sha256=$release.sha256;rollbackSafe=$false;publishedAt=$release.publishedAt;zipUrl=$base+$zipName;zipSha256=(Get-FileHash (Join-Path $directory $zipName) -Algorithm SHA256).Hash.ToLowerInvariant()}
    $records += $record
}
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'stable-releases.json'),(@{releases=$records} | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
Write-Output "Prepared $($records.Count) verified stable releases."
