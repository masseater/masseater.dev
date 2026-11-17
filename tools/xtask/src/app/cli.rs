use std::process::ExitCode;

use crate::entities::plugin;

pub fn run() -> ExitCode {
    if let Err(error) = nice_plug_xtask::chdir_workspace_root() {
        eprintln!("{error:#}");
        return ExitCode::FAILURE;
    }
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(command @ ("bundle-all" | "bundle-universal-all")) =
        args.first().map(String::as_str)
    {
        let command = command.trim_end_matches("-all").to_owned();
        let rest = args.split_off(1);
        args = std::iter::once(command)
            .chain(
                plugin::names()
                    .into_iter()
                    .flat_map(|name| ["-p".to_owned(), name]),
            )
            .chain(rest)
            .collect();
    }
    match nice_plug_xtask::main_with_args("cargo xtask", args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error:#}");
            ExitCode::FAILURE
        }
    }
}
