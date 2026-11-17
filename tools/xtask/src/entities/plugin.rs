pub fn names() -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir("apps")
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| std::fs::read_to_string(entry.path().join("Cargo.toml")).ok())
        .filter(|manifest| manifest.contains("\"cdylib\""))
        .filter_map(|manifest| {
            manifest
                .lines()
                .find_map(|line| line.strip_prefix("name = "))
                .map(|name| name.trim_matches('"').to_owned())
        })
        .collect();
    names.sort();
    names
}
