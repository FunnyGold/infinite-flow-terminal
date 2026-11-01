using System.Windows;
using System.Windows.Threading;

namespace InfiniteTerminal;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception ex)
                ShowFatal(ex);
        };
        DispatcherUnhandledException += (_, args) =>
        {
            ShowFatal(args.Exception);
            args.Handled = true;
        };
        base.OnStartup(e);
    }

    private static void ShowFatal(Exception ex)
    {
        try
        {
            MessageBox.Show(
                "程序遇到未处理的错误：\n\n" + ex.Message +
                "\n\n若问题持续，请删除 %LOCALAPPDATA%\\InfiniteTerminal 下的缓存后重试。",
                "无限流角色终端", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch
        {
            // ignore
        }
    }
}
