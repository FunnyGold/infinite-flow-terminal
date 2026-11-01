using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

namespace InfiniteTerminal;

internal static class WebAssets
{
    private static readonly string[] Files = { "index.html", "app.css", "app.js", "data.js", "calc.js" };

    public static string EnsureExtracted(string dataRoot)
    {
        var root = Path.Combine(dataRoot, "web");
        var asm = Assembly.GetExecutingAssembly();
        var payloads = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA1);
        foreach (var name in Files)
        {
            var resource = "web/" + name;
            using var stream = asm.GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException("内置界面资源缺失：" + resource);
            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            var bytes = ms.ToArray();
            payloads[name] = bytes;
            hash.AppendData(Encoding.UTF8.GetBytes(name));
            hash.AppendData(bytes);
        }
        var stamp = Convert.ToHexString(hash.GetHashAndReset())[..16].ToLowerInvariant();
        var target = Path.Combine(root, stamp);
        var stampFile = Path.Combine(target, ".assets");
        if (File.Exists(stampFile))
            return target;

        Directory.CreateDirectory(target);
        foreach (var pair in payloads)
            File.WriteAllBytes(Path.Combine(target, pair.Key), pair.Value);
        File.WriteAllText(stampFile, stamp, new UTF8Encoding(false));

        try
        {
            foreach (var dir in Directory.EnumerateDirectories(root))
            {
                if (!Path.GetFileName(dir).Equals(stamp, StringComparison.OrdinalIgnoreCase))
                    Directory.Delete(dir, true);
            }
        }
        catch { }
        return target;
    }
}
