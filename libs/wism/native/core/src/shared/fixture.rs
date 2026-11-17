#[must_use]
pub fn files(names: &[&str]) -> Vec<String> {
    names.iter().map(|name| (*name).to_owned()).collect()
}

pub struct Tree {
    pub root: std::path::PathBuf,
}

impl Tree {
    #[must_use]
    pub fn new(entries: &[(&str, &str)]) -> Self {
        static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
        let id = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!("wism-core-{}-{id}", std::process::id()));
        for (name, text) in entries {
            let file = root.join(name);
            std::fs::create_dir_all(file.parent().expect("a file has a parent"))
                .expect("the fixture directory is created");
            std::fs::write(file, text).expect("the fixture file is written");
        }
        Self { root }
    }

    #[must_use]
    pub fn names(entries: &[(&str, &str)]) -> Vec<String> {
        entries.iter().map(|(name, _)| (*name).to_owned()).collect()
    }
}

impl Drop for Tree {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}
