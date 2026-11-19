# Betterleaks engine scans

`betterleaks-scans.json.gz` holds every distinct scan that the Go tests of Betterleaks at commit `e07e69ba6a441313529b3e72be43ffdcc62bdf86` (v2.0.0-rc.9) make through the scanner, with the findings Betterleaks returned. The rule tests of the `rules` package are left out because `@r_masseater/h56m-presets` runs them. It is gzipped so that secret scanners do not read the test secrets. `LICENSE` is the Betterleaks license (MIT).

Each scan has the config Betterleaks used (`configs`, keyed by hash, as TOML), the decode depth, the fragment text, its path, its first line and first-line column offset, and the expected rule, secret and location of each finding. `unsupported` names scanner options that h56m does not have; those scans are not run.

`src/app/betterleaks-scans.test.ts` scans each fragment with h56m and compares. Scans that do not match are listed in `betterleaks-scans-known-failures.txt` with the reason.

Record it again when the `betterleaks` pin in `@r_masseater/h56m-presets` moves. In a Betterleaks checkout of the pinned commit, save the file below as `scan/record_hook.go`, call `recordNew(s, cfg)` just before `return s, nil` in `New`, and call `recordScan(s, fragment, findings)` right after each `s.detectFragmentWithState(...)` call in `scan/scanner.go`. Then run the tests and build the fixture with the Node program further below.

```sh
mkdir -p /tmp/blrec
GODEBUG=tracebackancestors=20 BL_RECORD=/tmp/blrec/scan go test -count=1 ./...
node build.mjs /tmp/blrec betterleaks-scans.json.gz
```

```go
package scan

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"

	"github.com/betterleaks/betterleaks/v2/config"
	"github.com/betterleaks/betterleaks/v2/report"
	"github.com/betterleaks/betterleaks/v2/sources"
	toml "github.com/pelletier/go-toml/v2"
)

var recordMu sync.Mutex
var recordConfigs sync.Map

type recordedFinding struct {
	Rule        string `json:"rule"`
	Secret      string `json:"secret"`
	StartLine   int    `json:"startLine"`
	EndLine     int    `json:"endLine"`
	StartColumn int    `json:"startColumn"`
	EndColumn   int    `json:"endColumn"`
	Confidence  string `json:"confidence"`
	DecodeDepth int    `json:"decodeDepth"`
}

type recordedScan struct {
	Test            string            `json:"test"`
	Config          string            `json:"config"`
	MaxDecodeDepth  int               `json:"maxDecodeDepth"`
	MinConfidence   string            `json:"minConfidence"`
	AllowSignatures []string          `json:"allowSignatures"`
	Ignored         int               `json:"ignored"`
	Context         string            `json:"context"`
	Raw             string            `json:"raw"`
	StartLine       int               `json:"startLine"`
	ColumnOffset    int               `json:"columnOffset"`
	Attributes      map[string]string `json:"attributes"`
	Findings        []recordedFinding `json:"findings"`
}

func recordNew(s *Scanner, cfg *config.Config) {
	if os.Getenv("BL_RECORD") == "" {
		return
	}
	text, err := toml.Marshal(cfg)
	if err != nil {
		text = []byte("!unserializable: " + err.Error())
	}
	sum := sha256.Sum256(text)
	name := hex.EncodeToString(sum[:8])
	_ = os.WriteFile(filepath.Join(filepath.Dir(os.Getenv("BL_RECORD")), "cfg-"+name+".toml"), text, 0o644)
	recordConfigs.Store(s, name)
}

func recordScan(s *Scanner, fragment sources.Fragment, findings []report.Finding) {
	path := os.Getenv("BL_RECORD")
	if path == "" {
		return
	}
	cfg, _ := recordConfigs.Load(s)
	text, _ := cfg.(string)
	entry := recordedScan{
		Test:            testName(),
		Config:          text,
		MaxDecodeDepth:  s.maxDecodeDepth,
		MinConfidence:   s.minimumConfidence,
		AllowSignatures: s.allowSignatures,
		Ignored:         len(s.ignoredFingerprints),
		Context:         fmt.Sprintf("%+v", s.matchContext),
		Raw:             fragment.Raw,
		StartLine:       fragment.StartLine,
		ColumnOffset:    fragment.StartColumnOffset,
		Attributes:      fragment.Attributes,
		Findings:        []recordedFinding{},
	}
	for _, f := range findings {
		entry.Findings = append(entry.Findings, recordedFinding{
			Rule: f.RuleID, Secret: f.Match.Value,
			StartLine: f.Location.StartLine, EndLine: f.Location.EndLine,
			StartColumn: f.Location.StartColumn, EndColumn: f.Location.EndColumn,
			Confidence: f.Confidence, DecodeDepth: f.DecodeDepth,
		})
	}
	line, err := json.Marshal(entry)
	if err != nil {
		return
	}
	recordMu.Lock()
	defer recordMu.Unlock()
	file, err := os.OpenFile(fmt.Sprintf("%s.%d", path, os.Getpid()), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer file.Close()
	file.Write(append(line, '\n'))
}

func testName() string {
	pcs := make([]uintptr, 64)
	n := runtime.Callers(3, pcs)
	frames := runtime.CallersFrames(pcs[:n])
	for {
		frame, more := frames.Next()
		name := frame.Function
		if i := strings.LastIndex(name, "/"); i >= 0 {
			name = name[i+1:]
		}
		if strings.Contains(name, ".Test") {
			return name
		}
		if !more {
			return ancestorTest()
		}
	}
}

var ancestorPattern = regexp.MustCompile(`(?m)^[\w./-]*?(\w+\.Test[\w.]*)\(`)

func ancestorTest() string {
	buf := make([]byte, 1<<20)
	n := runtime.Stack(buf, false)
	match := ancestorPattern.FindSubmatch(buf[:n])
	if match == nil {
		return ""
	}
	return string(match[1])
}
```

```js
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const [dir, out] = process.argv.slice(2);
const DEFAULT_ALLOW = JSON.stringify(["betterleaks:allow", "gitleaks:allow"]);
const seen = new Map();
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.startsWith("scan.")) continue;
  for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
    if (!line) continue;
    const e = JSON.parse(line);
    if (e.test.startsWith("rules.")) continue;
    const pathAttr = (e.attributes && e.attributes.path) || "";
    const unsupported = [];
    if (e.ignored > 0) unsupported.push("ignored fingerprints");
    if (JSON.stringify(e.allowSignatures) !== DEFAULT_ALLOW) unsupported.push("allow signatures");
    if (!e.context.startsWith("{Mode:0")) unsupported.push("match context");
    if (e.minConfidence !== "") unsupported.push("minimum confidence");
    const key = JSON.stringify([
      e.config,
      e.maxDecodeDepth,
      unsupported,
      e.raw,
      pathAttr,
      e.startLine,
      e.columnOffset,
    ]);
    if (seen.has(key)) continue;
    seen.set(key, {
      test: e.test || "unknown",
      config: e.config,
      maxDecodeDepth: e.maxDecodeDepth,
      unsupported,
      raw: e.raw,
      path: pathAttr,
      startLine: e.startLine,
      columnOffset: e.columnOffset,
      expect: e.findings.map((x) => ({
        rule: x.rule,
        secret: x.secret,
        line: x.startLine,
        column: x.startColumn,
        endLine: x.endLine,
        endColumn: x.endColumn,
      })),
    });
  }
}
const counts = new Map();
const scans = [];
for (const s of seen.values()) {
  const n = counts.get(s.test) ?? 0;
  counts.set(s.test, n + 1);
  const { test, ...rest } = s;
  scans.push({ id: `${test}#${n}`, ...rest });
}
const used = new Set(scans.map((s) => s.config));
const configs = Object.fromEntries(
  [...used].sort().map((h) => [h, fs.readFileSync(path.join(dir, `cfg-${h}.toml`), "utf8")]),
);
const json = JSON.stringify({ configs, scans });
fs.writeFileSync(out, zlib.gzipSync(json, { level: 9 }));
console.log(
  "scans",
  scans.length,
  "configs",
  used.size,
  "json",
  json.length,
  "gz",
  fs.statSync(out).size,
);
```
