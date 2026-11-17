use anyhow::Result;

mod app;
mod entities;
mod features;
mod shared;

fn main() -> Result<()> {
    app::run()
}
