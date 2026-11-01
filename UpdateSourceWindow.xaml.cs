using System.Windows;

namespace InfiniteTerminal;

public partial class UpdateSourceWindow : Window
{
    public UpdateSource SelectedSource { get; private set; } = UpdateSource.Gitee;

    public UpdateSourceWindow()
    {
        InitializeComponent();
    }

    private void Continue_Click(object sender, RoutedEventArgs e)
    {
        SelectedSource = GiteeRadio.IsChecked == true ? UpdateSource.Gitee : UpdateSource.GitHub;
        DialogResult = true;
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
    }
}
