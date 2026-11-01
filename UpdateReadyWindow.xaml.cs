using System.Windows;

namespace InfiniteTerminal;

public partial class UpdateReadyWindow : Window
{
    public bool Proceed { get; private set; }

    public UpdateReadyWindow(string version)
    {
        InitializeComponent();
        VersionText.Text = $"V{version}";
    }

    private void Update_Click(object sender, RoutedEventArgs e)
    {
        Proceed = true;
        DialogResult = true;
    }

    private void Later_Click(object sender, RoutedEventArgs e)
    {
        Proceed = false;
        DialogResult = false;
    }
}
