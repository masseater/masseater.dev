# zizmor expression unit test recordings

`expressions.json.gz` holds what zizmor 1.32.0's own unit tests for its expression engine (`cargo test -p github-actions-expressions` in [zizmorcore/zizmor](https://github.com/zizmorcore/zizmor/tree/v1.32.0/crates/github-actions-expressions), MIT license in `LICENSE`) pass to the engine and what it returns. `../../zizmor-expressions.test.ts` runs fu4's expression tree on each case.

- `parse`: every expression the tests parse (`Expr::parse`), with the AST and what zizmor derives from it: `consteval`, `contexts` (with `as_pattern` and `single_tail`), `dataflow_contexts`, `leaf_expressions`, `computed_indices` and `consteval_subexprs`. Spans are converted from UTF-8 byte offsets to UTF-16 offsets.
- `parentOf` and `patternMatches`: every context pattern check (`ContextPattern::parent_of`, `ContextPattern::matches`).
- `asBoolean` and `asNumber`: every conversion of an evaluation (`Evaluation::as_boolean`, `Evaluation::as_number`).
- `commutative`: every `Expr::commutative_matches` call.

The fixture is JSON, so `-0` is recorded as `0`, and the test compares numbers the same way. `expressions-known-failures.txt` lists the cases where fu4 differs on purpose, with the reason.

## Recording

Clone zizmor at `v1.32.0` and apply this patch:

```diff
diff --git a/crates/github-actions-expressions/src/context.rs b/crates/github-actions-expressions/src/context.rs
index 9290d95..5f92ffc 100644
--- a/crates/github-actions-expressions/src/context.rs
+++ b/crates/github-actions-expressions/src/context.rs
@@ -275,6 +275,12 @@ impl<'src> ContextPattern<'src> {
     /// This is a loose parent-child relationship; for example, `foo` is its
     /// own parent, as well as the parent of `foo.bar` and `foo.bar.baz`.
     pub fn parent_of(&self, ctx: &Context<'src>) -> bool {
+        let result = self.parent_of_recorded(ctx);
+        crate::record::pattern("parentOf", self.0, ctx, result);
+        result
+    }
+
+    fn parent_of_recorded(&self, ctx: &Context<'src>) -> bool {
         matches!(
             self.compare(ctx),
             Some(Comparison::Child | Comparison::Match)
@@ -285,6 +291,12 @@ impl<'src> ContextPattern<'src> {
     ///
     /// See [`ContextPattern`] for a description of the matching rules.
     pub fn matches(&self, ctx: &Context<'src>) -> bool {
+        let result = self.matches_recorded(ctx);
+        crate::record::pattern("patternMatches", self.0, ctx, result);
+        result
+    }
+
+    fn matches_recorded(&self, ctx: &Context<'src>) -> bool {
         matches!(self.compare(ctx), Some(Comparison::Match))
     }
 }
diff --git a/crates/github-actions-expressions/src/lib.rs b/crates/github-actions-expressions/src/lib.rs
index 916d47e..aa7905d 100644
--- a/crates/github-actions-expressions/src/lib.rs
+++ b/crates/github-actions-expressions/src/lib.rs
@@ -19,6 +19,7 @@ mod lexer;
 pub mod literal;
 pub mod op;
 mod parser;
+pub(crate) mod record;
 
 /// Errors that can occur during expression parsing.
 #[derive(Debug, thiserror::Error)]
@@ -361,7 +362,9 @@ impl<'src> Expr<'src> {
 
     /// Parses the given string into an expression.
     pub fn parse(expr: &'src str) -> Result<SpannedExpr<'src>, Error> {
-        parser::parse(expr)
+        let result = parser::parse(expr);
+        record::parsed(expr, &result);
+        result
     }
 
     /// Returns whether this expression 'commutatively matches' the given expression.
@@ -372,6 +375,12 @@ impl<'src> Expr<'src> {
     /// considered to match `b > a`. This check is recusive, i.e. two nested binary expressions
     /// will be fully checked for commutative equivalence.
     pub fn commutative_matches(&self, other: &Self) -> bool {
+        let result = self.commutative_matches_recorded(other);
+        record::commutative(self, other, result);
+        result
+    }
+
+    fn commutative_matches_recorded(&self, other: &Self) -> bool {
         match (self, other) {
             (Self::BinExpr(sb), Self::BinExpr(ob)) => {
                 if sb.op != ob.op {
@@ -523,6 +532,12 @@ impl Evaluation {
     /// - Strings: empty string is falsy, everything else is truthy
     /// - Arrays and dictionaries are always truthy (non-empty objects)
     pub fn as_boolean(&self) -> bool {
+        let result = self.as_boolean_recorded();
+        record::evaluated("asBoolean", self, serde_json::json!(result));
+        result
+    }
+
+    fn as_boolean_recorded(&self) -> bool {
         match self {
             Self::Boolean(b) => *b,
             Self::Null => false,
@@ -537,6 +552,12 @@ impl Evaluation {
     ///
     /// See: <https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#operators>
     pub fn as_number(&self) -> f64 {
+        let result = self.as_number_recorded();
+        record::evaluated("asNumber", self, serde_json::json!(result.to_string()));
+        result
+    }
+
+    fn as_number_recorded(&self) -> f64 {
         match self {
             Self::String(s) => parse_number(s),
             Self::Number(n) => *n,
```

Save this as `crates/github-actions-expressions/src/record.rs`:

```rust
use std::cell::Cell;
use std::io::Write;

use serde_json::{Value, json};

use crate::call::Function;
use crate::context::Context;
use crate::literal::Literal;
use crate::op::{BinOp, UnOp};
use crate::{Error, Evaluation, Expr, Origin, SpannedExpr};

thread_local! {
    static BUSY: Cell<bool> = const { Cell::new(false) };
}

fn write(value: Value) {
    let Ok(out) = std::env::var("ZIZMOR_RECORD") else {
        return;
    };
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(out)
        .expect("record file");
    let mut line = serde_json::to_string(&value).expect("json");
    line.push('\n');
    file.write_all(line.as_bytes()).expect("write");
}

fn origin(origin: &Origin<'_>) -> Value {
    json!({"start": origin.span.start, "end": origin.span.end, "raw": origin.raw})
}

fn function(func: &Function) -> &'static str {
    match func {
        Function::Contains => "contains",
        Function::StartsWith => "startswith",
        Function::EndsWith => "endswith",
        Function::Format => "format",
        Function::Join => "join",
        Function::ToJSON => "tojson",
        Function::FromJSON => "fromjson",
        Function::HashFiles => "hashfiles",
        Function::Case => "case",
        Function::Success => "success",
        Function::Always => "always",
        Function::Cancelled => "cancelled",
        Function::Failure => "failure",
    }
}

fn literal(lit: &Literal<'_>) -> Value {
    match lit {
        Literal::Number(n) => json!({"kind": "number", "value": n}),
        Literal::String(s) => json!({"kind": "string", "value": s}),
        Literal::Boolean(b) => json!({"kind": "boolean", "value": b}),
        Literal::Null => json!({"kind": "null"}),
    }
}

fn binop(op: &BinOp) -> &'static str {
    match op {
        BinOp::And => "and",
        BinOp::Or => "or",
        BinOp::Eq => "eq",
        BinOp::Neq => "neq",
        BinOp::Gt => "gt",
        BinOp::Ge => "ge",
        BinOp::Lt => "lt",
        BinOp::Le => "le",
    }
}

pub(crate) fn spanned(expr: &SpannedExpr<'_>) -> Value {
    json!({"origin": origin(&expr.origin), "expr": inner(&expr.inner)})
}

fn inner(expr: &Expr<'_>) -> Value {
    match expr {
        Expr::Literal(lit) => json!({"type": "literal", "literal": literal(lit)}),
        Expr::Star => json!({"type": "star"}),
        Expr::Call(call) => json!({"type": "call", "func": function(&call.func), "args": call.args.iter().map(spanned).collect::<Vec<_>>()}),
        Expr::Identifier(ident) => json!({"type": "identifier", "name": ident.as_str()}),
        Expr::Index(idx) => json!({"type": "index", "inner": spanned(idx)}),
        Expr::Context(ctx) => json!({"type": "context", "parts": ctx.parts.iter().map(spanned).collect::<Vec<_>>()}),
        Expr::BinExpr(bin) => json!({"type": "binary", "lhs": spanned(&bin.lhs), "op": binop(&bin.op), "rhs": spanned(&bin.rhs)}),
        Expr::UnExpr { op: UnOp::Not, expr } => json!({"type": "not", "inner": spanned(expr)}),
    }
}

pub(crate) fn evaluation(value: &Evaluation) -> Value {
    match value {
        Evaluation::String(s) => json!({"type": "string", "value": s}),
        Evaluation::Number(n) => {
            if n.is_finite() {
                json!({"type": "number", "value": n})
            } else {
                json!({"type": "number", "special": n.to_string()})
            }
        }
        Evaluation::Boolean(b) => json!({"type": "boolean", "value": b}),
        Evaluation::Null => json!({"type": "null"}),
        Evaluation::Array(items) => json!({"type": "array", "items": items.iter().map(evaluation).collect::<Vec<_>>()}),
        Evaluation::Object(entries) => {
            let mut keys: Vec<_> = entries.keys().collect();
            keys.sort();
            json!({"type": "object", "entries": keys.into_iter().map(|k| json!([k, evaluation(&entries[k])])).collect::<Vec<_>>()})
        }
    }
}

pub(crate) fn context_text(ctx: &Context<'_>) -> String {
    let mut out = String::new();
    for (index, part) in ctx.parts.iter().enumerate() {
        match &part.inner {
            Expr::Index(idx) => {
                out.push('[');
                out.push_str(idx.origin.raw);
                out.push(']');
            }
            _ => {
                if index > 0 {
                    out.push('.');
                }
                out.push_str(part.origin.raw);
            }
        }
    }
    out
}

fn origins<'a>(items: impl IntoIterator<Item = &'a Origin<'a>>) -> Value {
    Value::Array(items.into_iter().map(origin).collect())
}

pub(crate) fn parsed(src: &str, result: &Result<SpannedExpr<'_>, Error>) {
    if BUSY.with(Cell::get) {
        return;
    }
    BUSY.with(|busy| busy.set(true));
    let value = match result {
        Err(error) => json!({"kind": "parse", "src": src, "error": error.to_string()}),
        Ok(expr) => {
            let contexts: Vec<Value> = expr
                .contexts()
                .into_iter()
                .map(|(ctx, at)| {
                    json!({"origin": origin(at), "text": context_text(ctx), "singleTail": ctx.single_tail(), "pattern": ctx.as_pattern()})
                })
                .collect();
            json!({
                "kind": "parse",
                "src": src,
                "ast": spanned(expr),
                "consteval": expr.consteval().as_ref().map(evaluation),
                "contexts": contexts,
                "dataflowContexts": origins(expr.dataflow_contexts().into_iter().map(|(_, at)| at)),
                "leafExpressions": origins(expr.leaf_expressions().into_iter().map(|e| &e.origin)),
                "computedIndices": origins(expr.computed_indices().into_iter().map(|e| &e.origin)),
                "constevalSubexprs": expr.consteval_subexprs().into_iter().map(|(e, v)| json!([origin(&e.origin), evaluation(&v)])).collect::<Vec<_>>(),
            })
        }
    };
    BUSY.with(|busy| busy.set(false));
    write(value);
}

pub(crate) fn pattern(kind: &str, pattern: &str, ctx: &Context<'_>, result: bool) {
    write(json!({"kind": kind, "pattern": pattern, "context": context_text(ctx), "result": result}));
}

pub(crate) fn evaluated(kind: &str, value: &Evaluation, result: Value) {
    write(json!({"kind": kind, "value": evaluation(value), "result": result}));
}

pub(crate) fn commutative(lhs: &Expr<'_>, rhs: &Expr<'_>, result: bool) {
    write(json!({"kind": "commutative", "lhs": inner(lhs), "rhs": inner(rhs), "result": result}));
}
```

Run the tests with the recorder on, then build the fixture with the script below (`node build.mjs records.jsonl expressions.json.gz`):

```sh
ZIZMOR_RECORD=$PWD/records.jsonl cargo test -p github-actions-expressions
```

```js
import fs from "node:fs";
import zlib from "node:zlib";
const [input, out] = process.argv.slice(2);
const records = fs.readFileSync(input, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const encoder = new TextEncoder();
const unitsAt = (src, bytes) => {
  let seen = 0;
  let units = 0;
  for (const char of src) {
    if (seen >= bytes) return units;
    seen += encoder.encode(char).length;
    units += char.length;
  }
  return units;
};
const inUnits = (src, value) => {
  if (Array.isArray(value)) return value.map((item) => inUnits(src, item));
  if (value && typeof value === "object") {
    if ("start" in value && "end" in value && "raw" in value) {
      return { start: unitsAt(src, value.start), end: unitsAt(src, value.end), raw: value.raw };
    }
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "text").map(([key, inner]) => [key, inUnits(src, inner)]));
  }
  return value;
};
const groups = {};
const seen = new Set();
for (const record of records) {
  const key = JSON.stringify(record);
  if (seen.has(key)) continue;
  seen.add(key);
  const { kind, ...raw } = record;
  const rest = kind === "parse" ? inUnits(raw.src, raw) : raw;
  groups[kind] ??= [];
  groups[kind].push({ id: `${kind}#${groups[kind].length + 1}`, ...rest });
}
fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(groups), { level: 9 }));
console.log(Object.fromEntries(Object.entries(groups).map(([kind, items]) => [kind, items.length])));
```
