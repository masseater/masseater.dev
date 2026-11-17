use std::path::PathBuf;
use std::process::ExitCode;

use crate::features::compare_renders::{SCENARIOS, run};

pub fn run_all() -> ExitCode {
    let mut args = std::env::args_os().skip(1);
    let (Some(plugin), Some(out)) = (args.next(), args.next()) else {
        eprintln!("usage: pod-rattle-host <Pod Rattle.vst3> <output dir>");
        return ExitCode::FAILURE;
    };
    let plugin = PathBuf::from(plugin);
    let out = PathBuf::from(out);
    std::fs::create_dir_all(&out).expect("create output dir");

    let mut failed = false;
    for scenario in &SCENARIOS {
        match run(scenario, &plugin, &out) {
            Ok(report) => println!("{}: {report}", scenario.name),
            Err(error) => {
                eprintln!("{}: {error}", scenario.name);
                failed = true;
            }
        }
    }
    if failed {
        ExitCode::FAILURE
    } else {
        ExitCode::SUCCESS
    }
}
