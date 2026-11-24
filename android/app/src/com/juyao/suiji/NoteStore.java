package com.juyao.suiji;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;

public class NoteStore {
    private static final String PREF = "suiji_notes";
    private static final String KEY = "notes";

    private final SharedPreferences sp;

    public NoteStore(Context context) {
        sp = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public ArrayList<Note> all() {
        ArrayList<Note> list = read();
        Collections.sort(list, new Comparator<Note>() {
            @Override
            public int compare(Note a, Note b) {
                return Long.compare(b.updatedAt, a.updatedAt);
            }
        });
        return list;
    }

    public ArrayList<Note> pending() {
        ArrayList<Note> out = new ArrayList<>();
        for (Note note : all()) {
            if (!note.synced) out.add(note);
        }
        return out;
    }

    public Note get(String id) {
        if (id == null) return null;
        for (Note note : read()) {
            if (id.equals(note.id)) return note;
        }
        return null;
    }

    public void upsert(Note note) {
        ArrayList<Note> list = read();
        boolean replaced = false;
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).id.equals(note.id)) {
                list.set(i, note);
                replaced = true;
                break;
            }
        }
        if (!replaced) list.add(note);
        write(list);
    }

    public void delete(String id) {
        ArrayList<Note> list = read();
        for (int i = list.size() - 1; i >= 0; i--) {
            if (list.get(i).id.equals(id)) list.remove(i);
        }
        write(list);
    }

    private ArrayList<Note> read() {
        ArrayList<Note> list = new ArrayList<>();
        try {
            String raw = sp.getString(KEY, "[]");
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null) list.add(Note.from(o));
            }
        } catch (Exception ignored) {
        }
        return list;
    }

    private void write(ArrayList<Note> list) {
        JSONArray arr = new JSONArray();
        try {
            for (Note note : list) arr.put(note.json());
        } catch (Exception ignored) {
        }
        sp.edit().putString(KEY, arr.toString()).apply();
    }
}
