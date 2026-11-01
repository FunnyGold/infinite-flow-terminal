using System.Windows;

namespace InfiniteTerminal;

public partial class UpdateAvailableWindow : Window
{
    public UpdateAvailableWindow(UpdateInfo info)
    {
        InitializeComponent();
        VersionText.Text = $"V{info.Latest}";
        CurrentText.Text = $"V{info.Current}";
        LatestText.Text = $"V{info.Latest}";
        NotesText.Text = string.IsNullOrWhiteSpace(info.Notes)
            ? "本次更新内容可在 GitHub Release 页面查看。"
            : info.Notes.Trim();
    }

    private void Download_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = true;
    }

    private void Later_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
    }
}
