package com.juyao.suiji;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

public class NoteEditActivity extends Activity {
    private static final int REQ_IMAGE = 1;

    private NoteStore store;
    private String noteId;
    private String target = "essay";
    private boolean dirty = false;
    private boolean loading = false;

    private EditText titleInput;
    private EditText contentInput;
    private EditText tagsInput;
    private TextView targetEssay;
    private TextView targetTech;
    private TextView targetNote;
    private TextView wordCount;
    private TextView screenTitle;
    private TextView imageCount;
    private HorizontalScrollView imageScroll;
    private LinearLayout imageStrip;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_note);
        store = new NoteStore(this);

        titleInput = findViewById(R.id.titleInput);
        contentInput = findViewById(R.id.contentInput);
        tagsInput = findViewById(R.id.tagsInput);
        targetEssay = findViewById(R.id.targetEssay);
        targetTech = findViewById(R.id.targetTech);
        targetNote = findViewById(R.id.targetNote);
        wordCount = findViewById(R.id.wordCount);
        screenTitle = findViewById(R.id.screenTitle);
        imageCount = findViewById(R.id.imageCount);
        imageScroll = findViewById(R.id.imageScroll);
        imageStrip = findViewById(R.id.imageStrip);

        noteId = getIntent().getStringExtra("note_id");
        if (noteId != null) {
            Note note = store.get(noteId);
            if (note != null) {
                loading = true;
                titleInput.setText(note.title);
                contentInput.setText(note.content);
                tagsInput.setText(note.tags);
                target = note.target;
                loading = false;
                screenTitle.setText("编辑笔记");
            }
        }
        selectTarget(target);
        updateWordCount();
        refreshImageStrip();

        targetEssay.setOnClickListener(v -> selectTarget("essay"));
        targetTech.setOnClickListener(v -> selectTarget("tech"));
        targetNote.setOnClickListener(v -> selectTarget("note"));
        findViewById(R.id.addImage).setOnClickListener(v -> chooseImage());

        findViewById(R.id.saveBtn).setOnClickListener(v -> save());
        findViewById(R.id.cancelBtn).setOnClickListener(v -> confirmDiscard());

        TextWatcher watcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
            }

            @Override
            public void afterTextChanged(Editable s) {
                if (!loading) dirty = true;
                updateWordCount();
            }
        };
        titleInput.addTextChangedListener(watcher);
        contentInput.addTextChangedListener(watcher);
        tagsInput.addTextChangedListener(watcher);
    }

    private void selectTarget(String value) {
        target = value;
        style(targetEssay, "essay".equals(value));
        style(targetTech, "tech".equals(value));
        style(targetNote, "note".equals(value));
        if (!loading) dirty = true;
    }

    private void style(TextView view, boolean on) {
        view.setBackgroundResource(on ? R.drawable.bg_accent : R.drawable.bg_tag);
        view.setTextColor(getColor(on ? R.color.white : R.color.accent));
    }

    private void updateWordCount() {
        wordCount.setText(contentInput.getText().length() + " 字");
    }

    private void chooseImage() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        startActivityForResult(intent, REQ_IMAGE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_IMAGE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            addImage(data.getData());
        }
    }

    private void addImage(final Uri uri) {
        Toast.makeText(this, "正在处理图片…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                final String name = saveImage(uri);
                runOnUiThread(() -> {
                    insertImageRef(name);
                    refreshImageStrip();
                    Toast.makeText(this, "图片已添加，同步后网页可见", Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(
                        this,
                        "图片处理失败：" + (e.getMessage() == null ? "未知错误" : e.getMessage()),
                        Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void insertImageRef(String name) {
        int start = contentInput.getSelectionStart();
        if (start < 0) start = contentInput.getText().length();
        String text = contentInput.getText().toString();
        String prefix = start > 0 && text.charAt(start - 1) != '\n' ? "\n" : "";
        String ref = "![图片](/images/mobile/" + name + ")";
        String suffix = start >= text.length() || text.charAt(start) != '\n' ? "\n" : "";
        contentInput.getText().insert(start, prefix + ref + suffix);
    }

    private String saveImage(Uri uri) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        InputStream input = getContentResolver().openInputStream(uri);
        if (input == null) throw new Exception("无法打开图片");
        BitmapFactory.decodeStream(input, null, bounds);
        input.close();
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw new Exception("无法读取图片尺寸");

        int sample = 1;
        while (bounds.outWidth / sample > 1600 || bounds.outHeight / sample > 1600) sample *= 2;

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = sample;
        input = getContentResolver().openInputStream(uri);
        if (input == null) throw new Exception("无法打开图片");
        Bitmap bitmap = BitmapFactory.decodeStream(input, null, options);
        input.close();
        if (bitmap == null) throw new Exception("无法解码图片");

        int orientation = ExifInterface.ORIENTATION_NORMAL;
        try {
            InputStream exifInput = getContentResolver().openInputStream(uri);
            if (exifInput != null) {
                ExifInterface exif = new ExifInterface(exifInput);
                orientation = exif.getAttributeInt(
                        ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                exifInput.close();
            }
        } catch (Exception ignored) {
        }

        Matrix matrix = new Matrix();
        if (orientation == ExifInterface.ORIENTATION_ROTATE_90) matrix.postRotate(90);
        else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) matrix.postRotate(180);
        else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) matrix.postRotate(270);
        else if (orientation == ExifInterface.ORIENTATION_FLIP_HORIZONTAL) matrix.postScale(-1, 1);

        Bitmap output = bitmap;
        if (!matrix.isIdentity()) {
            output = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
        }

        File dir = new File(getFilesDir(), "images");
        if (!dir.exists()) dir.mkdirs();
        String name = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date())
                + "-" + Integer.toHexString(new Random().nextInt(0xFFFFFF)) + ".jpg";
        FileOutputStream stream = new FileOutputStream(new File(dir, name));
        output.compress(Bitmap.CompressFormat.JPEG, 85, stream);
        stream.close();
        if (output != bitmap) bitmap.recycle();
        output.recycle();
        return name;
    }

    private void refreshImageStrip() {
        ArrayList<String> names = new ArrayList<>();
        Note temp = new Note();
        temp.content = contentInput.getText().toString();
        names.addAll(temp.imageNames());

        imageStrip.removeAllViews();
        imageCount.setText(names.isEmpty() ? "" : "已附 " + names.size() + " 张图片");
        imageScroll.setVisibility(names.isEmpty() ? View.GONE : View.VISIBLE);

        for (String name : names) {
            File file = new File(new File(getFilesDir(), "images"), name);
            if (!file.exists()) continue;
            ImageView view = new ImageView(this);
            int size = dp(72);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
            lp.rightMargin = dp(8);
            view.setLayoutParams(lp);
            view.setScaleType(ImageView.ScaleType.CENTER_CROP);
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 2;
            Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
            if (bitmap != null) view.setImageBitmap(bitmap);
            imageStrip.addView(view);
        }
    }

    private int dp(int value) {
        return Math.round(getResources().getDisplayMetrics().density * value);
    }

    private void save() {
        String title = titleInput.getText().toString().trim();
        String content = contentInput.getText().toString().trim();
        if (title.isEmpty() && content.isEmpty()) {
            Toast.makeText(this, "写点什么再保存", Toast.LENGTH_SHORT).show();
            return;
        }
        if (title.isEmpty()) {
            title = content.length() > 24 ? content.substring(0, 24) : content;
        }

        long now = System.currentTimeMillis();
        if (noteId == null) noteId = UUID.randomUUID().toString();
        Note note = store.get(noteId);
        if (note == null) {
            note = new Note();
            note.id = noteId;
            note.createdAt = now;
        }
        note.title = title;
        note.content = content;
        note.tags = tagsInput.getText().toString().trim().replace("，", " ");
        note.target = target;
        note.updatedAt = now;
        note.synced = false;
        store.upsert(note);

        setResult(RESULT_OK);
        finish();
    }

    private void confirmDiscard() {
        if (!dirty) {
            finish();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("放弃修改？")
                .setMessage("这篇笔记还没有保存。")
                .setPositiveButton("放弃", (dialog, which) -> finish())
                .setNegativeButton("继续写", null)
                .show();
    }

    @Override
    public void onBackPressed() {
        confirmDiscard();
    }
}
