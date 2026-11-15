pub mod protocol;

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::protocol::{Awkward, Kind, Level, Mixed, Samples};
    use serde::Deserialize;
    use serde_json::Value;

    const SAMPLES: &str = include_str!("samples.json");

    #[derive(Deserialize)]
    struct Invalid {
        reason: String,
        #[serde(default)]
        set: BTreeMap<String, Value>,
        remove: Option<String>,
    }

    #[derive(Deserialize)]
    struct Fixture {
        valid: Value,
        invalid: Vec<Invalid>,
    }

    fn fixture() -> Fixture {
        serde_json::from_str(SAMPLES).unwrap()
    }

    fn mutated(valid: &Value, sample: &Invalid) -> Value {
        let mut document = valid.clone();
        let point = document["points"][0].as_object_mut().unwrap();
        for (key, value) in &sample.set {
            point.insert(key.clone(), value.clone());
        }
        if let Some(key) = &sample.remove {
            point.remove(key);
        }
        document
    }

    #[test]
    fn round_trips_what_effect_schema_encodes() {
        let Fixture { valid, .. } = fixture();
        let samples: Samples = serde_json::from_value(valid.clone()).unwrap();
        assert_eq!(serde_json::to_value(&samples).unwrap(), valid);
    }

    #[test]
    fn rejects_what_effect_schema_rejects() {
        let Fixture { valid, invalid } = fixture();
        assert!(!invalid.is_empty());
        let accepted: Vec<&str> = invalid
            .iter()
            .filter(|sample| serde_json::from_value::<Samples>(mutated(&valid, sample)).is_ok())
            .map(|sample| sample.reason.as_str())
            .collect();
        assert!(accepted.is_empty(), "accepted {accepted:?}");
    }

    #[test]
    fn exports_typescript_through_specta() {
        let types = specta::Types::default().register::<Samples>();
        let exported = specta_typescript::Typescript::default()
            .export(&types, specta_serde::Format)
            .unwrap();
        assert!(exported.contains("export type Point"));
        assert!(exported.contains("updatedAt: number"));
        assert!(exported.contains("extra: unknown"));
    }

    #[test]
    fn describes_itself_as_json_schema() {
        let schema = serde_json::to_value(schemars::schema_for!(Samples)).unwrap();
        assert_eq!(schema["title"], "Samples");
    }

    #[test]
    fn parses_and_names_every_literal() {
        let Fixture { valid, .. } = fixture();
        let samples: Samples = serde_json::from_value(valid).unwrap();
        for kind in samples.kinds {
            assert_eq!(Kind::parse(kind.as_str()), Some(kind));
        }
        for mixed in samples.mixed {
            assert_eq!(Mixed::parse(mixed.as_str()), Some(mixed));
        }
        for level in samples.levels {
            assert_eq!(Level::parse(level.as_str()), Some(level));
        }
        for awkward in samples.awkward {
            assert_eq!(Awkward::parse(awkward.as_str()), Some(awkward));
        }
        assert_eq!(Kind::parse("third-kind"), None);
    }
}
