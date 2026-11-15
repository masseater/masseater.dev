use std::sync::{Arc, Mutex, PoisonError};

use keyring::{Entry, Error};

use super::state::{self, Key};
use crate::failure::{Failure, Outcome};
use crate::store::Store;

const SERVICE: &str = "dev.masseater.yohaku";
const ACCOUNT: &str = "sync-refresh-token";

impl From<Error> for Failure {
    fn from(error: Error) -> Self {
        Self::new(error.to_string())
    }
}

fn entry() -> Outcome<Entry> {
    Ok(Entry::new(SERVICE, ACCOUNT)?)
}

fn stored() -> Result<Option<String>, Error> {
    match Entry::new(SERVICE, ACCOUNT)?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(Error::NoEntry) => Ok(None),
        Err(error) => Err(error),
    }
}

#[derive(Clone, Default)]
enum Known {
    #[default]
    Unread,
    Absent,
    Kept(String),
}

impl Known {
    fn of(token: Option<String>) -> Self {
        token.map_or(Self::Absent, Self::Kept)
    }
}

#[derive(Clone, Default)]
pub struct Vault {
    known: Arc<Mutex<Known>>,
}

impl Vault {
    fn known<T>(&self, work: impl FnOnce(&mut Known) -> T) -> T {
        work(&mut self.known.lock().unwrap_or_else(PoisonError::into_inner))
    }

    pub fn refresh_token(&self, store: &Store) -> Outcome<Option<String>> {
        match self.known(|known| known.clone()) {
            Known::Kept(token) => return Ok(Some(token)),
            Known::Absent => return Ok(None),
            Known::Unread => {}
        }
        let kept = match stored() {
            Ok(Some(token)) => Some(token),
            Ok(None) => moved_out_of(store)?,
            Err(error) => {
                log::warn!("the OS keychain is unavailable: {error}");
                return store.with(|connection| state::read(connection, Key::RefreshToken));
            }
        };
        self.known(|known| *known = Known::of(kept.clone()));
        Ok(kept)
    }

    pub fn keep(&self, token: &str) -> Outcome<()> {
        entry()?.set_password(token)?;
        self.known(|known| *known = Known::Kept(token.to_owned()));
        Ok(())
    }

    pub fn forget(&self) -> Outcome<()> {
        match entry()?.delete_credential() {
            Ok(()) | Err(Error::NoEntry) => {}
            Err(error) => return Err(error.into()),
        }
        self.known(|known| *known = Known::Absent);
        Ok(())
    }
}

fn moved_out_of(store: &Store) -> Outcome<Option<String>> {
    let plain = store.with(|connection| state::read(connection, Key::RefreshToken))?;
    if let Some(token) = &plain {
        entry()?.set_password(token)?;
        store.with(|connection| state::clear(connection, Key::RefreshToken))?;
    }
    Ok(plain)
}
