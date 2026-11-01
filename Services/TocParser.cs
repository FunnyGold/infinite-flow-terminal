using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace InfiniteTerminal;

internal static class TocParser
{
    private static readonly Regex TokenRegex = new(
        @"(?is)<\s*(?<tag>/?ul|li)\b[^>]*>|<object\b[^>]*>(?<body>.*?)</object\s*>",
        RegexOptions.Compiled);

    private static readonly Regex ParamRegex = new(
        @"(?is)<param\s+name\s*=\s*[""']?(?<name>[^""'\s>]+)[""']?\s+value\s*=\s*[""'](?<value>[^""']*)[""']",
        RegexOptions.Compiled);

    static TocParser()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public static List<TocNode> Parse(string? hhcPath, HashSet<string> files)
    {
        if (string.IsNullOrWhiteSpace(hhcPath) || !File.Exists(hhcPath))
            return BuildFlatToc(files);

        string text;
        try
        {
            var bytes = File.ReadAllBytes(hhcPath);
            var enc = HtmlText.DetectEncoding(bytes);
            text = enc.GetString(bytes);
        }
        catch
        {
            return BuildFlatToc(files);
        }

        var root = new List<TocNode>();
        var stack = new Stack<List<TocNode>>();
        stack.Push(root);
        TocNode? last = null;

        foreach (Match match in TokenRegex.Matches(text))
        {
            if (match.Groups["body"].Success)
            {
                var body = match.Groups["body"].Value;
                var name = "";
                var local = "";
                foreach (Match pm in ParamRegex.Matches(body))
                {
                    var pn = pm.Groups["name"].Value.Trim();
                    var pv = WebUtility.HtmlDecode(pm.Groups["value"].Value).Trim();
                    if (pn.Equals("Name", StringComparison.OrdinalIgnoreCase)) name = pv;
                    else if (pn.Equals("Local", StringComparison.OrdinalIgnoreCase)) local = pv;
                }
                if (string.IsNullOrWhiteSpace(name)) continue;
                if (last == null)
                {
                    last = new TocNode();
                    stack.Peek().Add(last);
                }
                last.Name = CleanName(name);
                last.Path = ResolvePath(local, files);
                continue;
            }

            var tag = match.Groups["tag"].Value.ToLowerInvariant();
            if (tag == "ul")
            {
                // HHC files normally begin with a bare <UL> wrapper. When there is no
                // preceding <LI>, keep using the current list instead of detaching a
                // fresh one (which used to make the entire TOC fall back to filenames).
                var list = last != null ? last.Children : stack.Peek();
                stack.Push(list);
                last = null;
            }
            else if (tag == "/ul")
            {
                if (stack.Count > 1) stack.Pop();
                last = null;
            }
            else if (tag == "li")
            {
                last = new TocNode();
                stack.Peek().Add(last);
            }
        }

        var pruned = Prune(root);
        return pruned.Count > 0 ? pruned : BuildFlatToc(files);
    }

    public static Dictionary<string, string> CollectTitles(List<TocNode> toc)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        void Walk(IEnumerable<TocNode> nodes)
        {
            foreach (var n in nodes)
            {
                if (!string.IsNullOrWhiteSpace(n.Path) && !string.IsNullOrWhiteSpace(n.Name) && !map.ContainsKey(n.Path))
                    map[n.Path] = n.Name;
                Walk(n.Children);
            }
        }
        Walk(toc);
        return map;
    }

    private static List<TocNode> Prune(List<TocNode> nodes)
    {
        var result = new List<TocNode>();
        foreach (var n in nodes)
        {
            n.Children = Prune(n.Children);
            if (string.IsNullOrWhiteSpace(n.Path) && n.Children.Count == 0) continue;
            if (n.Name.Length > 160) n.Name = n.Name[..160];
            result.Add(n);
        }
        return result;
    }

    private static string CleanName(string name)
    {
        name = Regex.Replace(name, @"<[^>]+>", " ");
        name = Regex.Replace(name, @"\s+", " ").Trim();
        return name;
    }

    private static string? ResolvePath(string local, HashSet<string> files)
    {
        if (string.IsNullOrWhiteSpace(local)) return null;
        local = local.Trim();
        if (local.StartsWith("http:", StringComparison.OrdinalIgnoreCase) ||
            local.StartsWith("https:", StringComparison.OrdinalIgnoreCase) ||
            local.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase) ||
            local.StartsWith("ms-its:", StringComparison.OrdinalIgnoreCase))
            return null;
        var hashIndex = local.IndexOf('#');
        var anchor = hashIndex >= 0 ? local[hashIndex..] : "";
        if (hashIndex >= 0) local = local[..hashIndex];
        var queryIndex = local.IndexOf('?');
        if (queryIndex >= 0) local = local[..queryIndex];
        try { local = Uri.UnescapeDataString(local); } catch { }
        local = local.Replace('\\', '/').Trim();
        while (local.StartsWith("./", StringComparison.Ordinal)) local = local[2..];
        local = local.TrimStart('/');
        if (local.Length == 0) return null;

        if (files.Contains(local)) return local + anchor;
        var baseName = Path.GetFileName(local);
        var match = files.FirstOrDefault(f => Path.GetFileName(f).Equals(baseName, StringComparison.OrdinalIgnoreCase));
        return match == null ? null : match + anchor;
    }

    private static List<TocNode> BuildFlatToc(HashSet<string> files)
    {
        return files
            .Where(f => f.EndsWith(".htm", StringComparison.OrdinalIgnoreCase) || f.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
            .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
            .Take(1500)
            .Select(f => new TocNode { Name = Path.GetFileNameWithoutExtension(f), Path = f })
            .ToList();
    }
}
