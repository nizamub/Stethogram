package edu.byu.ccteng.stethogram;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
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
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.visualizer.amplitude.AudioRecordView;

import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.Tensor;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.Arrays;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;

public class MainActivity extends AppCompatActivity {

    final String LOG_TAG = "Stethogram";
    private static final int RECORD_AUDIO_PERMISSION_CODE = 100;
    private static final String MODEL_FILE = "ASL_TFLite.tflite";

    // UI Elements
    TextView txtMain;
    TextView txtDevice;
    TextView txtResult;
    TextView txtQuality;
    ImageView imgResult;
    ProgressBar progressQuality;
    Timer timer;
    Switch swDevice;
    Switch swFile;
    Random random = new Random();

    // Audio Processing
    MediaRecorder mediaRecorder;
    AudioRecordView audioRecordView;
    int amp;

    // Bluetooth Audio
    MediaRouter router;
    MediaRouter.RouteInfo routeSelected;
    MediaRouter.RouteInfo routeBT = null;
    boolean m_isRun = false;
    int m_count = 0;
    int SAMPLE_RATE = 16000;
    int BUF_SIZE = 1024;
    short[] buffer = new short[BUF_SIZE];
    AudioRecord m_record;
    AudioTrack m_track;
    NoiseSuppressor m_suppressor;
    AcousticEchoCanceler m_canceler;
    Thread m_thread;

    // TensorFlow Lite
    private Interpreter tflite;
    private int inputSamples = 40000; // ~2.5 sec at 16kHz
    private short[] audioBuffer = new short[inputSamples];
    private int audioBufferIndex = 0;
    private boolean isRecording = false;
    private boolean modelLoaded = false;

    // Heart Sound Detection Parameters
    private static final double RMS_THRESHOLD = 500.0; // Minimum RMS for valid heart sound
    private static final double PEAK_THRESHOLD = 1000.0; // Minimum peak amplitude
    private static final int MIN_HEART_RATE = 40; // BPM
    private static final int MAX_HEART_RATE = 180; // BPM
    private static final int ANALYSIS_WINDOW = 3; // Number of buffers to analyze for heart sound

    // Spectrogram parameters
    private static final int FRAME_LENGTH = 80;
    private static final int FRAME_STEP = 40;
    private static final int N_FRAMES = 999;
    private static final int N_BINS = 65;

    // Heart condition labels
    private final String[] HEART_CONDITIONS = {
            "Normal",
            "Aortic Stenosis (AS)",
            "Mitral Regurgitation (MR)",
            "Mitral Stenosis (MS)",
            "Mitral Valve Prolapse (MVP)"
    };

    // Colors for different conditions
    private final int[] CONDITION_COLORS = {
            Color.GREEN,    // Normal
            Color.RED,      // AS
            Color.YELLOW,   // MR
            Color.MAGENTA,  // MS
            Color.CYAN      // MVP
    };

    // Icons for different conditions
    private final int[] CONDITION_ICONS = {
            R.drawable.ic_heart_normal,
            R.drawable.ic_heart_as,
            R.drawable.ic_heart_mr,
            R.drawable.ic_heart_ms,
            R.drawable.ic_heart_mvp
    };

    // Audio quality monitoring
    private double currentRMS = 0;
    private double currentPeak = 0;
    private double heartRate = 0;
    private int validHeartSoundCount = 0;
    private int totalAnalysisCount = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request microphone permission
        checkPermission(Manifest.permission.RECORD_AUDIO, RECORD_AUDIO_PERMISSION_CODE);

        // Initialize UI elements
        initializeUI();

        // Load TFLite model
        loadTFLiteModel();

        // Setup device switch
        setupDeviceSwitch();

        // Setup file recording switch
        setupFileSwitch();

        // Setup audio visualization timer
        setupVisualizationTimer();

        // Setup restart button
        setupRestartButton();

        // Bluetooth audio setup
        setupBluetoothAudio();

        do_loopback();
    }

    private void initializeUI() {
        txtMain = findViewById(R.id.textView);
        txtDevice = findViewById(R.id.txtDevice);
        txtResult = findViewById(R.id.txtResult);
        txtQuality = findViewById(R.id.txtQuality);
        imgResult = findViewById(R.id.imgResult);
        progressQuality = findViewById(R.id.progressQuality);
        audioRecordView = findViewById(R.id.audioRecordView);
        swDevice = findViewById(R.id.swDevice);
        swFile = findViewById(R.id.swFile);

        // Set initial UI state
        txtQuality.setText("Audio Quality: Poor");
        txtQuality.setTextColor(Color.RED);
        progressQuality.setProgress(0);
    }

    private void loadTFLiteModel() {
        try {
            tflite = new Interpreter(loadModelFile());
            Log.i(LOG_TAG, "TFLite model loaded successfully");
            modelLoaded = true;

            // Log model details
            Tensor inputTensor = tflite.getInputTensor(0);
            Tensor outputTensor = tflite.getOutputTensor(0);
            Log.i(LOG_TAG, "Input shape: " + Arrays.toString(inputTensor.shape()));
            Log.i(LOG_TAG, "Output shape: " + Arrays.toString(outputTensor.shape()));

        } catch (IOException e) {
            Log.e(LOG_TAG, "Failed to load TFLite model", e);
            Toast.makeText(this, "Model loading failed", Toast.LENGTH_LONG).show();
            modelLoaded = false;
            txtResult.setText("Model loading failed. Please check the model file.");
        }
    }

    private void setupDeviceSwitch() {
        swDevice.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                if (!modelLoaded) {
                    Toast.makeText(MainActivity.this, "Model not loaded. Cannot process audio.", Toast.LENGTH_SHORT).show();
                    swDevice.setChecked(false);
                    return;
                }

                m_isRun = isChecked;
                if (!isChecked) m_count = 0;
                isRecording = isChecked;
                if (!isChecked) {
                    audioBufferIndex = 0;
                    resetQualityMetrics();
                } else {
                    runOnUiThread(() -> {
                        txtResult.setText("Listening for heart sounds...");
                        txtResult.setTextColor(Color.DKGRAY);
                        imgResult.setImageResource(R.drawable.ic_heart_listening);
                        txtQuality.setText("Analyzing audio quality...");
                        txtQuality.setTextColor(Color.YELLOW);
                    });
                }
            }
        });
    }

    private void setupFileSwitch() {
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
    }

    private void setupVisualizationTimer() {
        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                runOnUiThread(() -> {
                    int currentMaxAmplitude = 10 * amp;
                    audioRecordView.update(currentMaxAmplitude);
                    updateQualityDisplay();
                });
            }
        }, 0, 100);
    }

    private void setupRestartButton() {
        Button btnRestart = findViewById(R.id.button3);
        btnRestart.setOnClickListener(v -> {
            Intent restartIntent = new Intent(MainActivity.this, MainActivity.class);
            int pendingId = 123456;
            PendingIntent pendingIntent = PendingIntent.getActivity(MainActivity.this, pendingId, restartIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager mgr = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            mgr.set(AlarmManager.RTC, System.currentTimeMillis() + 100, pendingIntent);
            System.exit(0);
        });
    }

    private void setupBluetoothAudio() {
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
        } else if (routeBT == null) {
            txtMain.setText("No Bluetooth audio device.\nPlease connect and restart app.");
        }
    }

    // Heart Sound Detection Methods
    private boolean isValidHeartSound(short[] audioData) {
        double rms = calculateRMS(audioData);
        double peak = calculatePeakAmplitude(audioData);

        // Update current metrics
        currentRMS = rms;
        currentPeak = peak;

        totalAnalysisCount++;

        // Check if audio meets heart sound criteria
        boolean hasValidAmplitude = rms > RMS_THRESHOLD && peak > PEAK_THRESHOLD;
        boolean hasHeartRhythm = detectHeartRhythm(audioData);

        if (hasValidAmplitude && hasHeartRhythm) {
            validHeartSoundCount++;
            return true;
        }

        return false;
    }

    private double calculateRMS(short[] audio) {
        long sum = 0;
        for (short sample : audio) {
            sum += sample * sample;
        }
        return Math.sqrt(sum / (double) audio.length);
    }

    private double calculatePeakAmplitude(short[] audio) {
        double peak = 0;
        for (short sample : audio) {
            double absValue = Math.abs(sample);
            if (absValue > peak) {
                peak = absValue;
            }
        }
        return peak;
    }

    private boolean detectHeartRhythm(short[] audio) {
        // Simple heart rhythm detection based on zero-crossing rate and periodicity
        int zeroCrossings = calculateZeroCrossings(audio);
        double zcr = zeroCrossings / (double) audio.length;

        // Heart sounds typically have lower zero-crossing rate than noise
        boolean hasLowZCR = zcr < 0.3; // Adjust based on your data

        // Additional periodicity check can be added here
        return hasLowZCR;
    }

    private int calculateZeroCrossings(short[] audio) {
        int crossings = 0;
        for (int i = 1; i < audio.length; i++) {
            if ((audio[i-1] >= 0 && audio[i] < 0) || (audio[i-1] < 0 && audio[i] >= 0)) {
                crossings++;
            }
        }
        return crossings;
    }

    private void updateQualityDisplay() {
        int qualityScore = calculateQualityScore();
        progressQuality.setProgress(qualityScore);

        if (qualityScore >= 80) {
            txtQuality.setText("Audio Quality: Excellent");
            txtQuality.setTextColor(Color.GREEN);
        } else if (qualityScore >= 60) {
            txtQuality.setText("Audio Quality: Good");
            txtQuality.setTextColor(Color.YELLOW);
        } else if (qualityScore >= 40) {
            txtQuality.setText("Audio Quality: Fair");
            txtQuality.setTextColor(Color.YELLOW);
        } else {
            txtQuality.setText("Audio Quality: Poor - Adjust stethoscope position");
            txtQuality.setTextColor(Color.RED);
        }
    }

    private int calculateQualityScore() {
        if (totalAnalysisCount == 0) return 0;

        double amplitudeScore = Math.min(100, (currentRMS / 2000.0) * 100);
        double consistencyScore = (validHeartSoundCount / (double) totalAnalysisCount) * 100;

        return (int) ((amplitudeScore * 0.7) + (consistencyScore * 0.3));
    }

    private void resetQualityMetrics() {
        validHeartSoundCount = 0;
        totalAnalysisCount = 0;
        currentRMS = 0;
        currentPeak = 0;
        heartRate = 0;
    }

    // Load TFLite model from assets
    private MappedByteBuffer loadModelFile() throws IOException {
        AssetFileDescriptor fileDescriptor = getAssets().openFd(MODEL_FILE);
        FileInputStream inputStream = new FileInputStream(fileDescriptor.getFileDescriptor());
        FileChannel fileChannel = inputStream.getChannel();
        long startOffset = fileDescriptor.getStartOffset();
        long declaredLength = fileDescriptor.getDeclaredLength();
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
    }

    // Classify PCG signal
    private float[] classifyPCG(float[][][][] input) {
        float[][] output = new float[1][5];
        tflite.run(input, output);
        return output[0];
    }

    // Preprocess audio for CNN input
    private float[][][][] preprocessAudio(short[] audioData) {
        try {
            // Convert to float and normalize
            float[] floatAudio = new float[audioData.length];
            for (int i = 0; i < audioData.length; i++) {
                floatAudio[i] = audioData[i] / 32768.0f;
            }

            // Pad with zeros at the beginning
            float[] processedAudio = new float[inputSamples];
            if (floatAudio.length >= inputSamples) {
                System.arraycopy(floatAudio, 0, processedAudio, 0, inputSamples);
            } else {
                int startIndex = inputSamples - floatAudio.length;
                Arrays.fill(processedAudio, 0, startIndex, 0.0f);
                System.arraycopy(floatAudio, 0, processedAudio, startIndex, floatAudio.length);
            }

            // Create STFT spectrogram
            float[][][] spectrogram = computeSTFT(processedAudio);

            // Create input tensor
            float[][][][] inputTensor = new float[1][N_FRAMES][N_BINS][1];

            for (int i = 0; i < Math.min(spectrogram.length, N_FRAMES); i++) {
                for (int j = 0; j < Math.min(spectrogram[i].length, N_BINS); j++) {
                    inputTensor[0][i][j][0] = spectrogram[i][j][0];
                }
            }

            return inputTensor;
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error in preprocessing: " + e.getMessage());
            return new float[1][N_FRAMES][N_BINS][1];
        }
    }

    // Compute STFT spectrogram
    private float[][][] computeSTFT(float[] audio) {
        int nFrames = (audio.length - FRAME_LENGTH) / FRAME_STEP + 1;
        int nBins = FRAME_LENGTH / 2 + 1;

        float[][][] spectrogram = new float[nFrames][nBins][1];

        // Create Hann window
        float[] window = new float[FRAME_LENGTH];
        for (int i = 0; i < FRAME_LENGTH; i++) {
            window[i] = (float) (0.5 * (1 - Math.cos(2 * Math.PI * i / (FRAME_LENGTH - 1))));
        }

        // Process each frame
        for (int frame = 0; frame < nFrames; frame++) {
            int start = frame * FRAME_STEP;
            float[] frameData = new float[FRAME_LENGTH];
            System.arraycopy(audio, start, frameData, 0, FRAME_LENGTH);

            for (int i = 0; i < FRAME_LENGTH; i++) {
                frameData[i] *= window[i];
            }

            for (int bin = 0; bin < nBins; bin++) {
                float real = 0;
                float imag = 0;

                for (int n = 0; n < FRAME_LENGTH; n++) {
                    float angle = (float) (2 * Math.PI * bin * n / FRAME_LENGTH);
                    real += frameData[n] * Math.cos(angle);
                    imag -= frameData[n] * Math.sin(angle);
                }

                spectrogram[frame][bin][0] = (float) Math.sqrt(real * real + imag * imag);
            }
        }

        return spectrogram;
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

    private void startRecordingToFile() {
        File outputDir = getExternalFilesDir(null);
        File outputFile = new File(outputDir, "heart_sound_" + System.currentTimeMillis() + ".wav");

        mediaRecorder = new MediaRecorder();
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
        mediaRecorder.setOutputFile(outputFile.getAbsolutePath());
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB);
        mediaRecorder.setAudioSamplingRate(SAMPLE_RATE);

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

    // Audio processing thread
    private void do_loopback() {
        m_thread = new Thread(() -> {
            while (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_DENIED) {
                try {
                    Thread.sleep(1000);
                } catch (Exception ignored) {
                }
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

                    // Check if this is a valid heart sound before processing
                    if (isValidHeartSound(buffer)) {
                        // Collect audio data for processing
                        if (isRecording && audioBufferIndex < inputSamples) {
                            int samplesToCopy = Math.min(samplesRead, inputSamples - audioBufferIndex);
                            System.arraycopy(buffer, 0, audioBuffer, audioBufferIndex, samplesToCopy);
                            audioBufferIndex += samplesToCopy;

                            // If we have enough samples, process them
                            if (audioBufferIndex >= inputSamples) {
                                if (tflite != null && modelLoaded) {
                                    try {
                                        long startTime = System.currentTimeMillis();
                                        float[][][][] input = preprocessAudio(audioBuffer);
                                        float[] predictions = classifyPCG(input);
                                        long processingTime = System.currentTimeMillis() - startTime;

                                        // Find the predicted class
                                        int predictedClass = 0;
                                        float maxConfidence = predictions[0];
                                        for (int i = 1; i < predictions.length; i++) {
                                            if (predictions[i] > maxConfidence) {
                                                maxConfidence = predictions[i];
                                                predictedClass = i;
                                            }
                                        }

                                        final int finalPredictedClass = predictedClass;
                                        final float finalConfidence = maxConfidence;

                                        runOnUiThread(() -> {
                                            txtResult.setText(String.format("%s (%.1f%%)",
                                                    HEART_CONDITIONS[finalPredictedClass],
                                                    finalConfidence * 100));
                                            txtResult.setTextColor(CONDITION_COLORS[finalPredictedClass]);
                                            imgResult.setImageResource(CONDITION_ICONS[finalPredictedClass]);

                                            Toast.makeText(MainActivity.this,
                                                    "Detection: " + HEART_CONDITIONS[finalPredictedClass],
                                                    Toast.LENGTH_SHORT).show();
                                        });

                                        Log.i(LOG_TAG, "Classification completed in " + processingTime + "ms");
                                        Log.i(LOG_TAG, "Prediction: " + HEART_CONDITIONS[predictedClass] +
                                                " with confidence: " + maxConfidence);

                                    } catch (Exception e) {
                                        Log.e(LOG_TAG, "Classification error", e);
                                        runOnUiThread(() -> {
                                            txtResult.setText("Classification error");
                                            txtResult.setTextColor(Color.RED);
                                        });
                                    }
                                } else {
                                    runOnUiThread(() -> {
                                        txtResult.setText("Model not loaded. Cannot classify.");
                                        txtResult.setTextColor(Color.RED);
                                    });
                                }

                                // Reset buffer for next recording
                                audioBufferIndex = 0;
                                isRecording = false;
                            }
                        }
                    } else {
                        // Not a valid heart sound - update UI accordingly
                        runOnUiThread(() -> {
                            if (isRecording) {
                                txtResult.setText("Poor heart sound quality - Adjust position");
                                txtResult.setTextColor(Color.RED);
                            }
                        });
                    }
                    m_count++;
                }
                amp = Math.abs(buffer[0]);
                Thread.yield();
            }
        });
        m_thread.start();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Clean up resources
        if (tflite != null) {
            tflite.close();
        }

        if (timer != null) {
            timer.cancel();
        }

        if (m_record != null) {
            m_record.stop();
            m_record.release();
        }

        if (m_track != null) {
            m_track.stop();
            m_track.release();
        }

        if (m_suppressor != null) {
            m_suppressor.release();
        }

        if (m_canceler != null) {
            m_canceler.release();
        }

        stopRecordingToFile();
    }
}