using System.IO;

namespace InfiniteTerminal;

internal static class AppPaths
{
    public static string ChooseDataRoot()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "终端数据"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "InfiniteTerminal"),
            Path.Combine(Path.GetTempPath(), "InfiniteTerminal")
        };
        foreach (var dir in candidates)
        {
            if (CanWrite(dir)) return dir;
        }
        return candidates[^1];
    }

    private static bool CanWrite(string dir)
    {
        try
        {
            Directory.CreateDirectory(dir);
            var probe = Path.Combine(dir, ".write-probe-" + Guid.NewGuid().ToString("N")[..8]);
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
