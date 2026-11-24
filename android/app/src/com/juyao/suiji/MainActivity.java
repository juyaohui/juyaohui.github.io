package com.juyao.suiji;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class MainActivity extends Activity {
    private static final int REQ_EDIT = 1;
    private static final int REQ_SCAN = 2;
    private static final String SITE = "https://juyaohui.github.io/";

    private NoteStore store;
    private SharedPreferences conn;

    private LinearLayout noteList;
    private TextView noteStats;
    private TextView emptyView;
    private TextView tabNotes;
    private TextView tabSync;
    private View paneNotes;
    private View paneSync;
    private TextView statusTitle;
    private TextView statusSub;
    private TextView pendingText;
    private TextView syncBtn;
    private TextView addrText;
    private TextView connState;

    private boolean refreshing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new NoteStore(this);
        conn = getSharedPreferences("suiji_conn", MODE_PRIVATE);
        setContentView(R.layout.activity_main);

        noteList = findViewById(R.id.noteList);
        noteStats = findViewById(R.id.noteStats);
        emptyView = findViewById(R.id.emptyView);
        tabNotes = findViewById(R.id.tabNotes);
        tabSync = findViewById(R.id.tabSync);
        paneNotes = findViewById(R.id.paneNotes);
        paneSync = findViewById(R.id.paneSync);
        statusTitle = findViewById(R.id.statusTitle);
        statusSub = findViewById(R.id.statusSub);
        pendingText = findViewById(R.id.pendingText);
        syncBtn = findViewById(R.id.syncBtn);
        addrText = findViewById(R.id.addrText);
        connState = findViewById(R.id.connState);

        findViewById(R.id.newNote).setOnClickListener(v ->
                startActivityForResult(new Intent(this, NoteEditActivity.class), REQ_EDIT));
        findViewById(R.id.scanBtn).setOnClickListener(v ->
                startActivityForResult(new Intent(this, QrScanActivity.class), REQ_SCAN));
        findViewById(R.id.syncBtn).setOnClickListener(v -> doSync());
        findViewById(R.id.testBtn).setOnClickListener(v -> testConnection());
        findViewById(R.id.unpairBtn).setOnClickListener(v -> confirmUnpair());
        findViewById(R.id.manualBtn).setOnClickListener(v -> showManualPair());
        findViewById(R.id.openSite).setOnClickListener(v -> openSite());

        tabNotes.setOnClickListener(v -> selectTab(0));
        tabSync.setOnClickListener(v -> selectTab(1));

        selectTab(0);
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderNotes();
        refreshStatus();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_EDIT && resultCode == RESULT_OK) {
            renderNotes();
            refreshStatus();
        }
        if (requestCode == REQ_SCAN && resultCode == RESULT_OK && data != null) {
            handleQr(data.getStringExtra("qr"));
        }
    }

    private void selectTab(int index) {
        boolean notes = index == 0;
        paneNotes.setVisibility(notes ? View.VISIBLE : View.GONE);
        paneSync.setVisibility(notes ? View.GONE : View.VISIBLE);
        styleTab(tabNotes, notes);
        styleTab(tabSync, !notes);
        if (!notes) {
            refreshStatus();
            renderNotes();
        }
    }

    private void styleTab(TextView tab, boolean on) {
        tab.setBackgroundResource(on ? R.drawable.bg_tab_on : R.drawable.bg_tab_off);
        tab.setTextColor(getColor(on ? R.color.accent : R.color.ink2));
        tab.setTypeface(null, on ? Typeface.BOLD : Typeface.NORMAL);
    }

    // ---------------- notes ----------------

    private void renderNotes() {
        ArrayList<Note> notes = store.all();
        int pending = store.pending().size();
        noteStats.setText(notes.size() + " 条笔记 · " + pending + " 待同步");
        pendingText.setText(String.valueOf(pending));
        emptyView.setVisibility(notes.isEmpty() ? View.VISIBLE : View.GONE);
        noteList.removeAllViews();
        for (Note note : notes) noteList.addView(buildRow(note));
    }

    private View buildRow(final Note note) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setPadding(dp(16), dp(14), dp(16), dp(14));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(10);
        card.setLayoutParams(lp);

        TextView title = new TextView(this);
        title.setText(note.displayTitle());
        title.setTextColor(getColor(R.color.ink));
        title.setTextSize(16);
        title.setTypeface(null, Typeface.BOLD);
        title.setMaxLines(1);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        card.addView(title);

        String snippet = note.snippet();
        if (!snippet.isEmpty()) {
            TextView body = new TextView(this);
            body.setText(snippet);
            body.setTextColor(getColor(R.color.ink2));
            body.setTextSize(13);
            body.setMaxLines(2);
            body.setEllipsize(android.text.TextUtils.TruncateAt.END);
            body.setLineSpacing(dp(2), 1f);
            LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            blp.topMargin = dp(5);
            card.addView(body, blp);
        }

        LinearLayout meta = new LinearLayout(this);
        meta.setOrientation(LinearLayout.HORIZONTAL);
        meta.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams mlp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        mlp.topMargin = dp(10);

        TextView tag = new TextView(this);
        tag.setText(note.targetLabel());
        tag.setTextColor(getColor(R.color.accent));
        tag.setTextSize(10);
        tag.setBackgroundResource(R.drawable.bg_tag);
        tag.setPadding(dp(8), dp(2), dp(8), dp(2));
        meta.addView(tag);

        View spacer = new View(this);
        meta.addView(spacer, new LinearLayout.LayoutParams(0, 1, 1f));

        TextView status = new TextView(this);
        status.setText(note.synced ? "已同步" : "未同步");
        status.setTextColor(getColor(note.synced ? R.color.ok : R.color.warn));
        status.setTextSize(10);
        meta.addView(status);

        TextView time = new TextView(this);
        time.setText(formatDate(note.updatedAt));
        time.setTextColor(getColor(R.color.ink3));
        time.setTextSize(10);
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        tlp.leftMargin = dp(10);
        meta.addView(time, tlp);

        card.addView(meta, mlp);

        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, NoteEditActivity.class);
            intent.putExtra("note_id", note.id);
            startActivityForResult(intent, REQ_EDIT);
        });
        card.setOnLongClickListener(v -> {
            confirmDelete(note);
            return true;
        });
        return card;
    }

    private void confirmDelete(final Note note) {
        new AlertDialog.Builder(this)
                .setTitle("删除笔记")
                .setMessage("确定删除「" + note.displayTitle() + "」？")
                .setPositiveButton("删除", (dialog, which) -> {
                    store.delete(note.id);
                    renderNotes();
                    refreshStatus();
                })
                .setNegativeButton("取消", null)
                .show();
    }

    // ---------------- sync status ----------------

    private void refreshStatus() {
        if (refreshing) return;
        final String base = conn.getString("server", "");
        final String token = conn.getString("token", "");
        int pending = store.pending().size();
        pendingText.setText(String.valueOf(pending));

        if (base.isEmpty() || token.isEmpty()) {
            statusTitle.setText("电脑未连接");
            statusSub.setText("电脑运行 pnpm sync 后，点下方「扫码配对」");
            connState.setText(token.isEmpty() ? "未配对" : "已配对，但未设置地址");
            addrText.setText(base.isEmpty() ? "未设置" : base);
            return;
        }

        refreshing = true;
        statusTitle.setText("正在检查电脑…");
        statusSub.setText(base);
        addrText.setText(base);

        Api.health(base, (ok, data, error) -> {
            if (!ok) {
                refreshing = false;
                setOffline(error);
                return;
            }
            Api.info(base, token, (ok2, info, error2) -> {
                refreshing = false;
                if (!ok2) {
                    setOffline(error2);
                    return;
                }
                String name = info.optString("name", "电脑");
                String last = info.optString("lastSyncAt", "");
                JSONObject commit = info.optJSONObject("lastCommit");
                String sha = commit != null ? commit.optString("sha", "") : "";
                statusTitle.setText("电脑在线 · " + name);
                statusSub.setText("最近同步 " + (last.isEmpty() ? "还没有" : pretty(last))
                        + (sha.isEmpty() ? "" : " · 提交 " + sha));
                connState.setText("已配对 · 可以同步");
                addrText.setText(base);
                syncBtn.setEnabled(true);
            });
        });
    }

    private void setOffline(String message) {
        statusTitle.setText("电脑离线");
        statusSub.setText(message == null || message.isEmpty()
                ? "检查电脑是否开机、pnpm sync 是否在运行、手机和电脑是否同一 Wi-Fi"
                : message);
        connState.setText("已配对 · 电脑未响应");
        syncBtn.setEnabled(true);
    }

    private void testConnection() {
        String base = conn.getString("server", "");
        if (base.isEmpty()) {
            toast("先扫码配对，或点「手动输入」");
            return;
        }
        toast("正在连接…");
        Api.health(base, (ok, data, error) -> {
            if (ok) {
                toast("连接成功");
                refreshStatus();
            } else {
                toast(error);
            }
        });
    }

    // ---------------- pairing ----------------

    private void handleQr(String text) {
        if (text == null) return;
        Uri uri = Uri.parse(text.trim());
        String host = uri.getHost();
        String code = uri.getQueryParameter("code");
        int port = uri.getPort() > 0 ? uri.getPort() : 5178;
        if (host == null || host.isEmpty() || code == null || code.isEmpty()) {
            toast("这不是电脑端的配对二维码");
            return;
        }
        String base = "http://" + host + ":" + port;
        conn.edit().putString("server", base).apply();
        addrText.setText(base);
        selectTab(1);
        pair(base, code);
    }

    private void pair(final String base, String code) {
        final AlertDialog dialog = new AlertDialog.Builder(this)
                .setMessage("正在配对…")
                .setCancelable(false)
                .create();
        dialog.show();
        Api.pair(base, code, Build.MODEL, (ok, data, error) -> {
            if (dialog.isShowing()) dialog.dismiss();
            if (!ok) {
                android.util.Log.w("Suiji", "pair failed: " + error);
                toast(error == null ? "配对失败" : error);
                return;
            }
            String token = data.optString("token", "");
            JSONObject device = data.optJSONObject("device");
            String deviceId = device != null ? device.optString("id", "") : "";
            if (token.isEmpty()) {
                toast("配对失败：没有拿到令牌");
                return;
            }
            conn.edit()
                    .putString("server", base)
                    .putString("token", token)
                    .putString("deviceId", deviceId)
                    .apply();
            toast("配对成功");
            refreshStatus();
        });
    }

    private void showManualPair() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(20), dp(8), dp(20), 0);

        final EditText address = new EditText(this);
        address.setHint("电脑地址，如 192.168.1.2:5178");
        address.setSingleLine(true);
        address.setText(conn.getString("server", "").replace("http://", ""));
        box.addView(address);

        final EditText code = new EditText(this);
        code.setHint("6 位配对码");
        code.setSingleLine(true);
        code.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        box.addView(code);

        new AlertDialog.Builder(this)
                .setTitle("手动配对")
                .setView(box)
                .setPositiveButton("配对", (dialog, which) -> {
                    try {
                        String base = Api.normalize(address.getText().toString());
                        String value = code.getText().toString().trim();
                        if (!value.matches("\\d{6}")) {
                            toast("配对码是 6 位数字");
                            return;
                        }
                        conn.edit().putString("server", base).apply();
                        pair(base, value);
                    } catch (Exception e) {
                        toast("地址格式不对，例如 192.168.1.2:5178");
                    }
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void confirmUnpair() {
        if (conn.getString("token", "").isEmpty()) {
            toast("还没有配对");
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("解除配对")
                .setMessage("解除后需要重新扫码才能同步，手机上的笔记不会删除。")
                .setPositiveButton("解除", (dialog, which) -> {
                    clearPairing();
                    toast("已解除配对");
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void clearPairing() {
        conn.edit().remove("token").remove("deviceId").remove("lastSha").remove("lastSync").apply();
        renderNotes();
        refreshStatus();
    }

    // ---------------- sync ----------------

    private void doSync() {
        final String base = conn.getString("server", "");
        final String token = conn.getString("token", "");
        final String deviceId = conn.getString("deviceId", "");

        if (base.isEmpty() || token.isEmpty()) {
            selectTab(1);
            toast("先点「扫码配对」，把手机和电脑连起来");
            return;
        }
        final ArrayList<Note> pending = store.pending();
        if (pending.isEmpty()) {
            toast("没有待同步的笔记");
            return;
        }

        JSONArray items = new JSONArray();
        try {
            for (Note note : pending) {
                JSONObject o = new JSONObject();
                o.put("id", note.id);
                o.put("title", note.displayTitle());
                o.put("content", note.content == null ? "" : note.content);
                JSONArray tags = new JSONArray();
                for (String tag : note.tagList()) tags.put(tag);
                o.put("tags", tags);
                o.put("target", note.target);
                o.put("createdAt", Iso.format(note.createdAt));
                o.put("updatedAt", Iso.format(note.updatedAt));
                items.put(o);
            }
        } catch (Exception e) {
            toast("生成同步数据失败");
            return;
        }

        syncBtn.setText("同步中…");
        syncBtn.setEnabled(false);
        Api.sync(base, token, deviceId, items, (ok, data, error) -> {
            syncBtn.setText("一键同步到电脑");
            syncBtn.setEnabled(true);
            if (!ok) {
                String message = error == null ? "同步失败" : error;
                if (message.contains("令牌") || message.contains("配对")) {
                    clearPairing();
                    toast("配对已失效，请重新扫码");
                } else {
                    toast(message);
                }
                refreshStatus();
                return;
            }

            JSONArray files = data.optJSONArray("files");
            int count = 0;
            for (int i = 0; i < pending.size(); i++) {
                JSONObject file = files != null ? files.optJSONObject(i) : null;
                String status = file != null ? file.optString("status", "") : "";
                if (!"rejected".equals(status)) {
                    Note note = pending.get(i);
                    note.synced = true;
                    store.upsert(note);
                    count++;
                }
            }

            JSONObject commit = data.optJSONObject("commit");
            String sha = commit != null ? commit.optString("sha", "") : "";
            boolean pushed = commit != null && commit.optBoolean("pushed", false);
            conn.edit()
                    .putLong("lastSync", System.currentTimeMillis())
                    .putString("lastSha", sha)
                    .apply();

            String message;
            if (commit == null) {
                message = "已写入电脑 " + count + " 条";
            } else if (pushed) {
                message = "已同步并推送 " + sha;
            } else {
                message = "已写入电脑，本地提交 " + sha;
            }
            toast(message);
            renderNotes();
            refreshStatus();
        });
    }

    // ---------------- misc ----------------

    private void openSite() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE)));
        } catch (Exception e) {
            toast("没有可用的浏览器");
        }
    }

    private String pretty(String iso) {
        try {
            SimpleDateFormat in = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            in.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = in.parse(iso);
            if (date == null) return iso;
            SimpleDateFormat out = new SimpleDateFormat("MM-dd HH:mm", Locale.CHINA);
            return out.format(date);
        } catch (Exception e) {
            return iso.replace("T", " ").replace("Z", "");
        }
    }

    private String formatDate(long millis) {
        if (millis <= 0) return "";
        return new SimpleDateFormat("MM-dd HH:mm", Locale.CHINA).format(new Date(millis));
    }

    private int dp(int value) {
        return Math.round(getResources().getDisplayMetrics().density * value);
    }

    private void toast(String text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }
}
