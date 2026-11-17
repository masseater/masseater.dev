use globset::{Glob, GlobBuilder, GlobSet, GlobSetBuilder};

fn glob(pattern: &str) -> Result<Glob, String> {
    GlobBuilder::new(pattern)
        .literal_separator(true)
        .build()
        .map_err(|error| format!("{pattern}: {error}"))
}

pub fn set(patterns: &[String]) -> Result<GlobSet, String> {
    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        builder.add(glob(pattern)?);
    }
    builder.build().map_err(|error| error.to_string())
}
