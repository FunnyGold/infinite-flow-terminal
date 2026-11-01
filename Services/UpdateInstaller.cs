using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Text;

namespace InfiniteTerminal;

public static class UpdateInstaller
{
    public static bool Start(UpdateInfo info, string zipPath, out string error)
    {
        error = "";
        try
        {
            var target = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            var staging = Path.Combine(Path.GetTempPath(),
                "InfiniteTerminal-update-" + info.Latest + "-" + Guid.NewGuid().ToString("N")[..8]);
            Directory.CreateDirectory(staging);
            ZipFile.ExtractToDirectory(zipPath, staging, true);

            var newExe = Directory.EnumerateFiles(staging, "*.exe", SearchOption.AllDirectories)
                .FirstOrDefault(p => Path.GetFileName(p).Equals("无限流角色终端.exe", StringComparison.OrdinalIgnoreCase));
            if (newExe == null)
            {
                error = "更新包中没有找到 无限流角色终端.exe";
                return false;
            }

            var source = Path.GetDirectoryName(newExe)!;
            var script = Path.Combine(staging, "apply-update.ps1");
            File.WriteAllText(script, Script, new UTF8Encoding(true));

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            psi.ArgumentList.Add("-NoProfile");
            psi.ArgumentList.Add("-ExecutionPolicy");
            psi.ArgumentList.Add("Bypass");
            psi.ArgumentList.Add("-File");
            psi.ArgumentList.Add(script);
            psi.ArgumentList.Add("-ProcessId");
            psi.ArgumentList.Add(Environment.ProcessId.ToString());
            psi.ArgumentList.Add("-Source");
            psi.ArgumentList.Add(source);
            psi.ArgumentList.Add("-Target");
            psi.ArgumentList.Add(target);
            psi.ArgumentList.Add("-Exe");
            psi.ArgumentList.Add(Path.Combine(target, "无限流角色终端.exe"));
            Process.Start(psi);
            return true;
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }
    }

    private const string Script = """
param(
  [int]$ProcessId,
  [string]$Source,
  [string]$Target,
  [string]$Exe
)
$ErrorActionPreference = 'Stop'
$logDir = Join-Path $env:LOCALAPPDATA 'InfiniteTerminal'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'update.log'
function Log([string]$text) {
  try { Add-Content -Path $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $text) -Encoding UTF8 } catch { }
}
function Start-App() {
  for ($i = 0; $i -lt 3; $i++) {
    try {
      Start-Process -FilePath $Exe -WorkingDirectory $Target
      Log "app started"
      return $true
    } catch {
      Log ("start attempt failed: " + $_.Exception.Message)
      Start-Sleep -Milliseconds 800
    }
  }
  try {
    Start-Process -FilePath 'explorer.exe' -ArgumentList $Target
    Log "opened target folder after start failure"
  } catch { }
  return $false
}

Log "update requested; waiting for process $ProcessId"
try {
  while (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
    Start-Sleep -Milliseconds 500
  }
} catch { }
Start-Sleep -Milliseconds 1200

$backup = Join-Path $logDir ('backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
try {
  Log "backing up program files to $backup"
  Get-ChildItem -Path $Target -Force | Where-Object {
    $_.Name -notin @('终端数据', 'webview-data')
  } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $backup -Recurse -Force
  }

  Log "copying update from $Source to $Target"
  Get-ChildItem -Path $Source -Force | Where-Object {
    $_.Name -notin @('终端数据', 'webview-data')
  } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
  }

  Log "update copied; starting app"
  Start-App | Out-Null
} catch {
  Log ("update failed: " + $_.Exception.Message)
  try {
    Log "rolling back"
    Get-ChildItem -Path $backup -Force | Where-Object {
      $_.Name -notin @('终端数据', 'webview-data')
    } | ForEach-Object {
      Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
    }
    Start-App | Out-Null
    Log "rollback started app"
  } catch {
    Log ("rollback failed: " + $_.Exception.Message)
  }
}
""";
}
