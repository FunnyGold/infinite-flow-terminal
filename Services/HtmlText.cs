using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace InfiniteTerminal;

internal static class HtmlText
{
    private const string Marker = "<!--DSH-READER-ASSETS-->";
    private static readonly Regex CharsetRegex = new(
        @"charset\s*=\s*[""']?\s*(?<cs>[A-Za-z0-9_\-]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TitleRegex = new(
        @"(?is)<title\b[^>]*>(?<t>.*?)</title\s*>",
        RegexOptions.Compiled);
    private static readonly Regex TagRegex = new(@"<[^>]+>", RegexOptions.Compiled);

    static HtmlText()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public static Encoding DetectEncoding(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            return new UTF8Encoding(false, false);
        if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
            return Encoding.Unicode;
        if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
            return Encoding.BigEndianUnicode;
        var headLen = Math.Min(bytes.Length, 4096);
        var head = Encoding.Latin1.GetString(bytes, 0, headLen);
        var m = CharsetRegex.Match(head);
        if (m.Success)
        {
            var cs = m.Groups["cs"].Value.Trim().ToLowerInvariant();
            try
            {
                if (cs is "gb2312" or "gbk" or "gb18030" or "cp936")
                    return Encoding.GetEncoding(936);
                if (cs is "utf8" or "utf-8")
                    return new UTF8Encoding(false, false);
                return Encoding.GetEncoding(cs);
            }
            catch { }
        }

        try
        {
            _ = new UTF8Encoding(false, true).GetString(bytes);
            return new UTF8Encoding(false, false);
        }
        catch
        {
            return Encoding.GetEncoding(936);
        }
    }

    public static string ExtractTitle(string html, string fallback)
    {
        var m = TitleRegex.Match(html);
        if (m.Success)
        {
            var title = WebUtility.HtmlDecode(TagRegex.Replace(m.Groups["t"].Value, " "));
            title = Regex.Replace(title, @"\s+", " ").Trim();
            if (!string.IsNullOrWhiteSpace(title)) return title;
        }
        return fallback;
    }

    public static string Extract(string html)
    {
        if (string.IsNullOrEmpty(html)) return "";
        var s = html;
        s = Regex.Replace(s, @"(?is)<head\b.*?</head\s*>", " ");
        s = Regex.Replace(s, @"(?is)<(script|style|noscript|xml|template)\b.*?</\1\s*>", " ");
        s = Regex.Replace(s, @"(?is)<!--.*?-->", " ");
        s = Regex.Replace(s, @"(?i)<br\s*/?>", "\n");
        s = Regex.Replace(s, @"(?i)</(p|div|li|tr|h[1-6]|table|section|article|blockquote|pre)\s*>", "\n");
        s = Regex.Replace(s, @"(?i)</t[dh]\s*>", "\t");
        s = TagRegex.Replace(s, " ");
        s = WebUtility.HtmlDecode(s);
        s = s.Replace('\u00a0', ' ').Replace('\u3000', ' ');
        s = Regex.Replace(s, @"[ \t\f\v]+", " ");
        s = Regex.Replace(s, @" *\n *", "\n");
        s = Regex.Replace(s, @"\n{3,}", "\n\n").Trim();
        if (s.Length > 180_000) s = s[..180_000];
        return s;
    }

    public static void InjectReaderAssets(string file)
    {
        try
        {
            // The payload is ASCII only, so it can be appended to GBK/UTF-8 pages alike.
            var payload = "\r\n" + Marker + "\r\n<style id=\"dsh-reader-style\">" + Css + "</style>\r\n<script>" + Script + "</script>\r\n";
            using var fs = new FileStream(file, FileMode.Append, FileAccess.Write, FileShare.Read);
            var bytes = Encoding.ASCII.GetBytes(payload);
            fs.Write(bytes, 0, bytes.Length);
        }
        catch { }
    }

    private const string Css = """
html{background:#e9e2d4!important}
body{background:#fbf7ee!important;color:#2b2722!important;font-family:"Microsoft YaHei UI","Microsoft YaHei","Segoe UI",sans-serif!important;font-size:15px!important;line-height:1.85!important;max-width:980px!important;margin:0 auto!important;padding:38px 48px 80px!important;word-wrap:break-word!important;overflow-wrap:break-word!important}
body p,body li,body td,body th,body div,body span,body font{font-family:"Microsoft YaHei UI","Microsoft YaHei","Segoe UI",sans-serif!important;line-height:1.85!important}
body p,body li,body td,body th{font-size:15px!important}
h1,h2,h3,h4,h5,h6{font-family:"Microsoft YaHei UI",sans-serif!important;color:#7c2d2f!important;line-height:1.45!important;margin:1.4em 0 .6em!important}
h1{font-size:27px!important;border-bottom:1px solid #dfd3bd!important;padding-bottom:10px!important}
h2{font-size:22px!important}h3{font-size:18px!important}h4{font-size:16px!important}
body table{max-width:100%!important;border-collapse:collapse!important;margin:14px 0!important;table-layout:auto!important}
body td,body th{border:1px solid #d8cdb8!important;padding:6px 9px!important;vertical-align:top!important}
body th{background:#f1e8d7!important}
body img{max-width:100%!important;height:auto!important}
body a{color:#9e3b3f!important;text-decoration:none!important;border-bottom:1px solid rgba(158,59,63,.3)!important}
body a:hover{background:#f4e4c8!important}
body hr{border:none!important;border-top:1px solid #d8cdb8!important;margin:24px 0!important}
body blockquote{border-left:3px solid #c9a35f!important;margin-left:0!important;padding-left:16px!important;color:#5c5347!important}
::selection{background:#ecd3a0!important}
""";

    private const string Script = """
(function(){try{if(window.__dshReaderReady)return;window.__dshReaderReady=1;
function post(){try{parent.postMessage({type:'chmNavigated',path:location.pathname,hash:location.hash,title:document.title||''},'*')}catch(e){}}
function links(){try{var as=document.getElementsByTagName('a');for(var i=0;i<as.length;i++){if(as[i].target==='_blank')as[i].target='_self'}}catch(e){}}
document.addEventListener('DOMContentLoaded',function(){links();post()});
window.addEventListener('load',function(){links();post()});
setTimeout(function(){links();post()},80);
document.addEventListener('click',function(e){var a=e.target;while(a&&a.tagName!=='A')a=a.parentNode;if(a&&a.target==='_blank')a.target='_self';setTimeout(post,260)},true);
}catch(e){}})();
""";
}
