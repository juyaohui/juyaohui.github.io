package com.juyao.suiji;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.os.Bundle;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class QrScanActivity extends Activity implements SurfaceHolder.Callback, Camera.PreviewCallback {
    private static final int REQ_CAMERA = 1;

    private SurfaceView surfaceView;
    private SurfaceHolder holder;
    private Camera camera;
    private TextView hint;
    private TextView torchBtn;

    private final ExecutorService decoder = Executors.newSingleThreadExecutor();
    private final AtomicBoolean decoding = new AtomicBoolean(false);
    private final Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);

    private volatile boolean found = false;
    private boolean surfaceReady = false;
    private boolean torchOn = false;
    private int previewWidth = 1280;
    private int previewHeight = 720;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        surfaceView = findViewById(R.id.surface);
        hint = findViewById(R.id.hint);
        torchBtn = findViewById(R.id.torchBtn);
        holder = surfaceView.getHolder();
        holder.addCallback(this);

        hints.put(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(BarcodeFormat.QR_CODE));
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);

        findViewById(R.id.closeBtn).setOnClickListener(v -> finish());
        torchBtn.setOnClickListener(v -> toggleTorch());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            if (surfaceReady) openCamera();
        } else {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
        }
    }

    @Override
    protected void onPause() {
        releaseCamera();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        decoder.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (surfaceReady) openCamera();
            } else {
                Toast.makeText(this, "需要相机权限才能扫码", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }

    @Override
    public void surfaceCreated(SurfaceHolder surfaceHolder) {
        surfaceReady = true;
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            openCamera();
        }
    }

    @Override
    public void surfaceChanged(SurfaceHolder surfaceHolder, int format, int width, int height) {
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder surfaceHolder) {
        surfaceReady = false;
        releaseCamera();
    }

    private void openCamera() {
        if (camera != null || !surfaceReady) return;
        try {
            Camera c = Camera.open();
            Camera.Parameters params = c.getParameters();
            List<Camera.Size> sizes = params.getSupportedPreviewSizes();
            Camera.Size best = null;
            if (sizes != null) {
                for (Camera.Size size : sizes) {
                    if (size.width <= 1280 && size.height <= 1280) {
                        if (best == null || size.width > best.width) best = size;
                    }
                }
            }
            if (best != null) {
                previewWidth = best.width;
                previewHeight = best.height;
                params.setPreviewSize(previewWidth, previewHeight);
            }
            params.setPreviewFormat(ImageFormat.NV21);
            c.setParameters(params);
            c.setDisplayOrientation(90);
            c.setPreviewDisplay(holder);
            c.setPreviewCallback(this);
            c.startPreview();
            camera = c;
            hint.setText("对准电脑 /pair 页面上的二维码\n解码后会自动配对");
        } catch (Exception e) {
            hint.setText("无法打开相机：" + e.getMessage());
            Toast.makeText(this, "无法打开相机", Toast.LENGTH_LONG).show();
        }
    }

    private void releaseCamera() {
        Camera c = camera;
        camera = null;
        if (c != null) {
            try {
                c.setPreviewCallback(null);
                c.stopPreview();
            } catch (Exception ignored) {
            }
            try {
                c.release();
            } catch (Exception ignored) {
            }
        }
    }

    private void toggleTorch() {
        if (camera == null) return;
        try {
            Camera.Parameters params = camera.getParameters();
            params.setFlashMode(torchOn ? Camera.Parameters.FLASH_MODE_OFF : Camera.Parameters.FLASH_MODE_TORCH);
            camera.setParameters(params);
            torchOn = !torchOn;
            torchBtn.setText(torchOn ? "手电 开" : "手电");
        } catch (Exception e) {
            Toast.makeText(this, "这个设备不支持手电筒", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onPreviewFrame(final byte[] data, Camera source) {
        if (found || !decoding.compareAndSet(false, true)) return;
        final byte[] copy = Arrays.copyOf(data, data.length);
        final int width = previewWidth;
        final int height = previewHeight;
        decoder.execute(() -> {
            try {
                PlanarYUVLuminanceSource luminance = new PlanarYUVLuminanceSource(
                        copy, width, height, 0, 0, width, height, false);
                BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
                MultiFormatReader reader = new MultiFormatReader();
                Result result = reader.decode(bitmap, hints);
                if (result != null) {
                    found = true;
                    final String text = result.getText();
                    runOnUiThread(() -> {
                        Intent intent = new Intent();
                        intent.putExtra("qr", text);
                        setResult(RESULT_OK, intent);
                        finish();
                    });
                }
            } catch (Exception ignored) {
            } finally {
                decoding.set(false);
            }
        });
    }
}
