use std::process::ExitCode;

mod app;
mod features;

fn main() -> ExitCode {
    app::run_all()
}
