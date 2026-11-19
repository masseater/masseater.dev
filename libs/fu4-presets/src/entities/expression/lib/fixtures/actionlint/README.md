# actionlint Go test recordings

These fixtures hold what actionlint 1.7.12's own Go tests (`go test ./` in [rhysd/actionlint](https://github.com/rhysd/actionlint/tree/v1.7.12), MIT license in `LICENSE`) pass to actionlint and what it returns.

- `expressions.json.gz`: every expression the tests parse (`ExprParser.Parse`) and check (`ExprSemanticsChecker.Check`), with the checker's state. `../../actionlint-expressions.test.ts` runs fu4's parser and checker on each.
- `src/shared/glob/fixtures/actionlint/globs.json`: every glob the tests validate (`ValidateRefGlob`, `ValidatePathGlob`). `src/shared/glob/actionlint-globs.test.ts` runs fu4's validators on each.
- `src/app/fixtures/actionlint/lint-calls.json`: every workflow the tests lint (`Linter.check`) that is not a file in actionlint's `testdata`, which `src/app/fixtures/actionlint/` already holds. `src/app/actionlint-lint-calls.test.ts` lints each with the `actionlint` preset.

Each test has a known-failures file beside its fixture that lists the cases where fu4 differs on purpose, with the reason. Rule tests that build workflow ASTs in Go and pass them to a rule directly are not recorded, because they have no workflow text to give fu4.

## Recording

Clone actionlint at `v1.7.12` and save this as `record_hook.go` in its root:

```go
package actionlint

import (
	"encoding/json"
	"os"
	"reflect"
	"sort"
	"sync"
)

var (
	recordMu      sync.Mutex
	recordSources sync.Map
	recordUpdates sync.Map
)

func recordWrite(kind string, value map[string]any) {
	out := os.Getenv("ACTIONLINT_RECORD")
	if out == "" {
		return
	}
	value["kind"] = kind
	b, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	recordMu.Lock()
	defer recordMu.Unlock()
	f, err := os.OpenFile(out, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	f.Write(append(b, '\n'))
}

func recordType(t ExprType) any {
	switch ty := t.(type) {
	case nil:
		return nil
	case AnyType:
		return map[string]any{"kind": "any"}
	case NullType:
		return map[string]any{"kind": "null"}
	case NumberType:
		return map[string]any{"kind": "number"}
	case BoolType:
		return map[string]any{"kind": "bool"}
	case StringType:
		return map[string]any{"kind": "string"}
	case *ObjectType:
		props := map[string]any{}
		for k, v := range ty.Props {
			props[k] = recordType(v)
		}
		return map[string]any{"kind": "object", "props": props, "mapped": recordType(ty.Mapped)}
	case *ArrayType:
		return map[string]any{"kind": "array", "elem": recordType(ty.Elem), "deref": ty.Deref}
	default:
		return map[string]any{"kind": "unknown", "text": t.String()}
	}
}

func recordErrors(errs []*ExprError) []any {
	out := []any{}
	for _, e := range errs {
		out = append(out, map[string]any{"message": e.Message, "offset": e.Offset, "line": e.Line, "column": e.Column})
	}
	return out
}

func recordParse(src string, node ExprNode, err *ExprError) {
	if node != nil {
		recordSources.Store(node, src)
	}
	value := map[string]any{"src": src, "error": nil}
	if err != nil {
		value["error"] = map[string]any{"message": err.Message, "offset": err.Offset, "line": err.Line, "column": err.Column}
	}
	recordWrite("parse", value)
}

func recordUpdate(sema *ExprSemanticsChecker, name string, ty ExprType) {
	recordMu.Lock()
	defer recordMu.Unlock()
	found, _ := recordUpdates.Load(sema)
	list, _ := found.([]any)
	recordUpdates.Store(sema, append(list, map[string]any{"name": name, "type": recordType(ty)}))
}

func recordCheck(sema *ExprSemanticsChecker, expr ExprNode, ty ExprType, errs []*ExprError) {
	src, ok := recordSources.Load(expr)
	if !ok {
		return
	}
	updates := []any{}
	if found, ok := recordUpdates.Load(sema); ok {
		updates = found.([]any)
	}
	contexts := append([]string{}, sema.availableContexts...)
	funcs := append([]string{}, sema.availableSpecialFuncs...)
	updated := map[string]bool{}
	for _, u := range updates {
		updated[u.(map[string]any)["name"].(string)] = true
	}
	vars := map[string]any{}
	for name, ty := range sema.vars {
		if updated[name] || (name == "github" && updated["dispatchInputs"]) {
			continue
		}
		if builtin, ok := BuiltinGlobalVariableTypes[name]; ok && reflect.DeepEqual(builtin, ty) {
			continue
		}
		vars[name] = recordType(ty)
	}
	removed := []string{}
	for name := range BuiltinGlobalVariableTypes {
		if _, ok := sema.vars[name]; !ok {
			removed = append(removed, name)
		}
	}
	sort.Strings(removed)
	recordWrite("check", map[string]any{
		"vars":             vars,
		"removedVars":      removed,
		"customFunctions":  !reflect.DeepEqual(sema.funcs, BuiltinFuncSignatures),
		"src":              src,
		"untrusted":        sema.untrusted != nil,
		"configVars":       sema.configVars,
		"contexts":         contexts,
		"specialFunctions": funcs,
		"updates":          updates,
		"type":             ty.String(),
		"errors":           recordErrors(errs),
	})
}

func recordGlob(kind string, pat string, errs []InvalidGlobPattern) {
	out := []any{}
	for _, e := range errs {
		out = append(out, map[string]any{"message": e.Message, "column": e.Column})
	}
	recordWrite("glob", map[string]any{"glob": kind, "pattern": pat, "errors": out})
}

func recordLint(l *Linter, path string, content []byte, project *Project, errs []*Error, err error) {
	var cfg *Config
	if l.defaultConfig != nil {
		cfg = l.defaultConfig
	} else if project != nil {
		cfg = project.Config()
	}
	root := ""
	if project != nil {
		root = project.RootDir()
	}
	found := []any{}
	for _, e := range errs {
		found = append(found, map[string]any{"line": e.Line, "column": e.Column, "message": e.Message, "rule": e.Kind})
	}
	failure := ""
	if err != nil {
		failure = err.Error()
	}
	recordWrite("lint", map[string]any{
		"path": path, "root": root, "content": string(content), "config": cfg,
		"shellcheck": l.shellcheck != "", "pyflakes": l.pyflakes != "",
		"errors": found, "failure": failure,
	})
}
```

Rename `ExprParser.Parse`, `ExprSemanticsChecker.Check`, `ValidateRefGlob`, `ValidatePathGlob` and `Linter.check` to `parseRecorded`, `checkRecorded`, `validateRefGlobRecorded`, `validatePathGlobRecorded` and `checkRecorded`, and put a function with the old name in front of each that calls the renamed one and passes its arguments and results to `recordParse`, `recordCheck`, `recordGlob` or `recordLint`. Start each `Update*` method of `ExprSemanticsChecker` with `recordUpdate(sema, "<name>", ty)`, where the name is `matrix`, `steps`, `needs`, `secrets`, `inputs`, `dispatchInputs` or `jobs`. Then run the tests:

```sh
ACTIONLINT_RECORD=/tmp/actionlint.jsonl go test -count=1 ./
```

Build `expressions.json.gz` and `globs.json` with this script, `node build.mjs /tmp/actionlint.jsonl expressions.json.gz globs.json`:

```js
import fs from "node:fs";
import zlib from "node:zlib";
const [input, expressions, globs] = process.argv.slice(2);
const records = fs.readFileSync(input, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const unique = (kind) => {
  const seen = new Set();
  const out = [];
  for (const { kind: found, ...rest } of records) {
    if (found !== kind) continue;
    const key = JSON.stringify(rest);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rest);
  }
  return out;
};
const withIds = (prefix, items) => items.map((item, index) => ({ id: `${prefix}#${index + 1}`, ...item }));
const parses = withIds("parse", unique("parse"));
const checks = withIds("check", unique("check"));
fs.writeFileSync(expressions, zlib.gzipSync(JSON.stringify({ parses, checks }), { level: 9 }));
fs.writeFileSync(globs, `${JSON.stringify(withIds("glob", unique("glob")), null, 1)}\n`);
console.log("parses", parses.length, "checks", checks.length, "globs", unique("glob").length);
```

`lint-calls.json` keeps the distinct `lint` records whose content is not a file under actionlint's `testdata`, each as `{ id, content, configVariables, unsupported, errors }`, where `unsupported` names a rule the Go test added through `onRulesCreated`.
