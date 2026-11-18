use aes::cipher::{BlockModeDecrypt, KeyIvInit, block_padding::Pkcs7};
use futures::{StreamExt, TryStreamExt};

use super::error::{Fetching, site_failure};
use super::http::{bytes, join, text};

type Decryptor = cbc::Decryptor<aes::Aes128>;

#[derive(Debug, PartialEq, Eq)]
pub struct Key {
    pub uri: String,
    pub iv: Option<[u8; 16]>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Segment {
    pub url: String,
    pub sequence: u64,
    pub key: Option<usize>,
}

#[derive(Debug, Default, PartialEq, Eq)]
pub struct Playlist {
    pub init: Option<String>,
    pub keys: Vec<Key>,
    pub segments: Vec<Segment>,
}

fn attribute<'a>(line: &'a str, name: &str) -> Option<&'a str> {
    let (_, list) = line.split_once(':')?;
    let mut rest = list;
    while !rest.is_empty() {
        let (key, after) = rest.split_once('=')?;
        let (value, next) = if let Some(quoted) = after.strip_prefix('"') {
            let (value, tail) = quoted.split_once('"')?;
            (value, tail.strip_prefix(',').unwrap_or(tail))
        } else {
            after.split_once(',').unwrap_or((after, ""))
        };
        if key.trim() == name {
            return Some(value);
        }
        rest = next;
    }
    None
}

fn required<'a>(line: &'a str, name: &str) -> Fetching<&'a str> {
    attribute(line, name).ok_or_else(|| site_failure(format!("{name} missing in {line}")))
}

fn initial_vector(hex: &str) -> Fetching<[u8; 16]> {
    let digits = hex.trim_start_matches("0x").trim_start_matches("0X");
    let mut vector = [0u8; 16];
    if digits.len() != 32 {
        return Err(site_failure(format!("IV {hex} is not 16 bytes")));
    }
    for (index, byte) in vector.iter_mut().enumerate() {
        let pair = &digits[index * 2..index * 2 + 2];
        *byte = u8::from_str_radix(pair, 16)
            .map_err(|error| site_failure(format!("IV {hex}: {error}")))?;
    }
    Ok(vector)
}

pub fn parse_media(url: &str, playlist: &str) -> Fetching<Playlist> {
    let mut parsed = Playlist::default();
    let mut key = None;
    let mut sequence = 0u64;
    for line in playlist.lines().map(str::trim) {
        if let Some(first) = line.strip_prefix("#EXT-X-MEDIA-SEQUENCE:") {
            sequence = first
                .parse()
                .map_err(|error| site_failure(format!("{line}: {error}")))?;
        } else if line.starts_with("#EXT-X-KEY:") {
            key = match required(line, "METHOD")? {
                "NONE" => None,
                "AES-128" => {
                    parsed.keys.push(Key {
                        uri: join(url, required(line, "URI")?)?,
                        iv: attribute(line, "IV").map(initial_vector).transpose()?,
                    });
                    Some(parsed.keys.len() - 1)
                }
                method => return Err(site_failure(format!("unsupported HLS key method {method}"))),
            };
        } else if line.starts_with("#EXT-X-MAP:") {
            parsed.init = Some(join(url, required(line, "URI")?)?);
        } else if !line.is_empty() && !line.starts_with('#') {
            parsed.segments.push(Segment {
                url: join(url, line)?,
                sequence,
                key,
            });
            sequence += 1;
        }
    }
    Ok(parsed)
}

fn rank(group: &str) -> u64 {
    group
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>()
        .parse()
        .unwrap_or(0)
}

pub fn audio_rendition(url: &str, master: &str) -> Fetching<Option<String>> {
    let mut best: Option<(u64, &str)> = None;
    for line in master
        .lines()
        .filter(|line| line.starts_with("#EXT-X-MEDIA:"))
    {
        if attribute(line, "TYPE") != Some("AUDIO") {
            continue;
        }
        let Some(uri) = attribute(line, "URI") else {
            continue;
        };
        let candidate = rank(attribute(line, "GROUP-ID").unwrap_or_default());
        if best.is_none_or(|(current, _)| candidate > current) {
            best = Some((candidate, uri));
        }
    }
    best.map(|(_, uri)| join(url, uri)).transpose()
}

fn decrypt(data: &[u8], key: &[u8], vector: [u8; 16]) -> Fetching<Vec<u8>> {
    let key: [u8; 16] = key
        .try_into()
        .map_err(|_| site_failure("HLS key is not 16 bytes"))?;
    Decryptor::new(&key.into(), &vector.into())
        .decrypt_padded_vec::<Pkcs7>(data)
        .map_err(|error| site_failure(format!("HLS decrypt: {error:?}")))
}

fn sequence_vector(sequence: u64) -> [u8; 16] {
    let mut vector = [0u8; 16];
    vector[8..].copy_from_slice(&sequence.to_be_bytes());
    vector
}

#[tracing::instrument(skip(client), fields(segments))]
pub async fn download(
    client: &reqwest::Client,
    url: &str,
    concurrency: usize,
) -> Fetching<Vec<u8>> {
    let playlist = parse_media(url, &text(client, url).await?)?;
    tracing::Span::current().record("segments", playlist.segments.len());
    let keys =
        futures::future::try_join_all(playlist.keys.iter().map(|key| bytes(client, &key.uri)))
            .await?;
    let mut joined = match &playlist.init {
        Some(init) => bytes(client, init).await?,
        None => Vec::new(),
    };
    let parts: Vec<Vec<u8>> = futures::stream::iter(playlist.segments.iter().map(|segment| {
        let playlist = &playlist;
        let keys = &keys;
        async move {
            let data = bytes(client, &segment.url).await?;
            match segment.key {
                None => Ok(data),
                Some(index) => {
                    let vector = playlist.keys[index]
                        .iv
                        .unwrap_or_else(|| sequence_vector(segment.sequence));
                    decrypt(&data, &keys[index], vector)
                }
            }
        }
    }))
    .buffered(concurrency)
    .try_collect()
    .await?;
    for part in parts {
        joined.extend_from_slice(&part);
    }
    Ok(joined)
}

#[cfg(test)]
mod tests {
    use aes::cipher::{BlockModeEncrypt, KeyIvInit, block_padding::Pkcs7};

    use super::{Key, Segment, attribute, audio_rendition, decrypt, parse_media, sequence_vector};

    const BASE: &str = "https://example.com/a/b/playlist.m3u8";

    #[test]
    fn attributes_keep_commas_inside_quotes() {
        let line =
            r#"#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-aac-128kbps",NAME="a,b",URI="x.m3u8""#;
        assert_eq!(attribute(line, "NAME"), Some("a,b"));
        assert_eq!(attribute(line, "URI"), Some("x.m3u8"));
        assert_eq!(attribute(line, "TYPE"), Some("AUDIO"));
        assert_eq!(attribute(line, "LANGUAGE"), None);
    }

    #[test]
    fn media_playlist_resolves_segments_keys_and_init() {
        let playlist = "#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:5\n#EXT-X-MAP:URI=\"init.mp4\"\n#EXT-X-KEY:METHOD=AES-128,URI=\"/key\",IV=0x000102030405060708090a0b0c0d0e0f\n#EXTINF:6.0,\n1.m4s\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:6.0,\nhttps://cdn.example.com/2.m4s\n";
        let parsed = parse_media(BASE, playlist).unwrap();
        assert_eq!(
            parsed.init.as_deref(),
            Some("https://example.com/a/b/init.mp4")
        );
        assert_eq!(
            parsed.keys,
            vec![Key {
                uri: "https://example.com/key".into(),
                iv: Some([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
            }]
        );
        assert_eq!(
            parsed.segments,
            vec![
                Segment {
                    url: "https://example.com/a/b/1.m4s".into(),
                    sequence: 5,
                    key: Some(0)
                },
                Segment {
                    url: "https://cdn.example.com/2.m4s".into(),
                    sequence: 6,
                    key: None
                },
            ]
        );
    }

    #[test]
    fn unsupported_key_methods_are_rejected() {
        assert!(parse_media(BASE, "#EXT-X-KEY:METHOD=SAMPLE-AES,URI=\"k\"\n1.ts\n").is_err());
    }

    #[test]
    fn highest_numbered_audio_group_wins() {
        let master = "#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"audio-aac-64kbps\",URI=\"low.m3u8\"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"audio-aac-192kbps\",URI=\"high.m3u8\"\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"999\",URI=\"sub.m3u8\"\n";
        assert_eq!(
            audio_rendition(BASE, master).unwrap().as_deref(),
            Some("https://example.com/a/b/high.m3u8")
        );
        assert_eq!(audio_rendition(BASE, "#EXTM3U\n").unwrap(), None);
    }

    #[test]
    fn segments_decrypt_with_the_sequence_number_as_iv() {
        let key = [7u8; 16];
        let vector = sequence_vector(42);
        let plain = b"segment payload".to_vec();
        let sealed = cbc::Encryptor::<aes::Aes128>::new(&key.into(), &vector.into())
            .encrypt_padded_vec::<Pkcs7>(&plain);
        assert_eq!(decrypt(&sealed, &key, vector).unwrap(), plain);
    }
}
