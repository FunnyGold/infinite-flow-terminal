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
            File.WriteAllText(script, Script, new UTF8Encoding(false));

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
try { Wait-Process -Id $ProcessId -ErrorAction SilentlyContinue } catch { }
Start-Sleep -Milliseconds 800
$backup = Join-Path $env:LOCALAPPDATA ('InfiniteTerminal\backup\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backup | Out-Null
try {
  Copy-Item -Path (Join-Path $Target '*') -Destination $backup -Recurse -Force
  Get-ChildItem -Path $Source -Force | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
  }
  Start-Process -FilePath $Exe -WorkingDirectory $Target
} catch {
  try {
    Get-ChildItem -Path $backup -Force | ForEach-Object {
      Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
    }
    Start-Process -FilePath $Exe -WorkingDirectory $Target
  } catch { }
}
""";
}
