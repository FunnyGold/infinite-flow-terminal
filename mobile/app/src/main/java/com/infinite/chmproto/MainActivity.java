package com.infinite.chmproto;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.jchmlib.ChmFile;
import org.jchmlib.ChmTopicsTree;
import org.jchmlib.ChmUnitInfo;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Full Android shell for the character terminal.
 *
 * The desktop HTML/CSS/JS is reused unchanged. This activity supplies the same
 * message protocol as the Windows WebView2 host, with an on-device CHM library.
 */
public class MainActivity extends Activity {
    private static final int REQ_CHM = 1001;
    private static final int REQ_IMPORT_JSON = 1002;
    private static final int REQ_EXPORT_JSON = 1003;
    private static final int REQ_AVATAR = 1004;
    private static final String APP_HOST = "app.local";
    private static final String CHM_HOST = "chm.local";

    private WebView webView;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Map<String, Book> books = new LinkedHashMap<>();
    private final Object libraryLock = new Object();
    private volatile int searchGeneration = 0;
    private final Map<String, CachedSearch> searchCache = Collections.synchronizedMap(
            new LinkedHashMap<String, CachedSearch>(32, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedSearch> eldest) {
                    return size() > 24;
                }
            });

    private volatile boolean uiReady = false;
    private volatile boolean libraryScanned = false;
    private volatile String pendingImportRequest = "";
    private volatile String pendingExportJson = "";
    private volatile String pendingExportName = "";
    private ValueCallback<Uri[]> avatarCallback;

    private static final class Book {
        String key;
        String title;
        String fileName;
        String filePath;
        long size;
        long modified;
        int pageCount;
        String status = "ready";
        String error;
        JSONArray toc = new JSONArray();
        ChmFile chm;
        String encoding = "UTF-8";
    }

    private static final class CachedSearch {
        final JSONObject response;
        final long at;
        CachedSearch(JSONObject response) {
            this.response = response;
            this.at = System.currentTimeMillis();
        }
    }

    private static final class SearchPart {
        final JSONArray items = new JSONArray();
        int total = 0;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
        buildWebView();
        loadShell();
        scanLibrary(false);
        handleDebugIntent(getIntent());
    }

    private void handleDebugIntent(Intent intent) {
        if (intent == null) return;
        String extra = intent.getStringExtra("chm_path");
        if (extra == null || extra.trim().isEmpty()) return;
        io.execute(() -> {
            try {
                File src = new File(extra);
                if (!src.isAbsolute()) src = new File(getFilesDir(), extra);
                if (!src.exists()) return;
                File dir = new File(getFilesDir(), "books");
                if (!dir.exists() && !dir.mkdirs()) return;
                File out = new File(dir, src.getName());
                if (!src.getCanonicalPath().equals(out.getCanonicalPath())) copyFile(src, out);
                scanLibraryNow();
                sendLibrary();
                if (uiReady) sendInit();
            } catch (Throwable t) {
                postToast("CHM 载入失败: " + t.getMessage());
            }
        });
    }

    private void buildWebView() {
        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setBackgroundColor(0xFF11151B);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new Bridge(), "AndroidApp");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (avatarCallback != null) avatarCallback.onReceiveValue(null);
                avatarCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try {
                    startActivityForResult(i, REQ_AVATAR);
                } catch (Throwable t) {
                    avatarCallback = null;
                    return false;
                }
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return intercept(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return intercept(Uri.parse(url));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                return !(APP_HOST.equals(host) || CHM_HOST.equals(host));
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                String host = Uri.parse(url).getHost();
                return !(APP_HOST.equals(host) || CHM_HOST.equals(host));
            }
        });
        setContentView(webView);
    }

    private void loadShell() {
        try (InputStream in = getAssets().open("www/index.html")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
            String html = out.toString("UTF-8");
            webView.loadDataWithBaseURL("https://" + APP_HOST + "/", html, "text/html", "UTF-8", null);
        } catch (IOException e) {
            toast("无法载入界面: " + e.getMessage());
        }
    }

    private WebResourceResponse intercept(Uri uri) {
        if (uri == null) return null;
        String host = uri.getHost();
        if (APP_HOST.equals(host)) return appAsset(uri);
        if (!CHM_HOST.equals(host)) return null;

        String path = uri.getPath();
        if (path == null) return notFound("无效的规则书路径");
        String[] parts = path.split("/", 3);
        if (parts.length < 3) return notFound("规则书路径不完整");
        String key = parts[1];
        String rel = parts[2];
        Book book;
        synchronized (libraryLock) { book = books.get(key); }
        if (book == null || book.chm == null) return notFound("规则书未载入: " + key);
        String chmPath = "/" + rel;
        try {
            synchronized (book) {
                ChmUnitInfo ui = book.chm.resolveObject(chmPath);
                if (ui == null) {
                    String decoded = URLDecoder.decode(chmPath, "UTF-8");
                    if (!decoded.equals(chmPath)) ui = book.chm.resolveObject(decoded);
                }
                if (ui == null) return notFound("找不到页面: " + chmPath);
                ByteBuffer bb = book.chm.retrieveObject(ui);
                if (bb == null) return notFound("无法读取页面: " + chmPath);
                byte[] data = new byte[bb.remaining()];
                bb.get(data);
                String mime = mimeOf(chmPath);
                if ("text/html".equals(mime)) data = injectViewport(data);
                String enc = isTextMime(mime) ? book.encoding : null;
                return new WebResourceResponse(mime, enc, new ByteArrayInputStream(data));
            }
        } catch (Throwable t) {
            return notFound("读取失败: " + t);
        }
    }

    private WebResourceResponse appAsset(Uri uri) {
        String path = uri.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        String asset = "www/" + path.substring(1);
        String mime = mimeOf(path);
        try (InputStream in = getAssets().open(asset)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
            return new WebResourceResponse(mime, isTextMime(mime) ? "UTF-8" : null,
                    new ByteArrayInputStream(out.toByteArray()));
        } catch (IOException e) {
            return notFound("静态资源不存在: " + path);
        }
    }

    private WebResourceResponse notFound(String msg) {
        String body = "<html><body style='background:#11151b;color:#d8c8a4;font-family:sans-serif;padding:24px'>"
                + "<h3>角色终端</h3><p>" + escapeHtml(msg) + "</p></body></html>";
        return new WebResourceResponse("text/html", "UTF-8",
                new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    }

    private static String escapeHtml(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static byte[] injectViewport(byte[] data) {
        String s = new String(data, StandardCharsets.ISO_8859_1);
        String lower = s.toLowerCase(Locale.ROOT);
        if (lower.contains("name=\"viewport\"")) return data;
        int head = lower.indexOf("<head");
        if (head >= 0) {
            int end = s.indexOf('>', head);
            if (end > 0) {
                String meta = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
                return (s.substring(0, end + 1) + meta + s.substring(end + 1))
                        .getBytes(StandardCharsets.ISO_8859_1);
            }
        }
        return data;
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".htm") || p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".xml")) return "text/xml";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private static boolean isTextMime(String mime) {
        return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("xml") || mime.contains("json");
    }

    private void scanLibrary(boolean notify) {
        io.execute(() -> {
            try {
                scanLibraryNow();
                if (notify) sendLibrary();
                if (uiReady) sendInit();
            } catch (Throwable t) {
                postToast("扫描规则书失败: " + t.getMessage());
            }
        });
    }

    private void scanLibraryNow() {
        File dir = new File(getFilesDir(), "books");
        File[] files = dir.listFiles((d, n) -> n.toLowerCase(Locale.ROOT).endsWith(".chm"));
        if (files == null) files = new File[0];
        Map<String, Book> next = new LinkedHashMap<>();
        for (File f : files) {
            try {
                Book b = new Book();
                b.key = keyOf(f);
                b.fileName = f.getName();
                b.filePath = f.getAbsolutePath();
                b.size = f.length();
                b.modified = f.lastModified();
                ChmFile chm = new ChmFile(f.getAbsolutePath());
                b.chm = chm;
                b.title = chm.getTitle() == null || chm.getTitle().trim().isEmpty()
                        ? f.getName().replaceAll("(?i)\\.chm$", "") : chm.getTitle().trim();
                b.encoding = chm.getEncoding() == null ? "UTF-8" : chm.getEncoding();
                ChmTopicsTree tree = chm.getTopicsTree();
                int[] count = {0};
                JSONArray toc = new JSONArray();
                if (tree != null) {
                    for (ChmTopicsTree child : tree.children) toc.put(tocNode(child, count));
                }
                b.toc = toc;
                b.pageCount = count[0];
                b.status = "ready";
                next.put(b.key, b);
            } catch (Throwable t) {
                Book b = new Book();
                b.key = keyOf(f);
                b.fileName = f.getName();
                b.filePath = f.getAbsolutePath();
                b.size = f.length();
                b.modified = f.lastModified();
                b.title = f.getName().replaceAll("(?i)\\.chm$", "");
                b.status = "error";
                b.error = t.getMessage();
                next.put(b.key, b);
            }
        }
        synchronized (libraryLock) {
            for (Book old : books.values()) {
                if (!next.containsKey(old.key) && old.chm != null) {
                    try { old.chm.close(); } catch (Throwable ignored) { }
                }
            }
            books.clear();
            books.putAll(next);
        }
        searchGeneration++;
        searchCache.clear();
        libraryScanned = true;
    }

    private String keyOf(File f) {
        String raw = f.getName() + "|" + f.length() + "|" + f.lastModified();
        return "b" + Integer.toHexString(raw.hashCode());
    }

    private JSONObject tocNode(ChmTopicsTree node, int[] count) throws Exception {
        JSONObject o = new JSONObject();
        o.put("name", node.title == null ? "" : node.title);
        o.put("path", node.path == null ? "" : node.path);
        JSONArray children = new JSONArray();
        count[0]++;
        for (ChmTopicsTree child : node.children) children.put(tocNode(child, count));
        o.put("children", children);
        return o;
    }

    private JSONArray booksJson() throws Exception {
        JSONArray arr = new JSONArray();
        synchronized (libraryLock) {
            for (Book b : books.values()) {
                JSONObject o = new JSONObject();
                o.put("key", b.key);
                o.put("title", b.title);
                o.put("fileName", b.fileName);
                o.put("filePath", b.filePath);
                o.put("status", b.status);
                o.put("pageCount", b.pageCount);
                o.put("progress", "ready".equals(b.status) ? 100 : 0);
                o.put("error", b.error == null ? JSONObject.NULL : b.error);
                o.put("size", b.size);
                o.put("modifiedTicks", b.modified);
                arr.put(o);
            }
        }
        return arr;
    }

    private void sendInit() {
        try {
            JSONObject o = new JSONObject();
            o.put("type", "init");
            o.put("version", "0.2.0");
            o.put("appDir", getFilesDir().getAbsolutePath());
            o.put("dataRoot", getFilesDir().getAbsolutePath());
            o.put("books", booksJson());
            o.put("extraFolders", new JSONArray());
            postJson(o);
        } catch (Throwable t) {
            postToast("初始化失败: " + t.getMessage());
        }
    }

    private void sendLibrary() {
        try {
            JSONObject o = new JSONObject();
            o.put("type", "chmLibrary");
            o.put("books", booksJson());
            o.put("extraFolders", new JSONArray());
            postJson(o);
        } catch (Throwable t) {
            postToast("刷新书库失败: " + t.getMessage());
        }
    }

    private void postJson(JSONObject obj) {
        runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript(
                    "window.__androidReceive(" + obj.toString() + ")", null);
        });
    }

    private void postToast(String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_SHORT).show());
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private void pickChm() {
        runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/octet-stream", "application/x-chm", "*/*"});
            try { startActivityForResult(i, REQ_CHM); }
            catch (Throwable t) { toast("无法打开文件选择器: " + t.getMessage()); }
        });
    }

    private void pickImportJson(String requestId) {
        pendingImportRequest = requestId;
        runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "*/*"});
            try { startActivityForResult(i, REQ_IMPORT_JSON); }
            catch (Throwable t) { sendImportError(requestId, "无法打开文件选择器: " + t.getMessage()); }
        });
    }

    private void pickExportJson(String requestId, String json, String name) {
        pendingExportJson = json;
        pendingExportName = name == null ? "角色卡" : name;
        runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE, pendingExportName + ".json");
            try { startActivityForResult(i, REQ_EXPORT_JSON); }
            catch (Throwable t) { exportToDownloads(pendingExportJson, pendingExportName, "无法打开保存窗口: " + t.getMessage()); }
        });
    }

    private void sendImportError(String requestId, String message) {
        try {
            JSONObject o = new JSONObject();
            o.put("type", "importData");
            o.put("requestId", requestId);
            o.put("ok", false);
            o.put("message", message);
            postJson(o);
        } catch (Throwable ignored) { }
    }

    private void sendExportDone(boolean ok, String message) {
        try {
            JSONObject o = new JSONObject();
            o.put("type", "exportDone");
            o.put("ok", ok);
            if (message != null) o.put("message", message);
            postJson(o);
        } catch (Throwable ignored) { }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_AVATAR) {
            if (avatarCallback != null) {
                avatarCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                avatarCallback = null;
            }
            return;
        }
        if (requestCode == REQ_CHM) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
            Uri uri = data.getData();
            toast("正在导入 CHM…");
            io.execute(() -> {
                try {
                    String name = displayName(uri);
                    if (name == null || name.trim().isEmpty()) name = "book.chm";
                    if (!name.toLowerCase(Locale.ROOT).endsWith(".chm")) name += ".chm";
                    File dir = new File(getFilesDir(), "books");
                    if (!dir.exists() && !dir.mkdirs()) throw new IOException("无法创建书库目录");
                    File out = new File(dir, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                    try (InputStream in = getContentResolver().openInputStream(uri);
                         FileOutputStream fos = new FileOutputStream(out)) {
                        if (in == null) throw new IOException("无法读取文件");
                        byte[] buf = new byte[64 * 1024];
                        int n;
                        while ((n = in.read(buf)) >= 0) fos.write(buf, 0, n);
                    }
                    scanLibraryNow();
                    sendLibrary();
                    postToast("CHM 已导入");
                } catch (Throwable t) {
                    postToast("导入 CHM 失败: " + t.getMessage());
                }
            });
            return;
        }
        if (requestCode == REQ_IMPORT_JSON) {
            String requestId = pendingImportRequest;
            pendingImportRequest = "";
            if (resultCode != RESULT_OK || data == null
                    || (data.getData() == null && data.getClipData() == null)) {
                sendImportError(requestId, "未选择文件");
                return;
            }
            List<Uri> uris = new ArrayList<>();
            ClipData clip = data.getClipData();
            if (clip != null && clip.getItemCount() > 0) {
                for (int i = 0; i < clip.getItemCount(); i++) {
                    Uri uri = clip.getItemAt(i).getUri();
                    if (uri != null) uris.add(uri);
                }
            } else if (data.getData() != null) {
                uris.add(data.getData());
            }
            io.execute(() -> {
                try {
                    JSONArray files = new JSONArray();
                    String firstContent = null;
                    String firstPath = null;
                    int skipped = 0;
                    for (Uri uri : uris) {
                        try (InputStream in = getContentResolver().openInputStream(uri)) {
                            if (in == null) throw new IOException("无法读取文件");
                            ByteArrayOutputStream out = new ByteArrayOutputStream();
                            byte[] buf = new byte[8192];
                            int n;
                            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
                            if (out.size() > 20 * 1024 * 1024) {
                                skipped++;
                                continue;
                            }
                            String name = displayName(uri);
                            if (name == null || name.trim().isEmpty()) name = "角色卡.json";
                            JSONObject f = new JSONObject();
                            f.put("name", name);
                            f.put("content", out.toString("UTF-8"));
                            f.put("path", uri.toString());
                            files.put(f);
                            if (firstContent == null) {
                                firstContent = out.toString("UTF-8");
                                firstPath = uri.toString();
                            }
                        } catch (Throwable ignored) {
                            skipped++;
                        }
                    }
                    if (files.length() == 0) throw new IOException("没有可导入的文件（单文件上限 20MB）");
                    JSONObject o = new JSONObject();
                    o.put("type", "importData");
                    o.put("requestId", requestId);
                    o.put("ok", true);
                    o.put("files", files);
                    o.put("content", firstContent);
                    o.put("path", firstPath);
                    o.put("skipped", skipped);
                    postJson(o);
                } catch (Throwable t) {
                    sendImportError(requestId, t.getMessage());
                }
            });
            return;
        }
        if (requestCode == REQ_EXPORT_JSON) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                sendExportDone(false, "已取消导出");
                return;
            }
            Uri uri = data.getData();
            final String json = pendingExportJson;
            io.execute(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IOException("无法写入文件");
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                    sendExportDone(true, null);
                } catch (Throwable t) {
                    exportToDownloads(json, pendingExportName, t.getMessage());
                }
            });
        }
    }

    private void exportToDownloads(String json, String name, String originalError) {
        if (Build.VERSION.SDK_INT < 29) {
            sendExportDone(false, "系统保存窗口写入失败：" + (originalError == null ? "未知错误" : originalError)
                    + "；Android 9 及以下无法自动保存到下载目录");
            return;
        }
        io.execute(() -> {
            String base = (name == null || name.trim().isEmpty()) ? "角色卡" : name.trim();
            base = base.replaceAll("[\\\\/:*?\"<>|]", "_");
            if (base.length() > 60) base = base.substring(0, 60);
            String fileName = base + ".json";
            Uri uri = null;
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                        Environment.DIRECTORY_DOWNLOADS + "/无限流角色终端");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("无法创建下载文件");
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IOException("无法写入下载文件");
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                }
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContentResolver().update(uri, values, null, null);
                sendExportDone(true, "已保存到 下载/无限流角色终端/" + fileName);
            } catch (Throwable t) {
                if (uri != null) {
                    try { getContentResolver().delete(uri, null, null); } catch (Throwable ignored) { }
                }
                String message = "保存失败：" + (t.getMessage() == null ? t.toString() : t.getMessage());
                if (originalError != null && !originalError.isEmpty()) {
                    message += "（系统保存窗口：" + originalError + "）";
                }
                sendExportDone(false, message);
            }
        });
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) return c.getString(idx);
            }
        } catch (Throwable ignored) { }
        String p = uri.getLastPathSegment();
        return p == null ? null : p.substring(p.lastIndexOf('/') + 1);
    }

    private void copyFile(File src, File dst) throws IOException {
        try (InputStream in = new FileInputStream(src);
             FileOutputStream out = new FileOutputStream(dst)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void post(String json) {
            try {
                JSONObject o = new JSONObject(json);
                String type = o.optString("type", "");
                String requestId = o.optString("requestId", "");
                switch (type) {
                    case "ready":
                        uiReady = true;
                        if (libraryScanned) sendInit();
                        else scanLibrary(true);
                        break;
                    case "chm.toc":
                        sendToc(o.optString("bookKey", ""), requestId);
                        break;
                    case "chm.search":
                        search(o.optString("query", ""), o.optString("bookKey", ""), requestId);
                        break;
                    case "chm.refresh":
                        scanLibrary(true);
                        break;
                    case "chm.addFolder":
                        pickChm();
                        break;
                    case "chm.resetFolders":
                        break;
                    case "file.import":
                        pickImportJson(requestId);
                        break;
                    case "file.export":
                        pickExportJson(requestId, o.optString("json", ""), o.optString("name", "角色卡"));
                        break;
                    case "clipboard.copy":
                        copyClipboard(o.optString("text", ""));
                        break;
                    case "window":
                        break;
                    case "ui.error":
                        break;
                    default:
                        break;
                }
            } catch (Throwable t) {
                postToast("桥接错误: " + t.getMessage());
            }
        }

        @JavascriptInterface
        public String getVersion() {
            return "0.2.0";
        }
    }

    private void copyClipboard(String text) {
        runOnUiThread(() -> {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("角色终端", text));
                JSONObject o = new JSONObject();
                o.put("type", "clipboardCopied");
                postJson(o);
            } catch (Throwable t) {
                postToast("复制失败: " + t.getMessage());
            }
        });
    }

    private void sendToc(String bookKey, String requestId) {
        try {
            JSONObject o = new JSONObject();
            o.put("type", "chmToc");
            o.put("requestId", requestId);
            o.put("bookKey", bookKey);
            Book b;
            synchronized (libraryLock) { b = books.get(bookKey); }
            o.put("toc", b == null ? new JSONArray() : b.toc);
            postJson(o);
        } catch (Throwable t) {
            postToast("读取目录失败: " + t.getMessage());
        }
    }

    private void search(String query, String bookKey, String requestId) {
        final int generation = ++searchGeneration;
        final String cacheKey = (bookKey == null || bookKey.isEmpty() ? "*" : bookKey)
                + "\u0000" + query.toLowerCase(Locale.ROOT);
        CachedSearch cached = searchCache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() - cached.at < 10 * 60 * 1000) {
            try {
                JSONObject fresh = new JSONObject(cached.response.toString());
                fresh.put("elapsedMs", 0);
                fresh.put("cached", true);
                postSearchResult(fresh, requestId);
            } catch (Throwable ignored) {
                postSearchResult(cached.response, requestId);
            }
            return;
        }
        if (cached != null) searchCache.remove(cacheKey);

        final List<Book> targets = new ArrayList<>();
        synchronized (libraryLock) {
            if (bookKey != null && !bookKey.isEmpty()) {
                Book b = books.get(bookKey);
                if (b != null && "ready".equals(b.status)) targets.add(b);
            } else {
                for (Book b : books.values()) {
                    if ("ready".equals(b.status)) targets.add(b);
                }
            }
        }

        final long start = System.currentTimeMillis();
        if (targets.isEmpty()) {
            finishSearch(generation, query, cacheKey, requestId, new JSONArray(), 0, start);
            return;
        }

        // One thread per book, but no shared pool queue: a slow older query must
        // never make a newer query wait. Each worker checks the generation.
        new Thread(() -> {
            List<SearchPart> parts = Collections.synchronizedList(new ArrayList<>());
            List<Thread> workers = new ArrayList<>();
            for (Book b : targets) {
                Thread worker = new Thread(() -> {
                    if (generation != searchGeneration) return;
                    parts.add(searchBook(b, query, generation));
                }, "chm-search-book");
                workers.add(worker);
                worker.start();
            }
            for (Thread worker : workers) {
                try { worker.join(); } catch (InterruptedException ignored) { }
            }
            if (generation != searchGeneration) return;
            JSONArray results = new JSONArray();
            int total = 0;
            synchronized (parts) {
                for (SearchPart part : parts) {
                    total += part.total;
                    try {
                        for (int i = 0; i < part.items.length() && results.length() < 80; i++) {
                            results.put(part.items.get(i));
                        }
                    } catch (Throwable ignored) { }
                }
            }
            finishSearch(generation, query, cacheKey, requestId, results, total, start);
        }, "chm-search").start();
    }

    private SearchPart searchBook(Book b, String query, int generation) {
        SearchPart part = new SearchPart();
        if (generation != searchGeneration) return part;
        ChmFile searchChm = null;
        try {
            searchChm = new ChmFile(b.filePath);
            HashMap<String, String> hits = searchChm.indexSearch(query, false, false);
            part.total = hits.size();
            for (Map.Entry<String, String> e : hits.entrySet()) {
                if (generation != searchGeneration || part.items.length() >= 40) break;
                JSONObject h = new JSONObject();
                h.put("bookKey", b.key);
                h.put("bookTitle", b.title);
                h.put("title", e.getValue() == null ? e.getKey() : e.getValue());
                h.put("path", e.getKey());
                h.put("snippet", "");
                h.put("score", 0);
                part.items.put(h);
            }
        } catch (Throwable ignored) {
        } finally {
            if (searchChm != null) try { searchChm.close(); } catch (Throwable ignored) { }
        }
        return part;
    }

    private void finishSearch(int generation, String query, String cacheKey, String requestId,
                              JSONArray results, int total, long start) {
        if (generation != searchGeneration) return;
        try {
            JSONObject response = new JSONObject();
            response.put("query", query);
            response.put("total", total);
            response.put("elapsedMs", System.currentTimeMillis() - start);
            response.put("truncated", total > results.length());
            response.put("results", results);
            searchCache.put(cacheKey, new CachedSearch(response));
            postSearchResult(response, requestId);
        } catch (Throwable t) {
            try {
                JSONObject o = new JSONObject();
                o.put("type", "chmSearchError");
                o.put("requestId", requestId);
                o.put("message", t.getMessage());
                postJson(o);
            } catch (Throwable ignored) { }
        }
    }

    private void postSearchResult(JSONObject response, String requestId) {
        try {
            JSONObject out = new JSONObject();
            out.put("type", "chmSearch");
            out.put("requestId", requestId);
            out.put("response", response);
            postJson(out);
        } catch (Throwable ignored) { }
    }

    @Override
    protected void onDestroy() {
        synchronized (libraryLock) {
            for (Book b : books.values()) {
                if (b.chm != null) try { b.chm.close(); } catch (Throwable ignored) { }
            }
        }
        io.shutdownNow();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
