using System.Windows;

namespace InfiniteTerminal;

public partial class UpdateDownloadWindow : Window
{
    private readonly CancellationTokenSource _cts = new();

    public CancellationToken Token => _cts.Token;
    public IProgress<double> Progress { get; }

    public UpdateDownloadWindow(string version)
    {
        InitializeComponent();
        VersionText.Text = $"V{version}";
        SubText.Text = "正在连接 GitHub，准备下载更新包";
        Progress = new Progress<double>(p =>
        {
            Bar.Value = Math.Round(p * 100, 1);
            Percent.Text = $"{Bar.Value:0}%";
            if (p >= 1)
            {
                SubText.Text = "下载完成，正在校验文件完整性";
            }
            else if (p > 0)
            {
                SubText.Text = "正在下载更新包…";
            }
        });
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        _cts.Cancel();
        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        _cts.Cancel();
        base.OnClosed(e);
    }
}
