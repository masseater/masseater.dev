mod classify;
mod draft;
mod ingest;
mod remarks;
mod title;
mod understanding;

pub use draft::{Rewrite, draft_from_memo, rewrite_span};
pub use ingest::ingest_text;
pub use remarks::{remarks_of, without_dismissed};
pub use title::propose_title;
pub use understanding::{Reading, Understanding, context_for, read, texts};
