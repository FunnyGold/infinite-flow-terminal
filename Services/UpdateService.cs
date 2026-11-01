using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using System.Windows;

namespace InfiniteTerminal;

public sealed record UpdateInfo(
    bool Available,
    string Current,
    string Latest,
    string ReleaseUrl,
    string Notes,
    string? AssetName = null,
    string? AssetUrl = null,
    string? Sha256 = null,
    string? Error = null);

public sealed record DownloadResult(bool Ok, string Path, bool Verified, string? Error = null);

public static class UpdateService
{
    private const string Owner = "FunnyGold";
    private const string Repo = "infinite-flow-terminal";

    private static readonly HttpClient ApiHttp = CreateApiClient();
    private static readonly HttpClient WebHttp = CreateWebClient();
    private static readonly HttpClient DownloadHttp = new() { Timeout = TimeSpan.FromMinutes(15) };

    private static HttpClient CreateWebClient()
    {
        var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(15) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("InfiniteTerminal-Updater/1.0");
        return client;
    }

    private static HttpClient CreateApiClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("InfiniteTerminal-Updater/1.0");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        return client;
    }

    public static async Task<UpdateInfo> CheckAsync(CancellationToken ct = default)
    {
        var current = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(0, 0, 0);
        try
        {
            // /releases/latest is a web redirect, not the rate-limited REST API.
            using var response = await WebHttp.GetAsync(
                $"https://github.com/{Owner}/{Repo}/releases/latest",
                HttpCompletionOption.ResponseHeadersRead, ct);

            var location = response.Headers.Location?.ToString();
            if (string.IsNullOrWhiteSpace(location))
                return new(false, current.ToString(3), "", "", "", Error: "无法读取最新版本");

            var tag = location.TrimEnd('/').Split('/').Last();
            var latest = ParseVersion(tag);
            if (latest == null)
                return new(false, current.ToString(3), tag, "", "", Error: "版本号无法解析");

            var releaseUrl = $"https://github.com/{Owner}/{Repo}/releases/tag/{tag}";
            var assetName = $"InfiniteFlowTerminal-{tag}-Windows.zip";
            var assetUrl = $"https://github.com/{Owner}/{Repo}/releases/download/{tag}/{assetName}";
            var sumsUrl = $"https://github.com/{Owner}/{Repo}/releases/download/{tag}/SHA256SUMS.txt";
            var sha = await TryReadChecksumAsync(sumsUrl, assetName, ct);
            var available = latest > current;
            return new(available, current.ToString(3), latest.ToString(3), releaseUrl, "", assetName, assetUrl, sha);
        }
        catch (Exception ex)
        {
            return new(false, current.ToString(3), "", "", "", Error: ex.Message);
        }
    }

    public static async Task<DownloadResult> DownloadAsync(
        UpdateInfo info, IProgress<double>? progress, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(info.AssetUrl) || string.IsNullOrWhiteSpace(info.AssetName))
            return new(false, "", false, "没有可下载的更新包");

        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "InfiniteTerminal", "updates", info.Latest);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, info.AssetName);

        try
        {
            using var response = await DownloadHttp.GetAsync(
                info.AssetUrl, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            var total = response.Content.Headers.ContentLength ?? 0;
            await using var input = await response.Content.ReadAsStreamAsync(ct);
            await using var output = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
            var buffer = new byte[81920];
            long done = 0;
            int read;
            while ((read = await input.ReadAsync(buffer, ct)) > 0)
            {
                await output.WriteAsync(buffer.AsMemory(0, read), ct);
                done += read;
                if (total > 0) progress?.Report((double)done / total);
            }

            if (string.IsNullOrWhiteSpace(info.Sha256))
                return new(true, path, false, "Release 未提供 SHA256，无法校验完整性");

            var hash = await ComputeSha256Async(path, ct);
            if (!hash.Equals(info.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                try { File.Delete(path); } catch { }
                return new(false, path, false, "SHA256 校验失败，更新包不完整或被篡改");
            }
            progress?.Report(1);
            return new(true, path, true);
        }
        catch (OperationCanceledException)
        {
            return new(false, path, false, "下载已取消");
        }
        catch (Exception ex)
        {
            return new(false, path, false, ex.Message);
        }
    }

    public static async Task<string?> TryReadChecksumAsync(string url, string fileName, CancellationToken ct)
    {
        try
        {
            var text = await ApiHttp.GetStringAsync(url, ct);
            foreach (var line in text.Split('\n'))
            {
                var parts = line.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2 && parts[1].TrimStart('*').Equals(fileName, StringComparison.OrdinalIgnoreCase))
                    return parts[0];
            }
        }
        catch { }
        return null;
    }

    private static async Task<string> ComputeSha256Async(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static void ShowResult(UpdateInfo info, bool manual)
    {
        if (info.Available)
        {
            var notes = string.IsNullOrWhiteSpace(info.Notes) ? "（无更新说明）" : info.Notes.Trim();
            if (notes.Length > 600) notes = notes[..600] + "…";
            var result = MessageBox.Show(
                $"发现新版本 V{info.Latest}\n\n当前版本：V{info.Current}\n\n{notes}\n\n是否下载更新包？",
                "检查更新", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (result == MessageBoxResult.Yes)
                _ = DownloadAndOfferAsync(info);
            return;
        }

        if (!manual) return;
        if (!string.IsNullOrWhiteSpace(info.Error))
            MessageBox.Show("检查更新失败：\n" + info.Error, "检查更新", MessageBoxButton.OK, MessageBoxImage.Warning);
        else
            MessageBox.Show($"当前已是最新版本：V{info.Current}", "检查更新", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private static async Task DownloadAndOfferAsync(UpdateInfo info)
    {
        var win = new UpdateDownloadWindow(info.Latest) { Owner = Application.Current?.MainWindow };
        win.Show();
        var result = await DownloadAsync(info, win.Progress, win.Token);
        win.Close();

        if (!result.Ok)
        {
            if (result.Error != "下载已取消")
            {
                var open = MessageBox.Show(
                    "下载更新失败：\n" + (result.Error ?? "未知错误") +
                    "\n\n是否打开 GitHub 下载页？",
                    "下载失败", MessageBoxButton.YesNo, MessageBoxImage.Warning);
                if (open == MessageBoxResult.Yes && !string.IsNullOrWhiteSpace(info.ReleaseUrl))
                    Process.Start(new ProcessStartInfo(info.ReleaseUrl) { UseShellExecute = true });
            }
            return;
        }

        if (result.Verified)
        {
            var install = MessageBox.Show(
                "更新包已下载并通过 SHA256 校验。\n\n是否立即重启并更新？\n\n当前版本会先备份，更新完成后自动启动。",
                "安装更新", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (install == MessageBoxResult.Yes)
            {
                if (UpdateInstaller.Start(info, result.Path, out var error))
                {
                    Application.Current?.Shutdown();
                    return;
                }
                MessageBox.Show("启动更新失败：\n" + error, "安装更新", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
        else
        {
            MessageBox.Show(
                "更新包已下载，但 Release 未提供 SHA256，无法自动安装。\n\n文件：" + result.Path,
                "下载完成", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        var answer = MessageBox.Show(
            "是否打开更新文件所在文件夹？",
            "下载完成", MessageBoxButton.YesNo, MessageBoxImage.Information);
        if (answer == MessageBoxResult.Yes)
            Process.Start(new ProcessStartInfo("explorer.exe", $"/select,\"{result.Path}\"") { UseShellExecute = true });
    }
    private static Version? ParseVersion(string tag)
    {
        var text = tag.Trim().TrimStart('v', 'V');
        var dash = text.IndexOf('-');
        if (dash >= 0) text = text[..dash];
        var parts = text.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return null;
        var nums = new int[3];
        for (var i = 0; i < 3 && i < parts.Length; i++)
            if (!int.TryParse(parts[i], out nums[i])) return null;
        return new Version(nums[0], nums[1], nums[2]);
    }
}
