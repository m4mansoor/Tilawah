// Tilawah desktop/mobile backend (Rust).
//
// Provides native microphone capture (`start_recording` / `stop_recording`) via
// cpal so the app can record on every platform. The webview MediaRecorder /
// getUserMedia path only works on Windows (WebView2) and is unsupported on
// macOS (WKWebView), Linux (WebKitGTK), and mobile — so native capture is the
// cross-platform path. `stop_recording` returns a base64-encoded 16-bit mono WAV.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use tauri::State;

/// Shared state for an in-progress recording.
struct Recorder {
    samples: Arc<Mutex<Vec<i16>>>,
    sample_rate: u32,
    stop: Arc<AtomicBool>,
    handle: Option<std::thread::JoinHandle<()>>,
}

struct RecorderState {
    recorder: Mutex<Option<Recorder>>,
}

#[tauri::command]
fn start_recording(state: State<'_, RecorderState>) -> Result<(), String> {
    {
        let guard = state.recorder.lock().unwrap();
        if guard.is_some() {
            return Err("Already recording".to_string());
        }
    }

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "No microphone found".to_string())?;
    let config = device.default_input_config().map_err(|e| e.to_string())?;
    let sample_rate = config.sample_rate().0;
    let channels = config.channels() as usize;
    let sample_format = config.sample_format();
    let stream_config: cpal::StreamConfig = config.into();

    let samples: Arc<Mutex<Vec<i16>>> = Arc::new(Mutex::new(Vec::new()));
    let stop = Arc::new(AtomicBool::new(false));

    let s = samples.clone();
    let st = stop.clone();

    let handle = std::thread::spawn(move || {
        let err_fn = |e: cpal::StreamError| eprintln!("audio stream error: {e}");
        let stream: Result<cpal::Stream, cpal::BuildStreamError> = match sample_format {
            cpal::SampleFormat::F32 => device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    let mut buf = s.lock().unwrap();
                    for frame in data.chunks(channels) {
                        let avg =
                            frame.iter().copied().sum::<f32>() / frame.len() as f32;
                        buf.push((avg.clamp(-1.0, 1.0) * i16::MAX as f32) as i16);
                    }
                },
                err_fn,
                None,
            ),
            cpal::SampleFormat::I16 => device.build_input_stream(
                &stream_config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let mut buf = s.lock().unwrap();
                    for frame in data.chunks(channels) {
                        let avg = frame.iter().map(|&x| x as i32).sum::<i32>()
                            / frame.len() as i32;
                        buf.push(avg as i16);
                    }
                },
                err_fn,
                None,
            ),
            cpal::SampleFormat::U16 => device.build_input_stream(
                &stream_config,
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    let mut buf = s.lock().unwrap();
                    for frame in data.chunks(channels) {
                        let avg = frame
                            .iter()
                            .map(|&x| x as i32 - 32768)
                            .sum::<i32>()
                            / frame.len() as i32;
                        buf.push(avg as i16);
                    }
                },
                err_fn,
                None,
            ),
            other => {
                eprintln!("Unsupported sample format: {other}");
                return;
            }
        };

        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                eprintln!("build_input_stream failed: {e}");
                return;
            }
        };
        let _ = stream.play();
        while !st.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(50));
        }
        // `stream` dropped here -> capture stops.
    });

    *state.recorder.lock().unwrap() = Some(Recorder {
        samples,
        sample_rate,
        stop,
        handle: Some(handle),
    });
    Ok(())
}

#[tauri::command]
fn stop_recording(state: State<'_, RecorderState>) -> Result<String, String> {
    let rec = {
        let mut guard = state.recorder.lock().unwrap();
        guard.take().ok_or_else(|| "Not recording".to_string())?
    };
    rec.stop.store(true, Ordering::Relaxed);
    if let Some(h) = rec.handle {
        let _ = h.join();
    }

    let samples = rec.samples.lock().unwrap();

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: rec.sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut cursor = std::io::Cursor::new(Vec::new());
    {
        let mut writer = hound::WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
        for &s in samples.iter() {
            writer.write_sample(s).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;
    }
    let wav = cursor.into_inner();

    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&wav))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(RecorderState {
            recorder: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![start_recording, stop_recording])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
