package com.juyao.suiji;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Note {
    private static final Pattern IMAGE_REF = Pattern.compile("/images/mobile/([A-Za-z0-9._-]+)");

    public String id = "";
    public String title = "";
    public String content = "";
    public String tags = "";
    public String target = "essay";
    public long createdAt;
    public long updatedAt;
    public boolean synced;

    public static Note from(JSONObject o) {
        Note n = new Note();
        n.id = o.optString("id", "");
        n.title = o.optString("title", "");
        n.content = o.optString("content", "");
        n.tags = o.optString("tags", "");
        n.target = o.optString("target", "essay");
        n.createdAt = o.optLong("createdAt", 0);
        n.updatedAt = o.optLong("updatedAt", 0);
        n.synced = o.optBoolean("synced", false);
        return n;
    }

    public JSONObject json() throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("title", title);
        o.put("content", content);
        o.put("tags", tags);
        o.put("target", target);
        o.put("createdAt", createdAt);
        o.put("updatedAt", updatedAt);
        o.put("synced", synced);
        return o;
    }

    public String displayTitle() {
        if (title != null && !title.trim().isEmpty()) return title.trim();
        return "无标题";
    }

    public String snippet() {
        if (content == null) return "";
        String text = content
                .replaceAll("!\\[[^\\]]*\\]\\(/images/mobile/[^)]+\\)", " ")
                .replace("\r", " ")
                .replace("\n", " ")
                .trim();
        if (text.length() <= 80) return text;
        return text.substring(0, 80) + "…";
    }

    public ArrayList<String> imageNames() {
        ArrayList<String> out = new ArrayList<>();
        if (content == null) return out;
        Matcher matcher = IMAGE_REF.matcher(content);
        while (matcher.find()) {
            String name = matcher.group(1);
            if (!out.contains(name)) out.add(name);
        }
        return out;
    }

    public int imageCount() {
        return imageNames().size();
    }

    public ArrayList<String> tagList() {
        ArrayList<String> out = new ArrayList<>();
        if (tags == null) return out;
        for (String part : tags.split("[,，\\s]+")) {
            String t = part.replace("#", "").trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    public String targetLabel() {
        if ("tech".equals(target)) return "技术";
        if ("note".equals(target)) return "笔记";
        return "随笔";
    }
}
