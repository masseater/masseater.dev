# zizmor unit test recordings

`units.json` holds what zizmor 1.32.0's own unit tests in `crates/zizmor/src` ([zizmorcore/zizmor](https://github.com/zizmorcore/zizmor/tree/v1.32.0/crates/zizmor/src), MIT license in `LICENSE`) pass to zizmor and what it returned. The tests beside it compare fu4 with each entry:

- `../../zizmor-units-text.test.ts`: `split_patterns`, `extract_fenced_expression(s)`, `normalize_shell`, `env_is_static`, the version comment patterns, `Version::parse` and version ordering.
- `../../zizmor-units-uses.test.ts`: `RepositoryUsesPattern` parsing, ordering and matching, `ControlExpr::eval`, and the configuration JSON Schema checks (compared with fu4's configuration loader).
- `../../zizmor-units-matrix.test.ts`: `parse_fenced_expressions_from_routable` over whole workflows and actions, and matrix expansions.
- `../../zizmor-units-usage.test.ts`: `ActionCoordinate::usage`.
- `../../zizmor-units-remote.test.ts`: GitHub API hosts, `best_tag_for_commit`, and pkt-line encoding and decoding.

`units-known-failures.txt` lists the entries where fu4 differs on purpose, with the reason. The `yamlpatch` crate (fu4 has no fixes) and the `github-actions-models` crate (fu4 decodes workflows itself) are not recorded, and neither are the tests that need a GitHub token.

## Recording

Clone zizmor at `v1.32.0`, save this as `crates/zizmor/src/record.rs`:

```rust
use std::io::Write as _;
use std::sync::Mutex;

static LOCK: Mutex<()> = Mutex::new(());

pub(crate) fn emit(kind: &str, value: serde_json::Value) {
    let Ok(out) = std::env::var("ZIZMOR_UNIT_RECORD") else {
        return;
    };
    let mut record = serde_json::Map::new();
    record.insert("kind".into(), kind.into());
    if let serde_json::Value::Object(fields) = value {
        record.extend(fields);
    }
    let _guard = LOCK.lock().unwrap();
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(out)
        .unwrap();
    writeln!(file, "{}", serde_json::Value::Object(record)).unwrap();
}
```

Apply this patch, which adds `mod record;` and makes the tests record each call:

```diff
diff --git a/crates/yamlpath/src/lib.rs b/crates/yamlpath/src/lib.rs
index f2ae9b6..dd7aa61 100644
--- a/crates/yamlpath/src/lib.rs
+++ b/crates/yamlpath/src/lib.rs
@@ -258,6 +258,11 @@ impl<'a> Route<'a> {
         self.route.is_empty()
     }
 
+    /// The components of this route.
+    pub fn components(&self) -> &[Component<'a>] {
+        &self.route
+    }
+
     /// Create a new route from this route, with the given component
     /// added to the end.
     pub fn with_key(&self, component: impl Into<Component<'a>>) -> Self {
diff --git a/crates/zizmor/src/config/schema.rs b/crates/zizmor/src/config/schema.rs
index 1dfa2dc..1a39b29 100644
--- a/crates/zizmor/src/config/schema.rs
+++ b/crates/zizmor/src/config/schema.rs
@@ -193,8 +193,7 @@ mod tests {
         let empty = "rules: {}";
         let instance = yaml_serde::from_str::<serde_json::Value>(empty).unwrap();
 
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("empty rules should be valid");
     }
 
@@ -210,8 +209,7 @@ mod tests {
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(disabled).unwrap();
 
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("disabled rule should be valid");
     }
 
@@ -227,8 +225,7 @@ mod tests {
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(ignore).unwrap();
 
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("ignore rule should be valid");
 
         // Invalid workflow rules should be rejected.
@@ -239,8 +236,7 @@ mod tests {
               - foo.yml:invalid
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(invalid_ignore).unwrap();
-        let error = SCHEMA_VALIDATOR
-            .validate(&instance)
+        let error = rec_validate(&instance)
             .expect_err("invalid workflow rule should be rejected");
         insta::assert_snapshot!(error, @r#""foo.yml:invalid" does not match "^[^:]+\.ya?ml(:[1-9][0-9]*)?(:[1-9][0-9]*)?$""#);
     }
@@ -254,7 +250,7 @@ mod tests {
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(unknown_audit).unwrap();
 
-        let result = SCHEMA_VALIDATOR.validate(&instance);
+        let result = rec_validate(&instance);
         assert!(result.is_err(), "unknown audit should be invalid");
     }
 
@@ -271,8 +267,7 @@ mod tests {
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(forbidden_uses_allow).unwrap();
 
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("forbidden uses allow config should be valid");
 
         let forbidden_uses_deny = r#"
@@ -286,8 +281,7 @@ mod tests {
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(forbidden_uses_deny).unwrap();
 
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("forbidden uses deny config should be valid");
     }
 
@@ -303,8 +297,7 @@ mod tests {
         "#;
 
         let instance = yaml_serde::from_str::<serde_json::Value>(secrets_allow).unwrap();
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("secrets-outside-env allow config should be valid");
     }
 
@@ -321,8 +314,7 @@ mod tests {
         "#;
 
         let instance = yaml_serde::from_str::<serde_json::Value>(secrets_allow).unwrap();
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("secrets-outside-env allow config with base config should be valid");
     }
 
@@ -336,8 +328,7 @@ mod tests {
                 actions/checkout: hash-pin
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(valid).unwrap();
-        SCHEMA_VALIDATOR
-            .validate(&instance)
+        rec_validate(&instance)
             .expect("unpinned uses config should be valid");
 
         let unknown_policy = r#"
@@ -348,8 +339,7 @@ mod tests {
                 actions/checkout: unknown-policy
         "#;
         let instance = yaml_serde::from_str::<serde_json::Value>(unknown_policy).unwrap();
-        let error = SCHEMA_VALIDATOR
-            .validate(&instance)
+        let error = rec_validate(&instance)
             .expect_err("unknown pinning policy should be rejected");
         insta::assert_snapshot!(error, @r#""unknown-policy" is not valid under any of the schemas listed in the 'oneOf' keyword"#);
     }
@@ -359,8 +349,7 @@ mod tests {
         for sev in ["informational", "low", "medium", "high"] {
             let yaml = format!("rules:\n  artipacked:\n    remap:\n      severity: {sev}");
             let instance = yaml_serde::from_str::<serde_json::Value>(&yaml).unwrap();
-            SCHEMA_VALIDATOR
-                .validate(&instance)
+            rec_validate(&instance)
                 .unwrap_or_else(|_| panic!("severity '{sev}' should be valid in remap"));
         }
     }
@@ -370,8 +359,15 @@ mod tests {
         let invalid = "rules:\n  artipacked:\n    remap:\n      severity: Ultra";
         let instance = yaml_serde::from_str::<serde_json::Value>(invalid).unwrap();
         assert!(
-            SCHEMA_VALIDATOR.validate(&instance).is_err(),
+            rec_validate(&instance).is_err(),
             "unknown severity 'Ultra' should be invalid"
         );
     }
+
+
+    fn rec_validate<'a>(instance: &'a serde_json::Value) -> Result<(), jsonschema::ValidationError<'a>> {
+        let result = SCHEMA_VALIDATOR.validate(instance);
+        crate::record::emit("configSchema", serde_json::json!({"instance": instance, "valid": result.is_ok()}));
+        result
+    }
 }
diff --git a/crates/zizmor/src/github.rs b/crates/zizmor/src/github.rs
index fe337b4..bdc80f5 100644
--- a/crates/zizmor/src/github.rs
+++ b/crates/zizmor/src/github.rs
@@ -999,6 +999,13 @@ pub(crate) struct Tag {
 /// Put together, we prefer the longest tag that has a matching prefix,
 /// followed by a tag that has a matching prefix, followed by any longest tag.
 fn best_tag_for_commit(tags: Vec<Tag>, subpath: Option<&str>, commit: &str) -> Option<Tag> {
+    let input = tags.iter().map(|t| serde_json::json!([t.name, t.commit.sha])).collect::<Vec<_>>();
+    let result = best_tag_for_commit_recorded(tags, subpath, commit);
+    crate::record::emit("bestTag", serde_json::json!({"tags": input, "subpath": subpath, "commit": commit, "result": result.as_ref().map(|t| t.name.clone())}));
+    result
+}
+
+fn best_tag_for_commit_recorded(tags: Vec<Tag>, subpath: Option<&str>, commit: &str) -> Option<Tag> {
     // Heuristic: `owner/repo/stash/save` might be released as either `save/vX.Y.Z`
     // or `stash/save/vX.Y.Z`.
     let preferred_prefixes = subpath.map(|subpath| {
@@ -1186,6 +1193,7 @@ mod tests {
                 "https://selfhosted.example.com/api/v3",
             ),
         ] {
+            crate::record::emit("githubHost", serde_json::json!({"host": host, "api": GitHubHost::new(host).unwrap().to_api_url()}));
             assert_eq!(GitHubHost::new(host).unwrap().to_api_url(), expected);
         }
     }
diff --git a/crates/zizmor/src/github/pktline.rs b/crates/zizmor/src/github/pktline.rs
index 1533a98..3e6a97c 100644
--- a/crates/zizmor/src/github/pktline.rs
+++ b/crates/zizmor/src/github/pktline.rs
@@ -106,6 +106,13 @@ impl<'a> Packet<'a> {
     }
 
     pub(crate) fn encode(&self, dest: &mut Vec<u8>) -> Result<(), PktLineError> {
+        let start = dest.len();
+        let result = self.encode_recorded(dest);
+        crate::record::emit("pktEncode", serde_json::json!({"packet": packet_json(self), "bytes": String::from_utf8_lossy(&dest[start..])}));
+        result
+    }
+
+    fn encode_recorded(&self, dest: &mut Vec<u8>) -> Result<(), PktLineError> {
         match self {
             Packet::Data(data) => {
                 let len = data.len() + 4;
@@ -128,6 +135,16 @@ impl<'a> Packet<'a> {
     ///
     /// Returns the decoded packet, or an error if decoding failed.
     pub(crate) fn decode(packet: &'a [u8]) -> Result<Self, PktLineError> {
+        let result = Self::decode_recorded(packet);
+        let outcome = match &result {
+            Ok(p) => serde_json::json!({"packet": packet_json(p)}),
+            Err(e) => serde_json::json!({"error": format!("{e:?}").split([' ', '{', '(']).next().unwrap().to_string()}),
+        };
+        crate::record::emit("pktDecode", serde_json::json!({"bytes": packet, "result": outcome}));
+        result
+    }
+
+    fn decode_recorded(packet: &'a [u8]) -> Result<Self, PktLineError> {
         if packet.len() < LENGTH_PREFIX_LEN {
             return Err(PktLineError::FrameTooShort {
                 actual: packet.len(),
@@ -225,6 +242,14 @@ impl<'a> Iterator for PacketIterator<'a> {
     }
 }
 
+fn packet_json(packet: &Packet) -> serde_json::Value {
+    match packet {
+        Packet::Data(data) => serde_json::json!({"type": "data", "data": String::from_utf8_lossy(data.as_ref())}),
+        Packet::Flush => serde_json::json!({"type": "flush"}),
+        Packet::Delim => serde_json::json!({"type": "delim"}),
+    }
+}
+
 #[cfg(test)]
 mod tests {
     use core::panic;
diff --git a/crates/zizmor/src/main.rs b/crates/zizmor/src/main.rs
index 15044b1..2c700ec 100644
--- a/crates/zizmor/src/main.rs
+++ b/crates/zizmor/src/main.rs
@@ -47,6 +47,7 @@ mod output;
 mod registry;
 mod state;
 mod utils;
+mod record;
 
 #[cfg(all(
     not(target_family = "windows"),
diff --git a/crates/zizmor/src/models/coordinate.rs b/crates/zizmor/src/models/coordinate.rs
index b729875..329a1cb 100644
--- a/crates/zizmor/src/models/coordinate.rs
+++ b/crates/zizmor/src/models/coordinate.rs
@@ -447,25 +447,25 @@ mod tests {
         let with_disabled = IndexMap::from([("set-me".into(), EnvValue::String("".into()))]);
 
         assert_eq!(
-            optin_control.eval(&uses, &[], &with_enabled),
+            rec_eval(&optin_control, &uses, &with_enabled),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             })
         );
         assert_eq!(
-            optin_control.eval(&uses, &[], &with_disabled),
+            rec_eval(&optin_control, &uses, &with_disabled),
             ControlEvaluation::NotSatisfied(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             })
         );
         assert_eq!(
-            optout_control.eval(&uses, &[], &with_enabled),
+            rec_eval(&optout_control, &uses, &with_enabled),
             ControlEvaluation::NotSatisfied(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             })
         );
         assert_eq!(
-            optout_control.eval(&uses, &[], &with_disabled),
+            rec_eval(&optout_control, &uses, &with_disabled),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             })
@@ -503,7 +503,7 @@ mod tests {
             ),
         ] {
             let with = IndexMap::from([("set-me".into(), value)]);
-            assert_eq!(control.eval(&uses, &[], &with), expected);
+            assert_eq!(rec_eval(&control, &uses, &with), expected);
         }
     }
 
@@ -529,7 +529,7 @@ mod tests {
 
         let v6 = RepositoryUses::parse("foo/bar@v6.5.0").unwrap();
         assert_eq!(
-            control.eval(&v6, &[], &IndexMap::new()),
+            rec_eval(&control, &v6, &IndexMap::new()),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::UsesRef,
                 ControlOrigin::Default {
@@ -540,7 +540,7 @@ mod tests {
 
         let explicit = IndexMap::from([("enable-cache".into(), EnvValue::Boolean(true))]);
         assert_eq!(
-            control.eval(&v6, &[], &explicit),
+            rec_eval(&control, &v6, &explicit),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::Input {
                     field: "enable-cache"
@@ -551,7 +551,7 @@ mod tests {
 
         let v10 = RepositoryUses::parse("foo/bar@v10.0.0").unwrap();
         assert_eq!(
-            control.eval(&v10, &[], &explicit),
+            rec_eval(&control, &v10, &explicit),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::Input {
                     field: "enable-cache"
@@ -559,17 +559,17 @@ mod tests {
             })
         );
         assert!(matches!(
-            control.eval(&v10, &[], &IndexMap::new()),
+            rec_eval(&control, &v10, &IndexMap::new()),
             ControlEvaluation::NotSatisfied(_)
         ));
 
         let automatic = IndexMap::from([("enable-cache".into(), EnvValue::String("auto".into()))]);
         assert!(matches!(
-            control.eval(&v10, &[], &automatic),
+            rec_eval(&control, &v10, &automatic),
             ControlEvaluation::NotSatisfied(_)
         ));
         assert_eq!(
-            control.eval(&v6, &[], &automatic),
+            rec_eval(&control, &v6, &automatic),
             ControlEvaluation::Satisfied(indexset! {
                 ControlOrigin::UsesRef,
                 ControlOrigin::Input {
@@ -580,14 +580,14 @@ mod tests {
 
         let disabled = IndexMap::from([("enable-cache".into(), EnvValue::Boolean(false))]);
         assert!(matches!(
-            control.eval(&v6, &[], &disabled),
+            rec_eval(&control, &v6, &disabled),
             ControlEvaluation::NotSatisfied(_)
         ));
 
         let unknown =
             RepositoryUses::parse("foo/bar@d9e0f98d3fc6adb07d1e3d37f3043649ddad06a1").unwrap();
         assert_eq!(
-            control.eval(&unknown, &[], &IndexMap::new()),
+            rec_eval(&control, &unknown, &IndexMap::new()),
             ControlEvaluation::Conditional(indexset! { ControlOrigin::UsesRef })
         );
     }
@@ -648,11 +648,11 @@ mod tests {
         let coord =
             ActionCoordinate::NotConfigurable(RepositoryUsesPattern::from_str("foo/bar").unwrap());
         let step = &steps[3];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Trivial cases: coordinate is not configurable and matches the `uses:`.
         for step in &[&steps[0], &steps[1]] {
-            assert_eq!(coord.usage(*step), Some(Usage::Always));
+            assert_eq!(rec_usage(&coord, *step, &steps, &workflow), Some(Usage::Always));
         }
 
         // Coordinate `uses:` matches but is not enabled by default and is
@@ -662,12 +662,12 @@ mod tests {
             control: ControlExpr::field(Toggle::OptIn, "set-me", ControlFieldType::Boolean, false),
         };
         let step = &steps[0];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Coordinate `uses:` matches and is explicitly toggled on.
         let step = &steps[4];
         assert_eq!(
-            coord.usage(step),
+            rec_usage(&coord, step, &steps, &workflow),
             Some(Usage::Enabled(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             }))
@@ -675,7 +675,7 @@ mod tests {
 
         // Coordinate `uses:` matches but is explicitly toggled off.
         let step = &steps[5];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Coordinate `uses:` matches and is enabled by default.
         let coord = ActionCoordinate::Configurable {
@@ -684,7 +684,7 @@ mod tests {
         };
         let step = &steps[0];
         assert_eq!(
-            coord.usage(step),
+            rec_usage(&coord, step, &steps, &workflow),
             Some(Usage::Enabled(indexset! {
                 ControlOrigin::Default { field: "set-me" }
             }))
@@ -693,7 +693,7 @@ mod tests {
         // Coordinate `uses:` matches and is explicitly toggled on.
         let step = &steps[4];
         assert_eq!(
-            coord.usage(step),
+            rec_usage(&coord, step, &steps, &workflow),
             Some(Usage::Enabled(indexset! {
                 ControlOrigin::Input { field: "set-me" }
             }))
@@ -701,7 +701,7 @@ mod tests {
 
         // Coordinate `uses:` matches but is explicitly toggled off, despite default enablement.
         let step = &steps[5];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Coordinate `uses:` matches and has an opt-out toggle, which does not affect
         // the default.
@@ -715,16 +715,16 @@ mod tests {
             ),
         };
         let step = &steps[0];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Coordinate `uses:` matches and the opt-out inverts the match, clearing it.
         let step = &steps[6];
-        assert_eq!(coord.usage(step), None);
+        assert_eq!(rec_usage(&coord, step, &steps, &workflow), None);
 
         // Coordinate `uses:` matches and the opt-out inverts the match, clearing it.
         let step = &steps[7];
         assert_eq!(
-            coord.usage(step),
+            rec_usage(&coord, step, &steps, &workflow),
             Some(Usage::Enabled(indexset! {
                 ControlOrigin::Input {
                     field: "disable-cache"
@@ -735,10 +735,92 @@ mod tests {
         // Coordinate `uses:` matches but `with:` is an expression.
         let step = &steps[8];
         assert_eq!(
-            coord.usage(step),
+            rec_usage(&coord, step, &steps, &workflow),
             Some(Usage::Conditional(indexset! {
                 ControlOrigin::WithExpression
             }))
         );
     }
+
+
+    fn origin_json(origin: &ControlOrigin) -> serde_json::Value {
+        match origin {
+            ControlOrigin::Default { field } => serde_json::json!({"type": "default", "field": field}),
+            ControlOrigin::Input { field } => serde_json::json!({"type": "input", "field": field}),
+            ControlOrigin::UsesRef => serde_json::json!({"type": "uses-ref"}),
+            ControlOrigin::WithExpression => serde_json::json!({"type": "with-expression"}),
+        }
+    }
+
+    fn origins_json(origins: &indexmap::IndexSet<ControlOrigin>) -> Vec<serde_json::Value> {
+        origins.iter().map(origin_json).collect()
+    }
+
+    fn evaluation_json(evaluation: &ControlEvaluation) -> serde_json::Value {
+        match evaluation {
+            ControlEvaluation::Satisfied(o) => serde_json::json!({"verdict": "satisfied", "origins": origins_json(o)}),
+            ControlEvaluation::NotSatisfied(o) => serde_json::json!({"verdict": "not-satisfied", "origins": origins_json(o)}),
+            ControlEvaluation::Conditional(o) => serde_json::json!({"verdict": "conditional", "origins": origins_json(o)}),
+        }
+    }
+
+    fn version_json(version: &Version) -> serde_json::Value {
+        serde_json::json!({"raw": version.raw, "major": version.major, "minor": version.minor, "patch": version.patch})
+    }
+
+    fn control_json(control: &ControlExpr) -> serde_json::Value {
+        match control {
+            ControlExpr::VersionBound(VersionBound::LessThan(v)) => serde_json::json!({"type": "version-less-than", "version": version_json(v)}),
+            ControlExpr::VersionBound(_) => panic!("unrecorded version bound"),
+            ControlExpr::Field { toggle, field_name, field_type, satisfied_by_default } => serde_json::json!({
+                "type": "field",
+                "toggle": match toggle { Toggle::OptIn => "opt-in", Toggle::OptOut => "opt-out" },
+                "field": field_name,
+                "fieldType": match field_type {
+                    ControlFieldType::Boolean => serde_json::json!({"type": "boolean"}),
+                    ControlFieldType::FreeString => serde_json::json!({"type": "free-string"}),
+                    ControlFieldType::Exact(items) => serde_json::json!({"type": "exact", "items": items}),
+                },
+                "satisfiedByDefault": satisfied_by_default,
+            }),
+            ControlExpr::All(exprs) => serde_json::json!({"type": "all", "exprs": exprs.iter().map(control_json).collect::<Vec<_>>()}),
+            ControlExpr::Any(exprs) => serde_json::json!({"type": "any", "exprs": exprs.iter().map(control_json).collect::<Vec<_>>()}),
+            ControlExpr::Not(expr) => serde_json::json!({"type": "not", "expr": control_json(expr)}),
+        }
+    }
+
+    fn env_json(value: &EnvValue) -> serde_json::Value {
+        match value {
+            EnvValue::String(s) => serde_json::json!({"type": "string", "value": s}),
+            EnvValue::Number(n) => serde_json::json!({"type": "number", "value": n}),
+            EnvValue::Boolean(b) => serde_json::json!({"type": "boolean", "value": b}),
+        }
+    }
+
+    fn rec_eval(control: &ControlExpr, uses: &RepositoryUses, with: &IndexMap<String, EnvValue>) -> ControlEvaluation {
+        let result = control.eval(uses, &[], with);
+        let inputs = with.iter().map(|(k, v)| serde_json::json!([k, env_json(v)])).collect::<Vec<_>>();
+        crate::record::emit("controlEval", serde_json::json!({"control": control_json(control), "uses": uses.raw(), "inputs": inputs, "result": evaluation_json(&result)}));
+        result
+    }
+
+    fn coord_json(coord: &ActionCoordinate) -> serde_json::Value {
+        match coord {
+            ActionCoordinate::NotConfigurable(pattern) => serde_json::json!({"type": "fixed", "pattern": pattern.to_string()}),
+            ActionCoordinate::Configurable { uses_pattern, control } => serde_json::json!({"type": "configurable", "pattern": uses_pattern.to_string(), "control": control_json(control)}),
+        }
+    }
+
+    fn rec_usage<'doc, S: crate::models::StepCommon<'doc>>(coord: &ActionCoordinate, step: &S, steps: &[S], workflow: &Workflow) -> Option<Usage> {
+        use crate::models::AsDocument as _;
+        let result = coord.usage(step);
+        let index = steps.iter().position(|s| std::ptr::eq(s, step)).unwrap();
+        let usage = result.as_ref().map(|u| match u {
+            Usage::Enabled(o) => serde_json::json!({"type": "enabled", "origins": origins_json(o)}),
+            Usage::Conditional(o) => serde_json::json!({"type": "conditional", "origins": origins_json(o)}),
+            Usage::Always => serde_json::json!({"type": "always"}),
+        });
+        crate::record::emit("coordinateUsage", serde_json::json!({"source": workflow.as_document().source(), "step": index, "coordinate": coord_json(coord), "result": usage}));
+        result
+    }
 }
diff --git a/crates/zizmor/src/models/uses.rs b/crates/zizmor/src/models/uses.rs
index 272c1bc..c3dd035 100644
--- a/crates/zizmor/src/models/uses.rs
+++ b/crates/zizmor/src/models/uses.rs
@@ -432,6 +432,7 @@ mod tests {
             ("owner/*@*", None),
             ("*@*", None),
         ] {
+            crate::record::emit("usesPatternParse", serde_json::json!({"input": pattern, "result": RepositoryUsesPattern::from_str(pattern).ok().map(|p| pattern_json(&p))}));
             let pattern = RepositoryUsesPattern::from_str(pattern).ok();
             assert_eq!(pattern, expected);
         }
@@ -448,7 +449,9 @@ mod tests {
             RepositoryUsesPattern::InOwner("owner".into()),
         ];
 
+        let before = patterns.iter().map(pattern_json).collect::<Vec<_>>();
         patterns.sort();
+        crate::record::emit("usesPatternOrder", serde_json::json!({"input": before, "output": patterns.iter().map(pattern_json).collect::<Vec<_>>()}));
 
         assert_eq!(
             patterns,
@@ -491,6 +494,7 @@ mod tests {
             let repo_ref = RepoRef::from_url(&url, git_ref);
             let pattern = RepositoryUsesPattern::from_str(pattern)?;
 
+            crate::record::emit("usesPatternMatchesUrl", serde_json::json!({"url": url.as_str(), "gitRef": git_ref, "pattern": pattern_json(&pattern), "result": pattern.matches(&repo_ref)}));
             assert_eq!(pattern.matches(&repo_ref), matches);
         }
 
@@ -557,6 +561,7 @@ mod tests {
 
             let pattern = RepositoryUsesPattern::from_str(pattern)?;
 
+            crate::record::emit("usesPatternMatchesUses", serde_json::json!({"uses": uses.raw(), "pattern": pattern_json(&pattern), "result": pattern.matches_uses(&uses)}));
             assert_eq!(
                 pattern.matches_uses(&uses),
                 matches,
@@ -566,4 +571,16 @@ mod tests {
 
         Ok(())
     }
+
+
+    fn pattern_json(pattern: &RepositoryUsesPattern) -> serde_json::Value {
+        match pattern {
+            RepositoryUsesPattern::ExactWithRef { owner, repo, subpath, git_ref } => serde_json::json!({"type": "exact-with-ref", "owner": owner, "repo": repo, "subpath": subpath, "gitRef": git_ref}),
+            RepositoryUsesPattern::ExactPath { owner, repo, subpath } => serde_json::json!({"type": "exact-path", "owner": owner, "repo": repo, "subpath": subpath}),
+            RepositoryUsesPattern::ExactRepo { owner, repo } => serde_json::json!({"type": "exact-repo", "owner": owner, "repo": repo}),
+            RepositoryUsesPattern::InRepo { owner, repo } => serde_json::json!({"type": "in-repo", "owner": owner, "repo": repo}),
+            RepositoryUsesPattern::InOwner(owner) => serde_json::json!({"type": "in-owner", "owner": owner}),
+            RepositoryUsesPattern::Any => serde_json::json!({"type": "any"}),
+        }
+    }
 }
diff --git a/crates/zizmor/src/models/version.rs b/crates/zizmor/src/models/version.rs
index 60320d7..d659f2b 100644
--- a/crates/zizmor/src/models/version.rs
+++ b/crates/zizmor/src/models/version.rs
@@ -48,7 +48,7 @@ static_regex!(
 /// like a version), but that we haven't validated at all as actually being
 /// semver-shaped.
 pub(crate) struct RawVersion<'a> {
-    raw: &'a str,
+    pub(crate) raw: &'a str,
 }
 
 impl<'a> From<&'a str> for RawVersion<'a> {
@@ -106,10 +106,10 @@ static_regex!(
 pub(crate) struct Version<'a> {
     /// The raw version, exactly as it appears in its source.
     #[allow(dead_code)]
-    raw: &'a str,
-    major: u64,
-    minor: u64,
-    patch: u64,
+    pub(crate) raw: &'a str,
+    pub(crate) major: u64,
+    pub(crate) minor: u64,
+    pub(crate) patch: u64,
 }
 
 impl<'a> Version<'a> {
@@ -217,6 +217,7 @@ mod tests {
 
         for (comment, expected) in test_cases {
             // Test the pattern matching directly
+            crate::record::emit("versionComment", serde_json::json!({"comment": comment, "capture": VERSION_COMMENT_PATTERN.captures(comment).map(|c| c[1].to_string())}));
             match (VERSION_COMMENT_PATTERN.captures(comment), expected) {
                 (None, None) => (),
                 (None, Some(expected)) => {
@@ -248,6 +249,7 @@ mod tests {
         ];
 
         for (comment, expected) in test_cases {
+            crate::record::emit("ratchetComment", serde_json::json!({"comment": comment, "capture": RATCHET_COMMENT_PATTERN.captures(comment).map(|c| c[1].to_string())}));
             match (RATCHET_COMMENT_PATTERN.captures(comment), expected) {
                 (None, None) => (),
                 (None, Some(expected)) => {
@@ -285,6 +287,7 @@ mod tests {
         ];
 
         for (input, exp_major, exp_minor, exp_patch) in cases {
+            rec_parse(input);
             let version = Version::parse(input).unwrap();
             assert_eq!(version.major, exp_major);
             assert_eq!(version.minor, exp_minor);
@@ -300,6 +303,7 @@ mod tests {
         ];
 
         for input in cases {
+            rec_parse(input);
             assert!(Version::parse(input).is_err(),);
         }
     }
@@ -333,7 +337,16 @@ mod tests {
         for (v1_str, v2_str, expected_ordering) in cases {
             let v1 = Version::parse(v1_str).unwrap();
             let v2 = Version::parse(v2_str).unwrap();
+            crate::record::emit("versionCompare", serde_json::json!({"lhs": v1_str, "rhs": v2_str, "ordering": format!("{:?}", v1.cmp(&v2))}));
             assert_eq!(v1.cmp(&v2), expected_ordering,);
         }
     }
+
+
+    fn rec_parse(input: &str) {
+        let result = Version::parse(input)
+            .ok()
+            .map(|v| serde_json::json!({"major": v.major, "minor": v.minor, "patch": v.patch}));
+        crate::record::emit("versionParse", serde_json::json!({"input": input, "result": result}));
+    }
 }
diff --git a/crates/zizmor/src/models/workflow/matrix.rs b/crates/zizmor/src/models/workflow/matrix.rs
index de13140..09691bb 100644
--- a/crates/zizmor/src/models/workflow/matrix.rs
+++ b/crates/zizmor/src/models/workflow/matrix.rs
@@ -396,6 +396,7 @@ jobs:
         };
 
         let matrix = Matrix::new(&job).unwrap();
+        rec_matrix(workflow_yaml, "test", &matrix, &[]);
 
         insta::assert_debug_snapshot!(matrix.expansions().iter().collect::<Vec<_>>(), @r#"
         [
@@ -1080,6 +1081,7 @@ jobs:
         };
 
         let matrix = Matrix::new(&job).unwrap();
+        rec_matrix(workflow_yaml, "test", &matrix, &["matrix.trivially-static", "matrix.trivially-dynamic", "matrix.nested-static.a", "matrix.nested-dynamic.b", "matrix.nonexistent"]);
 
         assert!(
             matrix.expands_to_static_values(&Context::parse("matrix.trivially-static").unwrap())
@@ -1131,6 +1133,7 @@ jobs:
         };
 
         let matrix = Matrix::new(&job).unwrap();
+        rec_matrix(workflow_yaml, "test", &matrix, &[]);
         let expansions = matrix.expansions();
         assert!(expansions.all_expansions.is_empty());
         assert!(expansions.indirectly_expanded.is_some());
@@ -1179,6 +1182,7 @@ jobs:
         };
 
         let matrix = Matrix::new(&job).unwrap();
+        rec_matrix(workflow_yaml, "indirect-matrix", &matrix, &[]);
         let expansions = matrix.expansions();
 
         assert_eq!(expansions.all_expansions.iter().count(), 3);
@@ -1188,4 +1192,32 @@ jobs:
 
         Ok(())
     }
+
+
+    fn rec_matrix(source: &str, job: &str, matrix: &Matrix, contexts: &[&str]) {
+        let expansions = matrix.expansions();
+        let all = expansions
+            .iter()
+            .map(|e| {
+                let route = e.location.route.components().iter().map(|c| match c {
+                    yamlpath::Component::Key(k) => serde_json::json!(k),
+                    yamlpath::Component::Index(i) => serde_json::json!(i),
+                }).collect::<Vec<_>>();
+                serde_json::json!({"path": e.path, "value": e.value, "route": route})
+            })
+            .collect::<Vec<_>>();
+        let statics = contexts
+            .iter()
+            .map(|c| serde_json::json!({"context": c, "result": matrix.expands_to_static_values(&Context::parse(c).unwrap())}))
+            .collect::<Vec<_>>();
+        crate::record::emit("matrix", serde_json::json!({
+            "source": source,
+            "job": job,
+            "expansions": all,
+            "indirectlyExpanded": expansions.indirectly_expanded().is_some(),
+            "indirectInclusions": expansions.indirect_inclusions().is_some(),
+            "indirectExclusions": expansions.indirect_exclusions().is_some(),
+            "static": statics,
+        }));
+    }
 }
diff --git a/crates/zizmor/src/utils.rs b/crates/zizmor/src/utils.rs
index b42b097..a63f85b 100644
--- a/crates/zizmor/src/utils.rs
+++ b/crates/zizmor/src/utils.rs
@@ -632,6 +632,7 @@ mod tests {
         ";
 
         let pats = super::split_patterns(patterns).collect::<Vec<_>>();
+        crate::record::emit("splitPatterns", serde_json::json!({"input": patterns, "output": pats}));
         assert_eq!(
             pats,
             &[
@@ -662,6 +663,7 @@ mod tests {
 
         for (text, expected_expr, expected_span) in exprs {
             let (actual_expr, actual_span) = extract_fenced_expression(text, 0).unwrap();
+            crate::record::emit("extractFenced", serde_json::json!({"text": text, "offset": 0, "bare": actual_expr.as_bare(), "raw": actual_expr.as_raw(), "start": actual_span.start, "end": actual_span.end}));
             assert_eq!(*expected_expr, actual_expr.as_bare());
             assert_eq!(*expected_span, actual_span);
         }
@@ -681,6 +683,7 @@ mod tests {
                 ]
                 .as_slice(),
             );
+            rec_all_fenced(raw);
             let exprs = extract_fenced_expressions(raw)
                 .into_iter()
                 .map(|(e, _)| e.as_raw().to_string())
@@ -714,6 +717,7 @@ runs:
             action.into(),
             InputKey::local("fakegroup".into(), "fake", None, None),
         )?);
+        rec_routable("Action", &action);
 
         let exprs = parse_fenced_expressions_from_routable(&action);
         assert_eq!(exprs.len(), 1);
@@ -745,6 +749,7 @@ jobs:
             workflow.into(),
             InputKey::local("fakegroup".into(), "fake", None, None),
         )?);
+        rec_routable("Workflow", &workflow);
 
         let exprs = parse_fenced_expressions_from_routable(&workflow)
             .into_iter()
@@ -788,6 +793,7 @@ jobs:
             workflow_content.into(),
             InputKey::local("fakegroup".into(), "fake", None, None),
         )?);
+        rec_routable("Workflow", &workflow);
         let exprs = parse_fenced_expressions_from_routable(&workflow)
             .into_iter()
             .map(|(e, span)| (e.as_raw().to_string(), span))
@@ -824,6 +830,7 @@ jobs:
             ("/./../bash", "bash"),
             ("/bin/bash -e {0}", "bash"),
         ] {
+            crate::record::emit("normalizeShell", serde_json::json!({"input": actual, "output": normalize_shell(actual)}));
             assert_eq!(normalize_shell(actual), *expected)
         }
     }
@@ -848,7 +855,26 @@ jobs:
                 panic!("expected a context expression for {env_ctx}");
             };
 
+            crate::record::emit("envIsStatic", serde_json::json!({"context": env_ctx, "result": env_is_static(ctx, &[])}));
             assert_eq!(env_is_static(ctx, &[]), *is_static, "for {env_ctx}");
         }
     }
+
+
+    fn rec_all_fenced(text: &str) {
+        let result = extract_fenced_expressions(text)
+            .iter()
+            .map(|(e, s)| serde_json::json!({"raw": e.as_raw(), "start": s.start, "end": s.end}))
+            .collect::<Vec<_>>();
+        crate::record::emit("extractAllFenced", serde_json::json!({"text": text, "result": result}));
+    }
+
+    fn rec_routable(kind: &str, input: &AuditInput) {
+        use crate::models::AsDocument as _;
+        let result = parse_fenced_expressions_from_routable(input)
+            .iter()
+            .map(|(e, s)| serde_json::json!({"raw": e.as_raw(), "start": s.start, "end": s.end}))
+            .collect::<Vec<_>>();
+        crate::record::emit("fencedInInput", serde_json::json!({"input": kind, "source": input.as_document().source(), "result": result}));
+    }
 }
```

Run the tests with the recorder on, then build the fixture with the script below (`node build.mjs records.jsonl units.json`):

```sh
ZIZMOR_UNIT_RECORD=$PWD/records.jsonl cargo test -p zizmor --bins --features schema
```

```js
import fs from "node:fs";
const [input, out] = process.argv.slice(2);
const records = fs.readFileSync(input, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const groups = {};
const seen = new Set();
for (const record of records) {
  const key = JSON.stringify(record);
  if (seen.has(key)) continue;
  seen.add(key);
  const { kind, ...rest } = record;
  groups[kind] ??= [];
  groups[kind].push({ id: `${kind}#${groups[kind].length + 1}`, ...rest });
}
fs.writeFileSync(out, `${JSON.stringify(groups, null, 1)}\n`);
console.log(Object.fromEntries(Object.entries(groups).map(([kind, items]) => [kind, items.length])));
```
