use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

fn visit(directory: &Path, hasher: &mut DefaultHasher) {
    let mut entries: Vec<_> = std::fs::read_dir(directory)
        .expect("src is readable")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            visit(&path, hasher);
        } else {
            path.to_string_lossy().hash(hasher);
            std::fs::read(&path)
                .expect("source is readable")
                .hash(hasher);
        }
    }
}

fn main() {
    let mut hasher = DefaultHasher::new();
    env!("CARGO_PKG_VERSION").hash(&mut hasher);
    visit(Path::new("src"), &mut hasher);
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rustc-env=Y8_BUILD_ID={:016x}", hasher.finish());
}
