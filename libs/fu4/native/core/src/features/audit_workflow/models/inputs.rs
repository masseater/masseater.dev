#[derive(Copy, Clone, Debug, PartialEq)]
pub(crate) enum Capability {
    Arbitrary,

    Structured,

    Fixed,
}

impl Capability {
    pub(crate) fn unify(self, other: Self) -> Self {
        match (self, other) {
            (Self::Arbitrary, _) | (_, Self::Arbitrary) => Self::Arbitrary,
            (Self::Structured, _) | (_, Self::Structured) => Self::Structured,
            _ => self,
        }
    }
}

pub(crate) trait HasInputs {
    fn get_input(&self, name: &str) -> Option<Capability>;
}
