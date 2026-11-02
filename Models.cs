using System.Text.Json.Serialization;

namespace InfiniteTerminal;

public sealed class BookInfo
{
    public string Key { get; set; } = "";
    public string Title { get; set; } = "";
    public string FileName { get; set; } = "";
    public string FilePath { get; set; } = "";
    public string Status { get; set; } = "queued";
    public int PageCount { get; set; }
    public int Progress { get; set; }
    public string? Error { get; set; }
    public long Size { get; set; }
    public long ModifiedTicks { get; set; }
}

public sealed class TocNode
{
    public string Name { get; set; } = "";
    public string? Path { get; set; }
    public List<TocNode> Children { get; set; } = new();
}

public sealed class PageInfo
{
    public string Path { get; set; } = "";
    public string Title { get; set; } = "";
    public string TextHash { get; set; } = "";
}

public sealed class SearchHit
{
    public string BookKey { get; set; } = "";
    public string BookTitle { get; set; } = "";
    public string Title { get; set; } = "";
    public string Path { get; set; } = "";
    public string Snippet { get; set; } = "";
    public int Score { get; set; }
}

public sealed class SearchResponse
{
    public string Query { get; set; } = "";
    public int Total { get; set; }
    public long ElapsedMs { get; set; }
    public bool Truncated { get; set; }
    public string? Error { get; set; }
    public List<SearchHit> Results { get; set; } = new();
}

public sealed class AppSettings
{
    public List<string> ExtraFolders { get; set; } = new();
    public List<string> IgnoredBooks { get; set; } = new();
    public string? LastBook { get; set; }
    public string? LastPage { get; set; }
}

internal sealed class BookManifest
{
    public int Version { get; set; } = 1;
    public string SourcePath { get; set; } = "";
    public long Size { get; set; }
    public long ModifiedTicks { get; set; }
    public string Title { get; set; } = "";
    public List<PageInfo> Pages { get; set; } = new();
    public List<TocNode> Toc { get; set; } = new();
}
