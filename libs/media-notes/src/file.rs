use std::fmt::Write;
use std::fs::File;
use std::io::{self, BufReader};
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::failure::{Failure, Outcome};
use crate::protocol::{Media, Opened, Site, Source};

fn hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    })
}

pub fn digest(path: &Path) -> Outcome<String> {
    let mut reader = BufReader::new(File::open(path)?);
    let mut hasher = Sha256::new();
    io::copy(&mut reader, &mut hasher)?;
    Ok(hex(&hasher.finalize()))
}

pub fn opened_file(path: &Path) -> Outcome<Opened> {
    let title = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| Failure::new("the file has no name"))?
        .to_owned();
    Ok(Opened {
        media: Media {
            source: Source {
                site: Site::File,
                id: digest(path)?,
            },
            title,
            artist: String::new(),
        },
        location: path.to_string_lossy().into_owned(),
    })
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::opened_file;
    use crate::protocol::Site;

    #[test]
    fn names_a_file_by_its_contents() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let first = directory.path().join("cut-v1.mp4");
        let renamed = directory.path().join("cut-final.mp4");
        fs::write(&first, b"frames").expect("first file");
        fs::write(&renamed, b"frames").expect("renamed file");
        let opened = opened_file(&first).expect("opened");
        assert_eq!(opened.media.source.site, Site::File);
        assert_eq!(
            opened.media.source.id,
            "594cfd2607d4f09e1ce6241203e418cacfed545063792bc5eab7afaadbf0c4e0"
        );
        assert_eq!(opened.media.title, "cut-v1.mp4");
        assert_eq!(
            opened_file(&renamed).expect("renamed").media.source,
            opened.media.source
        );
    }
}
