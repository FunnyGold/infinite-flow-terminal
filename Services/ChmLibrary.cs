using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace InfiniteTerminal;

public sealed class ChmLibrary : IDisposable
{
    private const int ManifestVersion = 3;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private sealed class BookRuntime
    {
        public required BookInfo Info { get; init; }
        public BookManifest? Manifest { get; set; }
        public string CacheDir { get; set; } = "";
        public List<SearchDocument>? SearchDocs { get; set; }
    }

    private sealed class SearchDocument
    {
        public required PageInfo Page { get; init; }
        public string Text { get; set; } = "";
    }

    private readonly object _gate = new();
    private readonly SemaphoreSlim _scanLock = new(1, 1);
    private readonly List<BookRuntime> _books = new();
    private readonly ConcurrentDictionary<string, byte> _jobs = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<FileSystemWatcher> _watchers = new();
    private readonly string _appDir;
    private CancellationTokenSource? _debounceCts;
    private AppSettings _settings;
    private bool _disposed;

    public string DataRoot { get; }
    public string CacheRoot { get; }
    public string WebRoot { get; }
    public string UserDataRoot { get; }
    public string AppDirectory => _appDir;

    public string[] ExtraFolders
    {
        get { lock (_gate) return _settings.ExtraFolders.ToArray(); }
    }

    public event Action<string>? MessageReady;

    public ChmLibrary(string appDir, string dataRoot)
    {
        _appDir = Path.GetFullPath(appDir);
        DataRoot = Path.GetFullPath(dataRoot);
        CacheRoot = Path.Combine(DataRoot, "chm-cache");
        WebRoot = Path.Combine(DataRoot, "web");
        UserDataRoot = Path.Combine(DataRoot, "webview");
        Directory.CreateDirectory(CacheRoot);
        Directory.CreateDirectory(DataRoot);
        _settings = LoadSettings();
    }

    public void Start()
    {
        CleanupTempFiles();
        RebuildWatchers();
        _ = RefreshAsync();
    }

    private void CleanupTempFiles()
    {
        try
        {
            foreach (var dir in Directory.EnumerateDirectories(CacheRoot, ".staging-*"))
            {
                try { Directory.Delete(dir, true); } catch { }
            }
            foreach (var file in Directory.EnumerateFiles(CacheRoot, ".src-*.chm"))
            {
                try { File.Delete(file); } catch { }
            }
        }
        catch { }
    }

    public string? FindBookPath(string key)
    {
        lock (_gate)
            return _books.FirstOrDefault(b => b.Info.Key.Equals(key, StringComparison.OrdinalIgnoreCase))?.Info.FilePath;
    }

    public List<TocNode> GetToc(string key)
    {
        lock (_gate)
        {
            var book = _books.FirstOrDefault(b => b.Info.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
            return book?.Manifest?.Toc ?? new List<TocNode>();
        }
    }

    public List<BookInfo> GetBooks()
    {
        lock (_gate)
            return _books.Select(b => CloneInfo(b.Info)).ToList();
    }

    public void AddFolder(string folder)
    {
        if (string.IsNullOrWhiteSpace(folder) || !Directory.Exists(folder))
            return;
        folder = Path.GetFullPath(folder);
        lock (_gate)
        {
            if (_settings.ExtraFolders.Any(p => p.Equals(folder, StringComparison.OrdinalIgnoreCase)))
                return;
            _settings.ExtraFolders.Add(folder);
            SaveSettings();
        }
        RebuildWatchers();
        _ = RefreshAsync();
    }

    public void RemoveExtraFolders()
    {
        lock (_gate)
        {
            _settings.ExtraFolders.Clear();
            SaveSettings();
        }
        RebuildWatchers();
        _ = RefreshAsync();
    }

    private static BookInfo CloneInfo(BookInfo b) => new()
    {
        Key = b.Key,
        Title = b.Title,
        FileName = b.FileName,
        FilePath = b.FilePath,
        Status = b.Status,
        PageCount = b.PageCount,
        Progress = b.Progress,
        Error = b.Error,
        Size = b.Size,
        ModifiedTicks = b.ModifiedTicks
    };

    private void Publish()
    {
        List<BookInfo> books;
        lock (_gate)
            books = _books.Select(b => CloneInfo(b.Info)).ToList();
        var payload = new
        {
            type = "chmLibrary",
            books,
            indexing = books.Any(b => b.Status is "queued" or "extracting" or "indexing"),
            appDir = _appDir,
            extraFolders = _settings.ExtraFolders.ToArray()
        };
        try { MessageReady?.Invoke(JsonSerializer.Serialize(payload, JsonOptions)); }
        catch { /* UI may be closing */ }
    }

    private AppSettings LoadSettings()
    {
        try
        {
            var path = Path.Combine(DataRoot, "settings.json");
            if (File.Exists(path))
                return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(path, Encoding.UTF8), JsonOptions) ?? new AppSettings();
        }
        catch { }
        return new AppSettings();
    }

    private void SaveSettings()
    {
        try
        {
            Directory.CreateDirectory(DataRoot);
            File.WriteAllText(Path.Combine(DataRoot, "settings.json"),
                JsonSerializer.Serialize(_settings, JsonOptions), new UTF8Encoding(false));
        }
        catch { }
    }

    private void RebuildWatchers()
    {
        foreach (var w in _watchers)
        {
            try { w.EnableRaisingEvents = false; w.Dispose(); } catch { }
        }
        _watchers.Clear();

        foreach (var root in ScanRoots())
        {
            if (!Directory.Exists(root)) continue;
            try
            {
                var watcher = new FileSystemWatcher(root, "*.chm")
                {
                    IncludeSubdirectories = true,
                    NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
                    InternalBufferSize = 64 * 1024
                };
                watcher.Created += (_, _) => ScheduleRefresh();
                watcher.Changed += (_, _) => ScheduleRefresh();
                watcher.Deleted += (_, _) => ScheduleRefresh();
                watcher.Renamed += (_, _) => ScheduleRefresh();
                watcher.EnableRaisingEvents = true;
                _watchers.Add(watcher);
            }
            catch { }
        }
    }

    private IEnumerable<string> ScanRoots()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(_appDir) && seen.Add(_appDir)) yield return _appDir;
        var cwd = Environment.CurrentDirectory;
        if (!string.IsNullOrWhiteSpace(cwd) && seen.Add(cwd)) yield return cwd;

        // A portable build often lives in a subfolder next to the user's CHM
        // collection. Only add the parent when it directly contains a CHM so we
        // never walk a huge unrelated directory tree.
        string? parent = null;
        try
        {
            var trimmed = _appDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            parent = Directory.GetParent(trimmed)?.FullName;
        }
        catch { }
        if (!string.IsNullOrWhiteSpace(parent) && seen.Add(parent))
        {
            var hasChm = false;
            try { hasChm = Directory.EnumerateFiles(parent, "*.chm", SearchOption.TopDirectoryOnly).Any(); }
            catch { }
            if (hasChm) yield return parent;
        }

        foreach (var folder in _settings.ExtraFolders.ToArray())
        {
            if (!string.IsNullOrWhiteSpace(folder) && seen.Add(folder)) yield return folder;
        }
    }

    private void ScheduleRefresh()
    {
        if (_disposed) return;
        var cts = new CancellationTokenSource();
        var old = Interlocked.Exchange(ref _debounceCts, cts);
        try { old?.Cancel(); } catch { }
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(1600, cts.Token).ConfigureAwait(false);
                await RefreshAsync().ConfigureAwait(false);
            }
            catch (OperationCanceledException) { }
            catch { }
        });
    }

    private IEnumerable<string> EnumerateChmFiles()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var root in ScanRoots())
        {
            if (!Directory.Exists(root)) continue;
            foreach (var file in EnumerateDepth(root, 0, 2))
            {
                if (!file.EndsWith(".chm", StringComparison.OrdinalIgnoreCase)) continue;
                var full = Path.GetFullPath(file);
                if (full.StartsWith(DataRoot, StringComparison.OrdinalIgnoreCase)) continue;
                if (full.StartsWith(CacheRoot, StringComparison.OrdinalIgnoreCase)) continue;
                if (seen.Add(full))
                    yield return full;
            }
        }
    }

    private static IEnumerable<string> EnumerateDepth(string dir, int depth, int maxDepth)
    {
        IEnumerable<string> files;
        try { files = Directory.EnumerateFiles(dir, "*.chm", SearchOption.TopDirectoryOnly); }
        catch { files = Array.Empty<string>(); }
        foreach (var f in files) yield return f;
        if (depth >= maxDepth) yield break;
        IEnumerable<string> dirs;
        try { dirs = Directory.EnumerateDirectories(dir); }
        catch { dirs = Array.Empty<string>(); }
        foreach (var d in dirs)
        {
            var name = Path.GetFileName(d);
            if (name.StartsWith('.') || name.Equals("_dsh_text", StringComparison.OrdinalIgnoreCase)) continue;
            foreach (var f in EnumerateDepth(d, depth + 1, maxDepth)) yield return f;
        }
    }

    private static string ComputeKey(string path, long size, long ticks)
    {
        var raw = Encoding.UTF8.GetBytes(path.ToLowerInvariant() + "|" + size + "|" + ticks);
        return Convert.ToHexString(SHA1.HashData(raw))[..20].ToLowerInvariant();
    }

    public async Task RefreshAsync()
    {
        if (_disposed) return;
        await _scanLock.WaitAsync().ConfigureAwait(false);
        try
        {
            var files = EnumerateChmFiles().ToList();
            var queue = new List<BookRuntime>();
            lock (_gate)
            {
                var activeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var file in files)
                {
                    FileInfo fi;
                    try { fi = new FileInfo(file); } catch { continue; }
                    if (!fi.Exists || fi.Length < 1024) continue;
                    var key = ComputeKey(fi.FullName, fi.Length, fi.LastWriteTimeUtc.Ticks);
                    activeKeys.Add(key);
                    var existing = _books.FirstOrDefault(b => b.Info.Key == key);
                    if (existing != null)
                    {
                        queue.Add(existing);
                        continue;
                    }
                    // A changed file gets a new key: retire the old runtime with the same path.
                    var old = _books.Where(b => b.Info.FilePath.Equals(fi.FullName, StringComparison.OrdinalIgnoreCase)).ToList();
                    foreach (var o in old) _books.Remove(o);

                    var info = new BookInfo
                    {
                        Key = key,
                        Title = Path.GetFileNameWithoutExtension(fi.Name).Trim(),
                        FileName = fi.Name,
                        FilePath = fi.FullName,
                        Status = "queued",
                        Size = fi.Length,
                        ModifiedTicks = fi.LastWriteTimeUtc.Ticks,
                        Progress = 0
                    };
                    var rt = new BookRuntime
                    {
                        Info = info,
                        CacheDir = Path.Combine(CacheRoot, key)
                    };
                    _books.Add(rt);
                    queue.Add(rt);
                }
                foreach (var b in _books.Where(b => !activeKeys.Contains(b.Info.Key)).ToList())
                {
                    if (b.Info.FilePath.Length > 0 && !File.Exists(b.Info.FilePath))
                        _books.Remove(b);
                }
            }
            Publish();
            foreach (var rt in queue)
                QueuePrepare(rt);
        }
        catch { }
        finally
        {
            _scanLock.Release();
        }
    }

    private void QueuePrepare(BookRuntime rt)
    {
        if (_disposed) return;
        if (!_jobs.TryAdd(rt.Info.Key, 0)) return;
        _ = Task.Run(async () =>
        {
            try { await PrepareAsync(rt).ConfigureAwait(false); }
            catch (Exception ex) { SetError(rt, ex.Message); }
            finally { _jobs.TryRemove(rt.Info.Key, out _); }
        });
    }

    private void SetError(BookRuntime rt, string message)
    {
        lock (_gate)
        {
            rt.Info.Status = "error";
            rt.Info.Error = string.IsNullOrWhiteSpace(message) ? "无法读取该 CHM" : message;
            rt.Info.Progress = 0;
        }
        Publish();
    }

    private void UpdateStatus(BookRuntime rt, string status, int progress)
    {
        lock (_gate)
        {
            rt.Info.Status = status;
            rt.Info.Progress = Math.Clamp(progress, 0, 100);
        }
        Publish();
    }

    private async Task PrepareAsync(BookRuntime rt)
    {
        var manifestFile = Path.Combine(rt.CacheDir, "manifest.json");
        if (File.Exists(manifestFile))
        {
            try
            {
                var mf = JsonSerializer.Deserialize<BookManifest>(await File.ReadAllTextAsync(manifestFile, Encoding.UTF8).ConfigureAwait(false), JsonOptions);
                if (mf != null && mf.Version == ManifestVersion && mf.SourcePath.Equals(rt.Info.FilePath, StringComparison.OrdinalIgnoreCase))
                {
                    lock (_gate)
                    {
                        rt.Manifest = mf;
                        rt.Info.Status = "ready";
                        rt.Info.PageCount = mf.Pages.Count;
                        rt.Info.Progress = 100;
                    }
                    Publish();
                    return;
                }
            }
            catch { }
        }

        UpdateStatus(rt, "extracting", 3);
        var staging = Path.Combine(CacheRoot, ".staging-" + rt.Info.Key + "-" + Guid.NewGuid().ToString("N")[..6]);
        // hh.exe fails on some CHM paths (notably names with a space before ".chm").
        // Always hand it a short, plain ASCII copy.
        var hhSource = Path.Combine(CacheRoot, ".src-" + rt.Info.Key + ".chm");
        try
        {
            if (Directory.Exists(staging)) Directory.Delete(staging, true);
            Directory.CreateDirectory(staging);
            File.Copy(rt.Info.FilePath, hhSource, true);
            var hh = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "hh.exe");
            if (!File.Exists(hh)) throw new FileNotFoundException("系统缺少 hh.exe，无法解包 CHM");
            var psi = new ProcessStartInfo
            {
                FileName = hh,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            psi.ArgumentList.Add("-decompile");
            psi.ArgumentList.Add(staging);
            psi.ArgumentList.Add(hhSource);
            using (var p = Process.Start(psi) ?? throw new InvalidOperationException("无法启动 CHM 解包程序"))
            {
                var wait = p.WaitForExitAsync();
                if (await Task.WhenAny(wait, Task.Delay(TimeSpan.FromMinutes(4))).ConfigureAwait(false) != wait)
                {
                    try { p.Kill(true); } catch { }
                    throw new TimeoutException("CHM 解包超时");
                }
                await wait.ConfigureAwait(false);
            }

            var htmlFiles = Directory.EnumerateFiles(staging, "*.*", SearchOption.AllDirectories)
                .Where(f => f.EndsWith(".htm", StringComparison.OrdinalIgnoreCase) || f.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                .Where(f => !f.Contains(Path.DirectorySeparatorChar + "_dsh_text" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (htmlFiles.Count == 0)
                throw new InvalidOperationException("未能从 CHM 中解出网页内容，文件可能已损坏");

            var fileSet = new HashSet<string>(htmlFiles.Select(f => Path.GetRelativePath(staging, f).Replace('\\', '/')),
                StringComparer.OrdinalIgnoreCase);
            var hhc = Directory.EnumerateFiles(staging, "*.hhc", SearchOption.AllDirectories).FirstOrDefault();
            var toc = TocParser.Parse(hhc, fileSet);
            var tocTitles = TocParser.CollectTitles(toc);

            UpdateStatus(rt, "indexing", 8);
            var textDir = Path.Combine(staging, "_dsh_text");
            Directory.CreateDirectory(textDir);
            var pages = new List<PageInfo>(htmlFiles.Count);
            var lastReport = Stopwatch.StartNew();
            var counter = 0;
            foreach (var file in htmlFiles)
            {
                counter++;
                var rel = Path.GetRelativePath(staging, file).Replace('\\', '/');
                try
                {
                    var bytes = await File.ReadAllBytesAsync(file).ConfigureAwait(false);
                    var enc = HtmlText.DetectEncoding(bytes);
                    var html = enc.GetString(bytes);
                    var title = tocTitles.TryGetValue(rel, out var tt) && !string.IsNullOrWhiteSpace(tt)
                        ? tt
                        : HtmlText.ExtractTitle(html, Path.GetFileNameWithoutExtension(file));
                    var text = HtmlText.Extract(html);
                    var hash = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(rel)))[..20].ToLowerInvariant();
                    await File.WriteAllTextAsync(Path.Combine(textDir, hash + ".txt"), text, new UTF8Encoding(false)).ConfigureAwait(false);
                    pages.Add(new PageInfo { Path = rel, Title = title, TextHash = hash });
                    HtmlText.InjectReaderAssets(file);
                }
                catch
                {
                    // Skip unreadable page, keep the rest of the book usable.
                }

                if (lastReport.ElapsedMilliseconds > 180 || counter == htmlFiles.Count)
                {
                    lastReport.Restart();
                    UpdateStatus(rt, "indexing", 8 + (int)(86.0 * counter / htmlFiles.Count));
                }
            }

            if (pages.Count == 0)
                throw new InvalidOperationException("CHM 中没有可索引的页面");

            var manifest = new BookManifest
            {
                Version = ManifestVersion,
                SourcePath = rt.Info.FilePath,
                Size = rt.Info.Size,
                ModifiedTicks = rt.Info.ModifiedTicks,
                Title = rt.Info.Title,
                Pages = pages,
                Toc = toc
            };
            await File.WriteAllTextAsync(Path.Combine(staging, "manifest.json"),
                JsonSerializer.Serialize(manifest, JsonOptions), new UTF8Encoding(false)).ConfigureAwait(false);

            if (Directory.Exists(rt.CacheDir)) Directory.Delete(rt.CacheDir, true);
            Directory.Move(staging, rt.CacheDir);
            lock (_gate)
            {
                rt.Manifest = manifest;
                rt.Info.Status = "ready";
                rt.Info.PageCount = pages.Count;
                rt.Info.Progress = 100;
                rt.Info.Error = null;
                rt.SearchDocs = null;
            }
            Publish();
            _ = CleanupOldCachesAsync();
        }
        catch (Exception ex)
        {
            try { if (Directory.Exists(staging)) Directory.Delete(staging, true); } catch { }
            SetError(rt, ex.Message);
        }
        finally
        {
            try { if (File.Exists(hhSource)) File.Delete(hhSource); } catch { }
        }
    }

    private async Task CleanupOldCachesAsync()
    {
        try
        {
            var keep = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            lock (_gate)
                foreach (var b in _books) keep.Add(b.Info.Key);
            await Task.Run(() =>
            {
                foreach (var dir in Directory.EnumerateDirectories(CacheRoot))
                {
                    var name = Path.GetFileName(dir);
                    if (name.StartsWith('.')) continue;
                    if (!keep.Contains(name))
                    {
                        try { Directory.Delete(dir, true); } catch { }
                    }
                }
            }).ConfigureAwait(false);
        }
        catch { }
    }

    private sealed class RawSearchHit
    {
        public required BookRuntime Book { get; init; }
        public required SearchDocument Doc { get; init; }
        public required string Title { get; init; }
        public int Score { get; init; }
    }

    public async Task<SearchResponse> SearchAsync(string query, string? bookKey, int limit, CancellationToken token)
    {
        var started = Stopwatch.StartNew();
        query = (query ?? "").Trim();
        if (query.Length == 0) return new SearchResponse { Query = query };
        var terms = query.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(8).ToArray();
        if (terms.Length == 0) return new SearchResponse { Query = query };

        List<BookRuntime> books;
        lock (_gate)
            books = _books.Where(b => b.Info.Status == "ready" &&
                                      (string.IsNullOrEmpty(bookKey) || b.Info.Key.Equals(bookKey, StringComparison.OrdinalIgnoreCase)))
                          .ToList();

        var docLists = await Task.WhenAll(books.Select(b => LoadSearchDocsAsync(b, token))).ConfigureAwait(false);
        var allDocs = new List<(BookRuntime Book, SearchDocument Doc)>();
        for (var bi = 0; bi < books.Count; bi++)
            foreach (var doc in docLists[bi])
                allDocs.Add((books[bi], doc));

        var rawHits = new ConcurrentBag<RawSearchHit>();
        var total = 0;
        var options = new ParallelOptions
        {
            CancellationToken = token,
            MaxDegreeOfParallelism = Math.Clamp(Environment.ProcessorCount, 2, 8)
        };
        Parallel.ForEach(allDocs, options, pair =>
        {
            var book = pair.Book;
            var doc = pair.Doc;
            var title = doc.Page.Title ?? "";
            var all = true;
            var titleHits = 0;
            var bodyHits = 0;
            foreach (var term in terms)
            {
                var ti = title.IndexOf(term, StringComparison.OrdinalIgnoreCase);
                var bi = doc.Text.IndexOf(term, StringComparison.OrdinalIgnoreCase);
                if (ti < 0 && bi < 0) { all = false; break; }
                if (ti >= 0) titleHits++;
                if (bi >= 0)
                {
                    var from = 0;
                    var count = 0;
                    while (count < 8)
                    {
                        var idx = doc.Text.IndexOf(term, from, StringComparison.OrdinalIgnoreCase);
                        if (idx < 0) break;
                        count++;
                        from = idx + Math.Max(1, term.Length);
                    }
                    bodyHits += count;
                }
            }
            if (!all) return;
            Interlocked.Increment(ref total);
            var score = titleHits * 90 + Math.Min(bodyHits, 40) * 3;
            if (title.Equals(query, StringComparison.OrdinalIgnoreCase)) score += 160;
            else if (title.Contains(query, StringComparison.OrdinalIgnoreCase)) score += 70;
            rawHits.Add(new RawSearchHit { Book = book, Doc = doc, Title = title, Score = score });
        });

        var ordered = rawHits.OrderByDescending(h => h.Score)
            .ThenBy(h => h.Title.Length)
            .Take(Math.Clamp(limit, 1, 200))
            .ToList();

        // Snippets are relatively expensive; generate them only for the visible page.
        var results = new List<SearchHit>(ordered.Count);
        foreach (var raw in ordered)
        {
            var doc = raw.Doc;
            var title = raw.Title;
            results.Add(new SearchHit
            {
                BookKey = raw.Book.Info.Key,
                BookTitle = raw.Book.Info.Title,
                Title = string.IsNullOrWhiteSpace(title) ? doc.Page.Path : title,
                Path = doc.Page.Path,
                Snippet = BuildSnippet(doc.Text, terms),
                Score = raw.Score
            });
        }

        return new SearchResponse
        {
            Query = query,
            Total = total,
            ElapsedMs = started.ElapsedMilliseconds,
            Truncated = total > results.Count,
            Results = results
        };
    }

    private static string BuildSnippet(string text, string[] terms)
    {
        var pos = -1;
        foreach (var term in terms)
        {
            var i = text.IndexOf(term, StringComparison.OrdinalIgnoreCase);
            if (i >= 0 && (pos < 0 || i < pos)) pos = i;
        }

        string snippet;
        if (pos >= 0)
        {
            var start = Math.Max(0, pos - 52);
            var len = Math.Min(170, text.Length - start);
            snippet = (start > 0 ? "…" : "") + text.Substring(start, len).Trim() +
                      (start + len < text.Length ? "…" : "");
        }
        else
        {
            snippet = text.Length > 150 ? text[..150] + "…" : text;
        }
        return Regex.Replace(snippet, @"\s+", " ").Trim();
    }

    private async Task<List<SearchDocument>> LoadSearchDocsAsync(BookRuntime book, CancellationToken token)
    {
        if (book.SearchDocs != null) return book.SearchDocs;
        var textDir = Path.Combine(book.CacheDir, "_dsh_text");
        var pages = book.Manifest?.Pages ?? new List<PageInfo>();
        var docs = new SearchDocument[pages.Count];
        var options = new ParallelOptions
        {
            CancellationToken = token,
            MaxDegreeOfParallelism = Math.Clamp(Environment.ProcessorCount, 2, 8)
        };
        await Parallel.ForEachAsync(Enumerable.Range(0, pages.Count), options, async (i, ct) =>
        {
            var page = pages[i];
            var text = "";
            try
            {
                var f = Path.Combine(textDir, page.TextHash + ".txt");
                if (File.Exists(f))
                    text = await File.ReadAllTextAsync(f, Encoding.UTF8, ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException) { throw; }
            catch { }
            docs[i] = new SearchDocument { Page = page, Text = text };
        }).ConfigureAwait(false);
        book.SearchDocs = docs.ToList();
        return book.SearchDocs;
    }

    public void Dispose()
    {
        _disposed = true;
        try { _debounceCts?.Cancel(); } catch { }
        foreach (var w in _watchers)
        {
            try { w.EnableRaisingEvents = false; w.Dispose(); } catch { }
        }
        _watchers.Clear();
    }
}
