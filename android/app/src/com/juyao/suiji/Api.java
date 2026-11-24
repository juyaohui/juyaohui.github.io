package com.juyao.suiji;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class Api {
    public interface Callback {
        void done(boolean ok, JSONObject data, String error);
    }

    private static final ExecutorService POOL = Executors.newCachedThreadPool();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private Api() {
    }

    public static String normalize(String raw) throws Exception {
        if (raw == null) throw new Exception("地址为空");
        String text = raw.trim();
        if (text.isEmpty()) throw new Exception("地址为空");
        if (!text.startsWith("http://") && !text.startsWith("https://")) {
            text = "http://" + text;
        }
        Uri uri = Uri.parse(text);
        String host = uri.getHost();
        if (host == null || host.isEmpty()) throw new Exception("地址格式不对");
        int port = uri.getPort() > 0 ? uri.getPort() : 5178;
        return "http://" + host + ":" + port;
    }

    public static void health(String base, Callback cb) {
        request("GET", base + "/api/health", null, null, 5000, cb);
    }

    public static void info(String base, String token, Callback cb) {
        request("GET", base + "/api/info", token, null, 5000, cb);
    }

    public static void pair(String base, String code, String deviceName, Callback cb) {
        try {
            JSONObject body = new JSONObject();
            body.put("code", code);
            JSONObject device = new JSONObject();
            device.put("name", deviceName);
            device.put("platform", "android");
            body.put("device", device);
            request("POST", base + "/api/pair", null, body, 8000, cb);
        } catch (Exception e) {
            post(cb, false, null, e.getMessage());
        }
    }

    public static void sync(String base, String token, String deviceId, JSONArray items, Callback cb) {
        try {
            JSONObject body = new JSONObject();
            body.put("deviceId", deviceId);
            body.put("clientTime", Iso.now());
            body.put("items", items);
            request("POST", base + "/api/sync", token, body, 120000, cb);
        } catch (Exception e) {
            post(cb, false, null, e.getMessage());
        }
    }

    private static void request(
            final String method,
            final String url,
            final String token,
            final JSONObject body,
            final int readTimeout,
            final Callback cb
    ) {
        POOL.execute(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(4000);
                    conn.setReadTimeout(readTimeout);
                    conn.setRequestProperty("Accept", "application/json");
                    if (token != null && !token.isEmpty()) {
                        conn.setRequestProperty("Authorization", "Bearer " + token);
                    }
                    if (body != null) {
                        byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                        conn.setDoOutput(true);
                        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        conn.setFixedLengthStreamingMode(bytes.length);
                        OutputStream os = conn.getOutputStream();
                        os.write(bytes);
                        os.close();
                    }
                    int code = conn.getResponseCode();
                    Log.d("SuijiApi", method + " " + url + " -> " + code);
                    InputStream stream = code >= 200 && code < 300
                            ? conn.getInputStream()
                            : conn.getErrorStream();
                    String text = readStream(stream);
                    JSONObject data = text.isEmpty() ? new JSONObject() : new JSONObject(text);
                    if (code >= 200 && code < 300) {
                        post(cb, true, data, null);
                    } else {
                        post(cb, false, data, data.optString("error", "HTTP " + code));
                    }
                } catch (Exception e) {
                    Log.w("SuijiApi", method + " " + url + " failed", e);
                    post(cb, false, null, friendly(e));
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        });
    }

    private static String readStream(InputStream stream) throws Exception {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }

    private static String friendly(Exception e) {
        if (e instanceof SocketTimeoutException) return "连接超时：电脑端没有响应";
        if (e instanceof ConnectException) return "连接失败：确认电脑开机、pnpm sync 正在运行、手机和电脑在同一 Wi-Fi";
        if (e instanceof UnknownHostException) return "地址解析失败：检查电脑地址";
        String message = e.getMessage();
        return message == null || message.isEmpty() ? "网络错误" : message;
    }

    private static void post(final Callback cb, final boolean ok, final JSONObject data, final String error) {
        MAIN.post(new Runnable() {
            @Override
            public void run() {
                cb.done(ok, data, error);
            }
        });
    }
}
