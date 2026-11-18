use napi::bindgen_prelude::{Buffer, Result};
use napi_derive::napi;
use rayon::prelude::*;
use serde_json::{Map, Value, json};
use std::collections::HashMap;
use std::path::PathBuf;
use tracing::info_span;

use y8_core::{Input, Linter, PluginConfig, Plugins, Transfer, builtin_rules};

use napi_telemetry as telemetry;

#[napi(object)]
pub struct FileInput {
    pub path: String,
    pub text: String,
}

#[napi(object)]
pub struct LintOptions {
    pub config: Option<Value>,
    pub inline_config: Option<bool>,
    pub keep_tree: Option<bool>,
    pub keep_source: Option<bool>,
    pub traceparent: Option<String>,
    pub root: Option<String>,
    pub plugins: Option<Vec<PluginOptions>>,
    pub cache_dir: Option<String>,
}

#[napi(object)]
pub struct FileOutput {
    pub path: String,
    pub diagnostics: String,
    pub plugin_diagnostics: Option<Value>,
    pub source: Option<Buffer>,
}

#[napi(object)]
pub struct PluginOptions {
    pub name: String,
    pub prefix: String,
    pub rules: HashMap<String, String>,
}

fn linter(options: &mut LintOptions) -> Linter {
    let config = match options.config.take() {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };
    let linter = Linter::new(config, options.inline_config.unwrap_or(true));
    match options.cache_dir.as_deref() {
        Some(directory) => linter.with_cache(std::path::Path::new(directory)),
        None => linter,
    }
}

fn plugin_findings(plugins: &Plugins, inputs: &[Input]) -> Result<Vec<Value>> {
    let parent = tracing::Span::current();
    inputs
        .par_iter()
        .map(|input| {
            let _guard = parent.enter();
            serde_json::to_value(plugins.check(&input.path, &input.text))
                .map_err(|error| napi::Error::from_reason(error.to_string()))
        })
        .collect()
}

fn plugins_of(options: &mut LintOptions) -> Option<Plugins> {
    let configs: Vec<PluginConfig> = options
        .plugins
        .take()?
        .into_iter()
        .map(|plugin| PluginConfig {
            name: plugin.name,
            prefix: plugin.prefix,
            rules: plugin.rules,
        })
        .collect();
    let root = PathBuf::from(options.root.as_deref().unwrap_or("."));
    (!configs.is_empty()).then(|| Plugins::new(&root, configs))
}

fn transfer_of(options: &LintOptions) -> Transfer {
    match (
        options.keep_tree.unwrap_or(false),
        options.keep_source.unwrap_or(false),
    ) {
        (true, _) => Transfer::TextAndTree,
        (false, true) => Transfer::Text,
        (false, false) => Transfer::Nothing,
    }
}

fn to_json(value: &[y8_core::Diagnostic]) -> Result<String> {
    serde_json::to_string(value).map_err(|error| napi::Error::from_reason(error.to_string()))
}

fn run(inputs: &[Input], mut options: LintOptions) -> Result<Vec<FileOutput>> {
    let transfer = transfer_of(&options);
    let plugins = plugins_of(&mut options);
    let linter = linter(&mut options);
    let results = linter.lint_all(inputs, transfer);
    let mut found = match &plugins {
        Some(plugins) => plugin_findings(plugins, inputs)?,
        None => Vec::new(),
    }
    .into_iter();
    let _span = info_span!("y8.to_js", "y8.files" = results.len()).entered();
    results
        .into_iter()
        .map(|result| {
            Ok(FileOutput {
                diagnostics: to_json(&result.diagnostics)?,
                plugin_diagnostics: found.next(),
                source: result.transfer.map(Buffer::from),
                path: result.path,
            })
        })
        .collect()
}

#[napi]
pub fn lint(files: Vec<FileInput>, options: LintOptions) -> Result<Vec<FileOutput>> {
    telemetry::init("y8", env!("CARGO_PKG_VERSION"));
    let span = info_span!("y8.lint", "y8.files" = files.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let inputs: Vec<Input> = files
        .into_iter()
        .map(|file| Input {
            path: file.path,
            text: file.text,
        })
        .collect();
    run(&inputs, options)
}

#[napi]
pub fn lint_paths(
    root: String,
    paths: Vec<String>,
    mut options: LintOptions,
) -> Result<Vec<FileOutput>> {
    options.root.get_or_insert_with(|| root.clone());
    telemetry::init("y8", env!("CARGO_PKG_VERSION"));
    let span = info_span!("y8.lint_paths", "y8.files" = paths.len());
    telemetry::adopt(&span, options.traceparent.as_deref());
    let _entered = span.enter();
    let parent = tracing::Span::current();
    let root = std::path::PathBuf::from(root);
    let inputs = paths
        .into_par_iter()
        .map(|path| {
            let _read =
                info_span!(parent: &parent, "y8.read_file", "code.file.path" = path.as_str())
                    .entered();
            match std::fs::read_to_string(root.join(&path)) {
                Ok(text) => Ok(Some(Input { path, text })),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
                Err(error) => Err(napi::Error::from_reason(format!("{path}: {error}"))),
            }
        })
        .collect::<Result<Vec<Option<Input>>>>()?
        .into_iter()
        .flatten()
        .collect::<Vec<Input>>();
    run(&inputs, options)
}

#[napi]
#[must_use]
pub fn rules() -> Value {
    Value::Array(
        builtin_rules()
            .iter()
            .map(|rule| {
                let meta = rule.meta();
                json!({ "names": meta.names, "description": meta.description, "tags": meta.tags })
            })
            .collect(),
    )
}

pub struct Flush;

impl napi::Task for Flush {
    type Output = ();
    type JsValue = ();

    fn compute(&mut self) -> Result<Self::Output> {
        telemetry::flush();
        Ok(())
    }

    fn resolve(&mut self, _env: napi::Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
#[must_use]
pub fn flush_telemetry() -> napi::bindgen_prelude::AsyncTask<Flush> {
    napi::bindgen_prelude::AsyncTask::new(Flush)
}
