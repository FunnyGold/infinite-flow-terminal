using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Windows;

namespace InfiniteTerminal;

public sealed record UpdateInfo(
    bool Available,
    string Current,
    string Latest,
    string ReleaseUrl,
    string Notes,
    string? Error = null);

public static class UpdateService
{
    private const string Owner = "FunnyGold";
    private const string Repo = "infinite-flow-terminal";
    private static readonly HttpClient Http = CreateClient();

    private static HttpClient CreateClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(12) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("InfiniteTerminal-Updater/1.0");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        return client;
    }

    public static async Task<UpdateInfo> CheckAsync(CancellationToken ct = default)
    {
        var current = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(0, 0, 0);
        try
        {
            using var response = await Http.GetAsync(
                $"https://api.github.com/repos/{Owner}/{Repo}/releases/latest", ct);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return new(false, current.ToString(3), "", "", "", "仓库没有 Release");
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;
            var tag = root.TryGetProperty("tag_name", out var t) ? t.GetString() ?? "" : "";
            var url = root.TryGetProperty("html_url", out var u) ? u.GetString() ?? "" : "";
            var body = root.TryGetProperty("body", out var b) ? b.GetString() ?? "" : "";
            var latest = ParseVersion(tag);
            if (latest == null)
                return new(false, current.ToString(3), tag, url, body, "版本号无法解析");

            var available = latest > current;
            return new(available, current.ToString(3), latest.ToString(3), url, body);
        }
        catch (Exception ex)
        {
            return new(false, current.ToString(3), "", "", "", ex.Message);
        }
    }

    public static void ShowResult(UpdateInfo info, bool manual)
    {
        if (info.Available)
        {
            var notes = string.IsNullOrWhiteSpace(info.Notes) ? "（无更新说明）" : info.Notes.Trim();
            if (notes.Length > 600) notes = notes[..600] + "…";
            var result = MessageBox.Show(
                $"发现新版本 V{info.Latest}\n\n当前版本：V{info.Current}\n\n{notes}\n\n是否打开下载页面？",
                "检查更新", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (result == MessageBoxResult.Yes && !string.IsNullOrWhiteSpace(info.ReleaseUrl))
                Process.Start(new ProcessStartInfo(info.ReleaseUrl) { UseShellExecute = true });
            return;
        }

        if (!manual) return;
        if (!string.IsNullOrWhiteSpace(info.Error))
            MessageBox.Show("检查更新失败：\n" + info.Error, "检查更新", MessageBoxButton.OK, MessageBoxImage.Warning);
        else
            MessageBox.Show($"当前已是最新版本：V{info.Current}", "检查更新", MessageBoxButton.OK, MessageBoxImage.Information);
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
