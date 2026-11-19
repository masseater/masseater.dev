# Betterleaks rule tests

`betterleaks-rule-tests.json.gz` holds every test of every rule in Betterleaks at commit `e07e69ba6a441313529b3e72be43ffdcc62bdf86` (v2.0.0-rc.9), the commit that the `betterleaks` dev dependency pins. It is gzipped so that secret scanners do not read the test secrets. `LICENSE` is the Betterleaks license (MIT).

`src/app/betterleaks-rules.test.ts` runs them the way Betterleaks' `rules/rules_test.go` does: `TestRules` scans each input with the rule and its components alone, and `TestDefaultConfigPrecedence` scans each positive input with every rule on. Both run without decoding, as Betterleaks runs them, and every test must match.

Record it again when the pin moves. Put the program below at `cmd/dumptests/main.go` in a Betterleaks checkout of the pinned commit, then run `go run ./cmd/dumptests | gzip -9 -n > betterleaks-rule-tests.json.gz`.

```go
package main

import (
	"encoding/json"
	"os"

	"github.com/betterleaks/betterleaks/v2/config"
	"github.com/betterleaks/betterleaks/v2/internal/rulebuilder"
	_ "github.com/betterleaks/betterleaks/v2/rules"
)

type expected struct {
	Secret string `json:"secret"`
}

type test struct {
	Rule       string            `json:"rule"`
	Components []string          `json:"components"`
	Name       string            `json:"name"`
	Match      bool              `json:"match"`
	Input      string            `json:"input"`
	Path       string            `json:"path"`
	Expect     []expected        `json:"expect"`
	Captures   bool              `json:"captures"`
	Sets       bool              `json:"componentSets"`
}

type dump struct {
	Rules []string `json:"rules"`
	Tests []test   `json:"tests"`
}

func main() {
	cfg, err := rulebuilder.Config()
	if err != nil {
		panic(err)
	}
	out := dump{Rules: []string{}, Tests: []test{}}
	for _, rule := range cfg.Rules {
		out.Rules = append(out.Rules, rule.ID)
		components := []string{}
		for _, c := range rule.Components {
			components = append(components, c.RuleID)
		}
		for _, t := range rule.Tests {
			if len(t.Attributes) > 1 {
				panic("unexpected attributes")
			}
			for key := range t.Attributes {
				if key != "path" {
					panic("unexpected attribute " + key)
				}
			}
			entry := test{Rule: rule.ID, Components: components, Name: t.Name, Match: t.Mode == "match", Input: t.Input, Path: t.Attributes["path"], Expect: []expected{}}
			for _, e := range t.Expect {
				entry.Expect = append(entry.Expect, expected{Secret: e.Secret})
				entry.Captures = entry.Captures || len(e.Captures) > 0
				entry.Sets = entry.Sets || len(e.ComponentSets) > 0
			}
			out.Tests = append(out.Tests, entry)
		}
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(out); err != nil {
		panic(err)
	}
}

var _ = config.RuleTest{}
```
