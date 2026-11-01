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
        TitleText.Text = $"正在下载 V{version}";
        SubText.Text = "下载完成后会校验文件完整性";
        Progress = new Progress<double>(p =>
        {
            Bar.Value = Math.Round(p * 100, 1);
            Percent.Text = $"{Bar.Value:0}%";
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
