using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;

namespace InfiniteTerminal;

public partial class MainWindow : Window
{
    private const int WM_NCLBUTTONDOWN = 0xA1;
    private const int WM_SYSCOMMAND = 0x0112;
    private const int SC_SIZE = 0xF000;
    private const int HTCAPTION = 0x2;

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _dataRoot;
    private readonly object _logLock = new();
    private ChmLibrary? _library;
    private CoreWebView2? _core;
    private CancellationTokenSource? _searchCts;
    private bool _uiReady;
    private bool _closing;

    public MainWindow()
    {
        InitializeComponent();
        _dataRoot = AppPaths.ChooseDataRoot();
        Directory.CreateDirectory(_dataRoot);
        Loaded += Window_Loaded;
        Closing += Window_Closing;
        Log("app starting");
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            SplashText.Text = "正在准备界面资源…";
            var webDir = WebAssets.EnsureExtracted(_dataRoot);

            _library = new ChmLibrary(AppContext.BaseDirectory, _dataRoot);
            _library.MessageReady += Library_MessageReady;

            SplashText.Text = "正在启动 WebView2 内核…";
            var options = new CoreWebView2EnvironmentOptions();
            var debug = Environment.GetEnvironmentVariable("DSH_WEBVIEW_DEBUG") == "1";
            if (debug)
            {
                options.AdditionalBrowserArguments = "--remote-debugging-port=9223 --remote-allow-origins=*";
                Log("webview debug port 9223");
            }

            CoreWebView2Environment env;
            var userData = Path.Combine(_dataRoot, "webview-data");
            try
            {
                Directory.CreateDirectory(userData);
                env = await CoreWebView2Environment.CreateAsync(null, userData, options);
            }
            catch (Exception first)
            {
                // A killed WebView2 host can leave its profile locked. Use a fresh
                // profile rather than making the whole application unusable.
                Log("primary webview profile failed: " + first.Message);
                userData = Path.Combine(_dataRoot, "webview-" + Guid.NewGuid().ToString("N")[..8]);
                try
                {
                    Directory.CreateDirectory(userData);
                    env = await CoreWebView2Environment.CreateAsync(null, userData, options);
                }
                catch (Exception second)
                {
                    Log("fallback webview profile failed: " + second.Message);
                    userData = Path.Combine(Path.GetTempPath(), "InfiniteTerminal-" + Guid.NewGuid().ToString("N")[..8]);
                    Directory.CreateDirectory(userData);
                    env = await CoreWebView2Environment.CreateAsync(null, userData, options);
                }
            }
            await Web.EnsureCoreWebView2Async(env);
            _core = Web.CoreWebView2;

            // Match the user's preferred reference size: everything in the
            // WebView (buttons, labels, tables, reader pages) is scaled together.
            Web.ZoomFactor = 1.15;

            _core.Settings.IsStatusBarEnabled = false;
            _core.Settings.AreDevToolsEnabled = debug;
            _core.Settings.AreDefaultContextMenusEnabled = true;
            _core.Settings.IsZoomControlEnabled = true;
            _core.Settings.IsPinchZoomEnabled = true;
            _core.Settings.IsGeneralAutofillEnabled = false;
            _core.Settings.IsPasswordAutosaveEnabled = false;
            _core.Settings.IsSwipeNavigationEnabled = false;

            _core.SetVirtualHostNameToFolderMapping("app.local", webDir, CoreWebView2HostResourceAccessKind.Allow);
            _core.SetVirtualHostNameToFolderMapping("chm.local", _library.CacheRoot, CoreWebView2HostResourceAccessKind.DenyCors);

            _core.WebMessageReceived += Core_WebMessageReceived;
            _core.NavigationStarting += Core_NavigationStarting;
            _core.FrameNavigationStarting += Core_FrameNavigationStarting;
            _core.NewWindowRequested += Core_NewWindowRequested;
            _core.NavigationCompleted += Core_NavigationCompleted;
            _core.ProcessFailed += (_, args) => Log("webview process failed: " + args.ProcessFailedKind);

            Log("navigating app");
            _core.Navigate("https://app.local/index.html?v=167");
            _library.Start();
        }
        catch (Exception ex)
        {
            Log("startup failed: " + ex);
            SplashText.Text = "启动失败：" + ex.Message;
            MessageBox.Show(this,
                "无法启动角色终端：\n\n" + ex.Message +
                "\n\n本程序需要 Microsoft Edge WebView2 运行时（Windows 11 通常已自带）。\n" +
                "如缺失，请安装 Microsoft Edge WebView2 Runtime 后重试。",
                "无限流 · 角色终端", MessageBoxButton.OK, MessageBoxImage.Error);
            Application.Current.Shutdown(1);
        }
    }

    private void Core_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess)
        {
            Log("navigation failed: " + e.WebErrorStatus);
            return;
        }
        if (_uiReady) return;
        _uiReady = true;
        Dispatcher.BeginInvoke(DispatcherPriority.Background, () =>
        {
            Web.Visibility = Visibility.Visible;
            Splash.Visibility = Visibility.Collapsed;
        });
    }

    private void Core_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (IsInternal(e.Uri) || e.Uri.StartsWith("about:", StringComparison.OrdinalIgnoreCase)) return;
        e.Cancel = true;
        OpenExternal(e.Uri);
    }

    private void Core_FrameNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (IsInternal(e.Uri) || e.Uri.StartsWith("about:", StringComparison.OrdinalIgnoreCase)) return;
        e.Cancel = true;
        OpenExternal(e.Uri);
    }

    private void Core_NewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        if (e.Uri.StartsWith("https://chm.local/", StringComparison.OrdinalIgnoreCase))
        {
            Post(new { type = "chmNewWindow", url = e.Uri });
            return;
        }
        OpenExternal(e.Uri);
    }

    private static bool IsInternal(string uri)
        => uri.StartsWith("https://app.local/", StringComparison.OrdinalIgnoreCase)
           || uri.StartsWith("https://chm.local/", StringComparison.OrdinalIgnoreCase);

    private void OpenExternal(string uri)
    {
        try
        {
            if (uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
                uri.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase))
            {
                Process.Start(new ProcessStartInfo { FileName = uri, UseShellExecute = true });
            }
        }
        catch (Exception ex) { Log("open external failed: " + ex.Message); }
    }

    private void Library_MessageReady(string json)
    {
        if (_closing) return;
        Dispatcher.BeginInvoke(DispatcherPriority.Background, () =>
        {
            try { _core?.PostWebMessageAsJson(json); }
            catch (Exception ex) { Log("post library event failed: " + ex.Message); }
        });
    }

    private async Task CheckForUpdatesAsync(bool manual)
    {
        try
        {
            var source = UpdateSource.Auto;
            if (manual)
            {
                var picker = new UpdateSourceWindow { Owner = this };
                if (picker.ShowDialog() != true) return;
                source = picker.SelectedSource;
            }
            var info = await UpdateService.CheckAsync(source);
            UpdateService.ShowResult(info, manual);
        }
        catch (Exception ex)
        {
            Log("update check failed: " + ex.Message);
            if (manual)
                new UpdateStatusWindow("检查更新失败", ex.Message, typeof(MainWindow).Assembly.GetName().Version?.ToString(3) ?? "未知", true)
                    { Owner = this }.ShowDialog();
        }
    }

    private async void Core_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeEl)) return;
            var type = typeEl.GetString() ?? "";
            var requestId = root.TryGetProperty("requestId", out var rid) ? rid.ToString() : "";

            switch (type)
            {
                case "ready":
                    SendInit();
                    _ = CheckForUpdatesAsync(false);
                    break;

                case "update.check":
                    await CheckForUpdatesAsync(true);
                    break;

                case "window":
                    HandleWindow(root.TryGetProperty("action", out var act) ? act.GetString() ?? "" : "");
                    break;

                case "ui.zoom":
                {
                    var z = root.TryGetProperty("value", out var zv) ? zv.GetDouble() : 1.15;
                    Web.ZoomFactor = 1.15;
                    break;
                }

                case "chm.refresh":
                    if (_library != null) await _library.RefreshAsync();
                    break;

                case "chm.toc":
                {
                    var key = root.TryGetProperty("bookKey", out var k) ? k.GetString() ?? "" : "";
                    var toc = _library?.GetToc(key) ?? new List<TocNode>();
                    Post(new { type = "chmToc", requestId, bookKey = key, toc });
                    break;
                }

                case "chm.search":
                    await HandleSearchAsync(root, requestId);
                    break;

                case "clipboard.copy":
                {
                    var text = root.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "";
                    try
                    {
                        Clipboard.SetText(text);
                        Post(new { type = "clipboardCopied" });
                    }
                    catch (Exception ex)
                    {
                        Log("clipboard copy failed: " + ex.Message);
                        Post(new { type = "toast", message = "复制失败，请手动选择路径" });
                    }
                    break;
                }

                case "chm.addFolder":
                    AddFolder();
                    break;

                case "chm.resetFolders":
                    _library?.RemoveExtraFolders();
                    break;

                case "chm.deleteBook":
                {
                    var key = root.TryGetProperty("bookKey", out var bk) ? bk.GetString() ?? "" : "";
                    if (_library != null)
                    {
                        var result = _library.DeleteBook(key);
                        await _library.RefreshAsync();
                        if (!result.Ok)
                            Post(new { type = "toast", message = result.Error });
                    }
                    break;
                }

                case "file.export":
                    HandleExport(root);
                    break;

                case "file.import":
                    HandleImport(requestId);
                    break;

                case "ui.error":
                    Log("UI ERROR: " + (root.TryGetProperty("message", out var msg) ? msg.GetString() : ""));
                    break;
            }
        }
        catch (Exception ex)
        {
            Log("message handling failed: " + ex);
        }
    }

    private void SendInit()
    {
        var asm = Assembly.GetExecutingAssembly().GetName();
        Post(new
        {
            type = "init",
            version = asm.Version?.ToString() ?? "1.0.0",
            appDir = _library?.AppDirectory ?? AppContext.BaseDirectory,
            dataRoot = _dataRoot,
            books = _library?.GetBooks() ?? new List<BookInfo>(),
            extraFolders = _library?.ExtraFolders ?? Array.Empty<string>()
        });
    }

    private async Task HandleSearchAsync(JsonElement root, string requestId)
    {
        var query = root.TryGetProperty("query", out var q) ? q.GetString() ?? "" : "";
        var key = root.TryGetProperty("bookKey", out var k) ? k.GetString() ?? "" : "";
        _searchCts?.Cancel();
        var cts = new CancellationTokenSource();
        _searchCts = cts;
        try
        {
            if (_library == null) return;
            var response = await Task.Run(() => _library.SearchAsync(query, string.IsNullOrEmpty(key) ? null : key, 80, cts.Token), cts.Token);
            if (cts.IsCancellationRequested) return;
            Post(new { type = "chmSearch", requestId, response });
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Log("search failed: " + ex.Message);
            if (!cts.IsCancellationRequested)
                Post(new { type = "chmSearchError", requestId, message = ex.Message });
        }
    }

    private void HandleWindow(string action)
    {
        switch (action)
        {
            case "minimize":
                WindowState = WindowState.Minimized;
                break;
            case "maximize":
                WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                break;
            case "close":
                Close();
                break;
            case "drag":
                BeginSystemDrag();
                break;
        }
    }

    private void BeginSystemDrag()
    {
        try
        {
            // DragMove() can miss the mouse-down state because the click originates
            // inside WebView2 and is delivered asynchronously. Ask the non-client
            // window manager to start the standard caption drag loop instead.
            var hwnd = new WindowInteropHelper(this).Handle;
            ReleaseCapture();
            SendMessage(hwnd, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
        }
        catch (Exception ex)
        {
            Log("window drag failed: " + ex.Message);
        }
    }

    private void ResizeBorder_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left) return;
        if (WindowState == WindowState.Maximized)
        {
            WindowState = WindowState.Normal;
            return;
        }
        if (sender is not FrameworkElement element ||
            !int.TryParse(element.Tag?.ToString(), out var direction)) return;
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            ReleaseCapture();
            SendMessage(hwnd, WM_SYSCOMMAND, (IntPtr)(SC_SIZE + direction), IntPtr.Zero);
            e.Handled = true;
        }
        catch (Exception ex)
        {
            Log("window resize failed: " + ex.Message);
        }
    }

    private void Window_StateChanged(object? sender, EventArgs e)
    {
        Post(new { type = "windowState", maximized = WindowState == WindowState.Maximized });
    }

    private void AddFolder()
    {
        var dialog = new OpenFolderDialog
        {
            Title = "选择放置 CHM 规则书的文件夹",
            Multiselect = false
        };
        if (dialog.ShowDialog(this) == true && _library != null)
        {
            _library.AddFolder(dialog.FolderName);
            Post(new { type = "toast", message = "已添加规则书目录，正在扫描" });
        }
    }

    private void HandleExport(JsonElement root)
    {
        try
        {
            var json = root.TryGetProperty("json", out var j) ? j.GetString() ?? "" : "";
            var suggested = root.TryGetProperty("name", out var n) ? n.GetString() ?? "角色卡" : "角色卡";
            foreach (var c in Path.GetInvalidFileNameChars()) suggested = suggested.Replace(c, '_');
            var dialog = new SaveFileDialog
            {
                Title = "导出角色卡存档",
                Filter = "角色卡存档 (*.json)|*.json|所有文件 (*.*)|*.*",
                DefaultExt = ".json",
                AddExtension = true,
                FileName = string.IsNullOrWhiteSpace(suggested) ? "角色卡" : suggested + ".json"
            };
            if (dialog.ShowDialog(this) == true)
            {
                File.WriteAllText(dialog.FileName, json, new UTF8Encoding(false));
                Post(new { type = "exportDone", ok = true, path = dialog.FileName });
            }
            else Post(new { type = "exportDone", ok = false });
        }
        catch (Exception ex)
        {
            Log("export failed: " + ex.Message);
            Post(new { type = "exportDone", ok = false, message = ex.Message });
        }
    }

    private void HandleImport(string requestId)
    {
        try
        {
            var dialog = new OpenFileDialog
            {
                Title = "导入角色卡存档（可多选）",
                Filter = "角色卡存档 (*.json)|*.json|所有文件 (*.*)|*.*",
                CheckFileExists = true,
                Multiselect = true
            };
            if (dialog.ShowDialog(this) != true) return;
            var files = new List<object>();
            string? firstContent = null;
            string? firstPath = null;
            var skipped = 0;
            foreach (var path in dialog.FileNames)
            {
                var info = new FileInfo(path);
                if (info.Length > 20 * 1024 * 1024)
                {
                    skipped++;
                    continue;
                }
                var content = File.ReadAllText(path, Encoding.UTF8);
                files.Add(new { name = Path.GetFileName(path), content, path });
                if (firstContent == null) { firstContent = content; firstPath = path; }
            }
            if (files.Count == 0)
            {
                Post(new { type = "importData", requestId, ok = false, message = "没有可导入的文件（单文件上限 20MB）" });
                return;
            }
            Post(new { type = "importData", requestId, ok = true, files, content = firstContent, path = firstPath, skipped });
        }
        catch (Exception ex)
        {
            Log("import failed: " + ex.Message);
            Post(new { type = "importData", requestId, ok = false, message = ex.Message });
        }
    }

    private void Post(object payload)
    {
        try
        {
            _core?.PostWebMessageAsJson(JsonSerializer.Serialize(payload, JsonOptions));
        }
        catch (Exception ex) { Log("post failed: " + ex.Message); }
    }

    private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _closing = true;
        try { _searchCts?.Cancel(); } catch { }
        try { _library?.Dispose(); } catch { }
        try { Web.Dispose(); } catch { }
    }

    private void Log(string message)
    {
        try
        {
            lock (_logLock)
            {
                File.AppendAllText(Path.Combine(_dataRoot, "app.log"),
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "  " + message + Environment.NewLine,
                    new UTF8Encoding(false));
            }
        }
        catch { }
    }
}
