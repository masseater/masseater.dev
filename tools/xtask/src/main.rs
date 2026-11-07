use std::process::ExitCode;

fn plugins() -> Vec<String> {
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

fn main() -> ExitCode {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(command @ ("bundle-all" | "bundle-universal-all")) =
        args.first().map(String::as_str)
    {
        let command = command.trim_end_matches("-all").to_owned();
        let rest = args.split_off(1);
        args = std::iter::once(command)
            .chain(
                plugins()
                    .into_iter()
                    .flat_map(|name| ["-p".to_owned(), name]),
            )
            .chain(rest)
            .collect();
    }
    if let Err(error) = nih_plug_xtask::chdir_workspace_root() {
        eprintln!("{error:#}");
        return ExitCode::FAILURE;
    }
    match nih_plug_xtask::main_with_args("cargo xtask", args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error:#}");
            ExitCode::FAILURE
        }
    }
}
