mod failure;
mod text;

pub use failure::{Failure, Outcome};
pub use text::{utf16_length, utf16_offset, utf16_slice};
