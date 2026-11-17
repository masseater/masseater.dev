use std::path::Path;

use media_notes::Outcome;
use media_notes::Store;
use serde::{Deserialize, Serialize};

const TABLE: &str = "stills";

#[derive(Serialize, Deserialize)]
struct Still {
    jpeg: String,
}

#[derive(Clone)]
pub struct Stills {
    store: Store,
}

impl Stills {
    pub fn open(directory: &Path, file: &str) -> Outcome<Self> {
        Ok(Self {
            store: Store::open(directory, file, TABLE)?,
        })
    }

    #[cfg(test)]
    pub fn in_memory() -> Outcome<Self> {
        Ok(Self {
            store: Store::in_memory(TABLE)?,
        })
    }

    pub fn put(&self, id: &str, at: i64, jpeg: String) -> Outcome<()> {
        self.store.put_unsourced(id, at, &Still { jpeg })
    }

    pub fn get(&self, id: &str) -> Outcome<Option<String>> {
        Ok(self.store.get::<Still>(id)?.map(|still| still.jpeg))
    }

    pub fn remove(&self, id: &str) -> Outcome<bool> {
        self.store.remove(id)
    }
}

#[cfg(test)]
mod tests {
    use super::Stills;

    #[test]
    fn keeps_a_still_until_it_is_removed() {
        let stills = Stills::in_memory().expect("stills");
        stills.put("mark", 1, "AAAA".to_owned()).expect("put");
        assert_eq!(stills.get("mark").expect("get").as_deref(), Some("AAAA"));
        assert!(stills.remove("mark").expect("remove"));
        assert_eq!(stills.get("mark").expect("get"), None);
    }
}
