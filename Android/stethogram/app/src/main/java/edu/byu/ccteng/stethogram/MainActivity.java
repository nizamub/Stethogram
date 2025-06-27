package edu.byu.ccteng.stethogram;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.media.MediaRouter;
import android.media.audiofx.AcousticEchoCanceler;
import android.media.audiofx.NoiseSuppressor;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.visualizer.amplitude.AudioRecordView;

import java.io.File;
import java.io.IOException;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;

public class MainActivity extends AppCompatActivity {

    final String LOG_TAG = "stethogram";
    private static final int RECORD_AUDIO_PERMISSION_CODE = 100;

    TextView txtMain;
    TextView txtDevice;
    Timer timer;
    Switch swDevice;
    Switch swFile;
    Random random = new Random();

    MediaRecorder mediaRecorder;
    AudioRecordView audioRecordView;
    int amp;

    MediaRouter router;
    MediaRouter.RouteInfo routeSelected;
    MediaRouter.RouteInfo routeBT = null;
    boolean m_isRun = false;
    int m_count = 0;
    int SAMPLE_RATE = 44100;
    int BUF_SIZE = 256;
    short[] buffer = new short[BUF_SIZE];
    AudioRecord m_record;
    AudioTrack m_track;
    NoiseSuppressor m_suppressor;
    AcousticEchoCanceler m_canceler;
    Thread m_thread;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request microphone permission
        checkPermission(Manifest.permission.RECORD_AUDIO, RECORD_AUDIO_PERMISSION_CODE);

        txtMain = findViewById(R.id.textView);
        txtDevice = findViewById(R.id.txtDevice);
        audioRecordView = findViewById(R.id.audioRecordView);

        swDevice = findViewById(R.id.swDevice);
        swDevice.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                m_isRun = isChecked;
                if (!isChecked) m_count = 0;
            }
        });

        swFile = findViewById(R.id.swFile);
        swFile.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                if (isChecked) {
                    startRecordingToFile();
                } else {
                    stopRecordingToFile();
                }
            }
        });

        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                runOnUiThread(() -> {
                    int currentMaxAmplitude = 10 * amp;
                    audioRecordView.update(currentMaxAmplitude);
                });
            }
        }, 0, 100);

        Button btnRestart = findViewById(R.id.button3);
        btnRestart.setOnClickListener(v -> {
            Intent restartIntent = new Intent(MainActivity.this, MainActivity.class);
            int pendingId = 123456;
            PendingIntent pendingIntent = PendingIntent.getActivity(MainActivity.this, pendingId, restartIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager mgr = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            mgr.set(AlarmManager.RTC, System.currentTimeMillis() + 100, pendingIntent);
            System.exit(0);
        });

        router = (MediaRouter) getSystemService(Context.MEDIA_ROUTER_SERVICE);
        routeSelected = router.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO);
        CharSequence name = routeSelected.getDescription();
        if (name == null) name = routeSelected.getName();
        txtDevice.setText(name);
        Log.i(LOG_TAG, "Selected:" + name + ":" + routeSelected.getDeviceType());

        for (int i = 0; i < router.getRouteCount(); i++) {
            MediaRouter.RouteInfo routeInfo = router.getRouteAt(i);
            name = routeInfo.getDescription();
            if (name == null) name = routeInfo.getName();
            Log.i(LOG_TAG, name + ":" + routeInfo.getDeviceType());

            if (routeInfo.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_BLUETOOTH) {
                routeBT = routeInfo;
            }
        }

        if (routeBT != null && routeSelected.getDeviceType() != MediaRouter.RouteInfo.DEVICE_TYPE_BLUETOOTH) {
            router.selectRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO, routeBT);
            routeSelected = router.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO);
            name = routeSelected.getDescription();
            if (name == null) name = routeSelected.getName();
            Log.i(LOG_TAG, "Re-selected:" + name + ":" + routeSelected.getDeviceType());
            startTimer();
        } else if (routeBT == null) {
            txtMain.setText("No Bluetooth audio device.\nPlease connect and restart app.");
        }

        do_loopback();
    }

    public void checkPermission(String permission, int requestCode) {
        if (ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_DENIED) {
            ActivityCompat.requestPermissions(this, new String[]{permission}, requestCode);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RECORD_AUDIO_PERMISSION_CODE) {
            if (!(grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                Toast.makeText(this, "Microphone Permission Denied", Toast.LENGTH_LONG).show();
            }
        }
    }

    public void startTimer() {
        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                runOnUiThread(() -> {
                    // Optional UI update
                });
            }
        }, 0, 1000);
    }

    private void startRecordingToFile() {
        File outputDir = getExternalFilesDir(null);
        File outputFile = new File(outputDir, "recorded_audio.mp3");

        mediaRecorder = new MediaRecorder();
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        mediaRecorder.setOutputFile(outputFile.getAbsolutePath());
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);

        try {
            mediaRecorder.prepare();
            mediaRecorder.start();
            Toast.makeText(this, "Recording started:\n" + outputFile.getAbsolutePath(), Toast.LENGTH_LONG).show();
        } catch (IOException e) {
            e.printStackTrace();
            Toast.makeText(this, "Recording failed", Toast.LENGTH_SHORT).show();
        }
    }

    private void stopRecordingToFile() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.stop();
            } catch (RuntimeException e) {
                e.printStackTrace();
            }
            mediaRecorder.release();
            mediaRecorder = null;
            Toast.makeText(this, "Recording stopped", Toast.LENGTH_SHORT).show();
        }
    }

    private void do_loopback() {
        m_thread = new Thread(() -> {
            while (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_DENIED) {
                try {
                    Thread.sleep(1000);
                } catch (Exception ignored) {}
            }

            router = (MediaRouter) getSystemService(Context.MEDIA_ROUTER_SERVICE);
            routeSelected = router.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO);

            for (int i = 0; i < router.getRouteCount(); i++) {
                MediaRouter.RouteInfo routeInfo = router.getRouteAt(i);
                if (routeInfo.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_BLUETOOTH)
                    routeBT = routeInfo;
            }

            if (routeBT != null) {
                router.selectRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO, routeBT);
                routeSelected = router.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_AUDIO);
            }

            int buffersize = AudioRecord.getMinBufferSize(SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);

            buffersize = Math.max(buffersize, BUF_SIZE);

            try {
                m_record = new AudioRecord(MediaRecorder.AudioSource.MIC,
                        SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT, buffersize);

                if (NoiseSuppressor.isAvailable())
                    m_suppressor = NoiseSuppressor.create(m_record.getAudioSessionId());

                if (AcousticEchoCanceler.isAvailable())
                    m_canceler = AcousticEchoCanceler.create(m_record.getAudioSessionId());

                m_track = new AudioTrack(AudioManager.STREAM_MUSIC,
                        SAMPLE_RATE, AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT, buffersize,
                        AudioTrack.MODE_STREAM);

                m_track.setPlaybackRate(SAMPLE_RATE);
            } catch (Throwable t) {
                Log.e(LOG_TAG, "Audio init failed: " + t.getLocalizedMessage());
                return;
            }

            m_record.startRecording();
            m_track.play();

            while (true) {
                int samplesRead = m_record.read(buffer, 0, buffer.length);
                if (m_isRun) {
                    m_track.write(buffer, 0, samplesRead);
                }
                amp = Math.abs(buffer[0]);
                Thread.yield();
            }
        });

        m_thread.start();
    }

    double averageAmp(short[] data, int size) {
        double sum = 0;
        for (int i = 0; i < size; i++)
            sum += Math.abs(data[i]);
        return sum / size;
    }
}
