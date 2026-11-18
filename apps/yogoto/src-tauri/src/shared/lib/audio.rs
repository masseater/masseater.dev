use std::fs::File;
use std::path::Path;

use audioadapter_buffers::direct::SequentialSliceOfVecs;
use num_traits::ToPrimitive;
use rubato::{Fft, FixedSync, Resampler};
use symphonia::core::audio::Channels;
use symphonia::core::codecs::audio::well_known::CODEC_ID_OPUS;
use symphonia::core::codecs::audio::{AudioCodecParameters, AudioDecoderOptions};
use symphonia::core::errors::Error as DecodeError;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::{FormatOptions, FormatReader, TrackType};
use symphonia::core::io::{MediaSourceStream, MediaSourceStreamOptions};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::packet::Packet;

pub type Stereo = [Vec<f32>; 2];

const FULL_SCALE: f32 = 8_388_608.0;
const PEAK: i32 = 8_388_607;

#[derive(Debug)]
pub enum AudioError {
    Io(std::io::Error),
    Decode(DecodeError),
    NoTrack,
    Resample(String),
    Encode(String),
    Opus(String),
}

impl std::fmt::Display for AudioError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "{error}"),
            Self::Decode(error) => write!(formatter, "{error}"),
            Self::NoTrack => write!(formatter, "no audio track"),
            Self::Resample(message) | Self::Encode(message) | Self::Opus(message) => {
                write!(formatter, "{message}")
            }
        }
    }
}

impl std::error::Error for AudioError {}

const OPUS_RATE: u32 = 48_000;
const OPUS_MAX_FRAMES: usize = 5_760;

struct Frames {
    left: Vec<f32>,
    right: Vec<f32>,
}

impl Frames {
    const fn new() -> Self {
        Self {
            left: Vec::new(),
            right: Vec::new(),
        }
    }

    fn push(&mut self, interleaved: &[f32], count: usize) {
        for frame in interleaved.chunks_exact(count) {
            self.left.push(frame[0]);
            self.right.push(frame[count.min(2) - 1]);
        }
    }

    fn skip(mut self, frames: usize) -> Stereo {
        let start = frames.min(self.left.len());
        self.left.drain(..start);
        self.right.drain(..start);
        [self.left, self.right]
    }
}

fn next_packet(
    format: &mut Box<dyn FormatReader>,
    track_id: u32,
) -> Result<Option<Packet>, AudioError> {
    loop {
        match format.next_packet() {
            Ok(Some(packet)) if packet.track_id == track_id => return Ok(Some(packet)),
            Ok(Some(_)) => {}
            Ok(None) => return Ok(None),
            Err(DecodeError::IoError(error))
                if error.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                return Ok(None);
            }
            Err(error) => return Err(AudioError::Decode(error)),
        }
    }
}

fn pre_skip(params: &AudioCodecParameters) -> usize {
    params
        .extra_data
        .as_deref()
        .filter(|head| head.starts_with(b"OpusHead") && head.len() >= 12)
        .map_or(0, |head| {
            usize::from(u16::from_le_bytes([head[10], head[11]]))
        })
}

fn decode_opus(
    format: &mut Box<dyn FormatReader>,
    track_id: u32,
    params: &AudioCodecParameters,
) -> Result<(Stereo, u32), AudioError> {
    let count = params.channels.as_ref().map_or(2, Channels::count).max(1);
    let rate = i32::try_from(OPUS_RATE).map_err(|error| AudioError::Opus(error.to_string()))?;
    let mut decoder =
        opus_rs::OpusDecoder::new(rate, count).map_err(|error| AudioError::Opus(error.into()))?;
    let mut buffer = vec![0.0f32; OPUS_MAX_FRAMES * count];
    let mut frames = Frames::new();
    while let Some(packet) = next_packet(format, track_id)? {
        let produced = decoder
            .decode(&packet.data, OPUS_MAX_FRAMES, &mut buffer)
            .map_err(|error| AudioError::Opus(error.into()))?;
        frames.push(&buffer[..produced * count], count);
    }
    Ok((frames.skip(pre_skip(params)), OPUS_RATE))
}

pub fn decode(path: &Path) -> Result<(Stereo, u32), AudioError> {
    let source = File::open(path).map_err(AudioError::Io)?;
    let stream = MediaSourceStream::new(Box::new(source), MediaSourceStreamOptions::default());
    let mut hint = Hint::new();
    if let Some(extension) = path.extension().and_then(|extension| extension.to_str()) {
        hint.with_extension(extension);
    }
    let mut format = symphonia::default::get_probe()
        .probe(
            &hint,
            stream,
            FormatOptions::default(),
            MetadataOptions::default(),
        )
        .map_err(AudioError::Decode)?;
    let track = format
        .default_track(TrackType::Audio)
        .ok_or(AudioError::NoTrack)?;
    let track_id = track.id;
    let params = track
        .codec_params
        .as_ref()
        .and_then(|params| params.audio())
        .ok_or(AudioError::NoTrack)?
        .clone();
    if params.codec == CODEC_ID_OPUS {
        return decode_opus(&mut format, track_id, &params);
    }
    let rate = params.sample_rate.ok_or(AudioError::NoTrack)?;
    let mut decoder = symphonia::default::get_codecs()
        .make_audio_decoder(&params, &AudioDecoderOptions::default())
        .map_err(AudioError::Decode)?;
    let mut frames = Frames::new();
    let mut interleaved: Vec<f32> = Vec::new();
    while let Some(packet) = next_packet(&mut format, track_id)? {
        let buffer = match decoder.decode(&packet) {
            Ok(buffer) => buffer,
            Err(DecodeError::DecodeError(_)) => continue,
            Err(error) => return Err(AudioError::Decode(error)),
        };
        let count = buffer.spec().channels().count();
        buffer.copy_to_vec_interleaved(&mut interleaved);
        frames.push(&interleaved, count);
    }
    Ok((frames.skip(0), rate))
}

pub fn resample(audio: &Stereo, from: u32, to: u32) -> Result<Stereo, AudioError> {
    if from == to {
        return Ok(audio.clone());
    }
    let failure = |error: &dyn std::fmt::Display| AudioError::Resample(error.to_string());
    let frames = audio[0].len();
    let ratio_from = usize::try_from(from).map_err(|error| failure(&error))?;
    let ratio_to = usize::try_from(to).map_err(|error| failure(&error))?;
    let mut resampler = Fft::<f32>::new(ratio_from, ratio_to, 4096, 2, FixedSync::Both)
        .map_err(|error| failure(&error))?;
    let needed = resampler.process_all_needed_output_len(frames);
    let input =
        SequentialSliceOfVecs::new(audio.as_slice(), 2, frames).map_err(|error| failure(&error))?;
    let mut buffers = vec![vec![0.0f32; needed]; 2];
    let mut output =
        SequentialSliceOfVecs::new_mut(&mut buffers, 2, needed).map_err(|error| failure(&error))?;
    let (_, produced) = resampler
        .process_all_into_buffer(&input, &mut output, frames, None)
        .map_err(|error| failure(&error))?;
    let length = produced.min(frames * ratio_to / ratio_from);
    let [mut left, mut right] =
        <[Vec<f32>; 2]>::try_from(buffers).map_err(|_| failure(&"channel count"))?;
    left.truncate(length);
    right.truncate(length);
    Ok([left, right])
}

pub fn write_flac(path: &Path, audio: &Stereo, rate: u32) -> Result<(), AudioError> {
    use flac_codec::encode::{FlacSampleWriter, Options};

    let failure = |error: &dyn std::fmt::Display| AudioError::Encode(error.to_string());
    let interleaved: Vec<i32> = audio[0]
        .iter()
        .zip(&audio[1])
        .flat_map(<[&f32; 2]>::from)
        .map(|sample| {
            (sample * FULL_SCALE)
                .round()
                .to_i32()
                .map_or(0, |value| value.clamp(-PEAK - 1, PEAK))
        })
        .collect();
    let total = u64::try_from(interleaved.len()).map_err(|error| failure(&error))?;
    let mut writer = FlacSampleWriter::create(path, Options::default(), rate, 24, 2, Some(total))
        .map_err(|error| failure(&error))?;
    writer
        .write(&interleaved)
        .map_err(|error| failure(&error))?;
    writer.finalize().map_err(|error| failure(&error))
}

#[cfg(test)]
mod tests {
    use super::{decode, resample, write_flac};

    fn tone(rate: u32, frames: u32) -> [Vec<f32>; 2] {
        let step = 440.0 * std::f64::consts::TAU / f64::from(rate);
        let wave: Vec<f32> = (0..frames)
            .map(|index| {
                let phase = f64::from(index) * step;
                num_traits::cast::<f64, f32>(phase.sin() * 0.5).unwrap_or_default()
            })
            .collect();
        let inverted = wave.iter().map(|sample| -sample).collect();
        [wave, inverted]
    }

    fn peak_difference(actual: &[f32], expected: &[f32]) -> f32 {
        actual
            .iter()
            .zip(expected)
            .map(|(a, b)| (a - b).abs())
            .fold(0.0, f32::max)
    }

    #[test]
    fn flac_round_trip_keeps_samples() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("tone.flac");
        let audio = tone(44_100, 22_050);
        write_flac(&path, &audio, 44_100).unwrap();
        let (decoded, rate) = decode(&path).unwrap();
        assert_eq!(rate, 44_100);
        assert_eq!(decoded[0].len(), audio[0].len());
        let difference = peak_difference(&decoded[1], &audio[1]);
        assert!(difference < 1e-6, "difference {difference}");
    }

    #[test]
    fn resampling_keeps_length_and_pitch() {
        let audio = tone(48_000, 48_000);
        let output = resample(&audio, 48_000, 44_100).unwrap();
        assert_eq!(output[0].len(), 44_100);
        let expected = tone(44_100, 44_100);
        let difference = peak_difference(&output[0][1000..43_000], &expected[0][1000..43_000]);
        assert!(difference < 1e-2, "difference {difference}");
    }
}
