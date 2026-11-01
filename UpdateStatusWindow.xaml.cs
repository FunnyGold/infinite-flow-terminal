using System.Windows;
using System.Windows.Media;

namespace InfiniteTerminal;

public partial class UpdateStatusWindow : Window
{
    public UpdateStatusWindow(string title, string message, string currentVersion, bool error = false)
    {
        InitializeComponent();
        TitleText.Text = title;
        VersionText.Text = $"当前版本 V{currentVersion}";
        MessageText.Text = message;
        if (error)
        {
            GlyphText.Text = "!";
            GlyphText.Foreground = new SolidColorBrush(Color.FromRgb(0xD7, 0x9A, 0x6A));
            IconBorder.Background = new SolidColorBrush(Color.FromRgb(0x2A, 0x1D, 0x18));
            IconBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(0x7A, 0x4E, 0x36));
        }
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
