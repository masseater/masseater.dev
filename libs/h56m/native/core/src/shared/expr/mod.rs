use std::collections::{BTreeMap, HashMap};

use std::sync::{Arc, LazyLock, Mutex};

use aho_corasick::AhoCorasick;
use anyhow::{Result, anyhow, bail};
use regex::Regex;

use crate::shared::text;

#[derive(Debug, Clone)]
pub enum Value {
    Nil,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(Arc<str>),
    List(Arc<Vec<Value>>),
    Map(Arc<BTreeMap<String, Value>>),
}

impl Value {
    fn truthy(&self) -> Result<bool> {
        match self {
            Value::Bool(b) => Ok(*b),
            Value::Nil => Ok(false),
            other => bail!("expected a bool, got {other:?}"),
        }
    }
    fn str(&self) -> Result<&str> {
        match self {
            Value::Str(s) => Ok(s),
            other => bail!("expected a string, got {other:?}"),
        }
    }
    fn int(&self) -> Result<i64> {
        match self {
            Value::Int(i) => Ok(*i),
            Value::Float(f) => Ok(*f as i64),
            other => bail!("expected an int, got {other:?}"),
        }
    }
    fn num(&self) -> Result<f64> {
        match self {
            Value::Int(i) => Ok(*i as f64),
            Value::Float(f) => Ok(*f),
            other => bail!("expected a number, got {other:?}"),
        }
    }
    fn strings(&self) -> Option<Vec<&str>> {
        match self {
            Value::Str(s) => Some(vec![s]),
            Value::List(items) => items
                .iter()
                .map(|item| match item {
                    Value::Str(s) => Some(&**s),
                    _ => None,
                })
                .collect(),
            _ => None,
        }
    }
    pub fn string(s: &str) -> Value {
        Value::Str(Arc::from(s))
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Op {
    Or,
    And,
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
    Add,
    Sub,
    Mul,
    Div,
    Rem,
    Contains,
    Matches,
    In,
    Coalesce,
}

#[derive(Debug)]
pub enum Expr {
    Lit(Value),
    Var(String),
    Hash,
    List(Vec<Expr>),
    Map(Vec<(String, Expr)>),
    Index(Box<Expr>, Box<Expr>),
    Slice(Box<Expr>, Option<Box<Expr>>, Option<Box<Expr>>),
    Call(String, Vec<Expr>),
    Not(Box<Expr>),
    Neg(Box<Expr>),
    Bin(Op, Box<Expr>, Box<Expr>),
    Cond(Box<Expr>, Box<Expr>, Box<Expr>),
    Let(String, Box<Expr>, Box<Expr>),
    Lambda(Box<Expr>),
}

#[derive(Debug, Clone, PartialEq)]
enum Tok {
    Num(f64, bool),
    Str(String),
    Ident(String),
    Sym(&'static str),
    Hash,
    End,
}

const SYMBOLS: [&str; 28] = [
    "??", "?.", "||", "&&", "==", "!=", "<=", ">=", "..", "(", ")", "[", "]", "{", "}", ",", ":",
    ";", "?", "!", "<", ">", "+", "-", "*", "/", "%", "=",
];

fn quoted(source: &str, start: usize, quote: u8) -> Result<(String, usize)> {
    let mut s = String::new();
    let mut j = start + 1;
    loop {
        let ch = source[j..]
            .chars()
            .next()
            .ok_or_else(|| anyhow!("unterminated string"))?;
        j += ch.len_utf8();
        if ch as u32 == u32::from(quote) {
            return Ok((s, j));
        }
        if ch == '\\' {
            let esc = source[j..]
                .chars()
                .next()
                .ok_or_else(|| anyhow!("bad escape"))?;
            j += esc.len_utf8();
            s.push(match esc {
                'n' => '\n',
                'r' => '\r',
                't' => '\t',
                '0' => '\0',
                other => other,
            });
        } else {
            s.push(ch);
        }
    }
}

fn lex(source: &str) -> Result<Vec<Tok>> {
    let bytes = source.as_bytes();
    let mut i = 0;
    let mut out = Vec::new();
    while i < bytes.len() {
        let c = bytes[i];
        if c.is_ascii_whitespace() {
            i += 1;
            continue;
        }
        if source[i..].starts_with("//") {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        if c == b'`' {
            let end = source[i + 1..]
                .find('`')
                .ok_or_else(|| anyhow!("unterminated raw string"))?;
            out.push(Tok::Str(source[i + 1..i + 1 + end].to_owned()));
            i += end + 2;
            continue;
        }
        if c == b'"' || c == b'\'' {
            let (text, next) = quoted(source, i, c)?;
            out.push(Tok::Str(text));
            i = next;
            continue;
        }
        if c.is_ascii_digit() {
            let mut j = i;
            let mut float = false;
            while j < bytes.len()
                && (bytes[j].is_ascii_digit()
                    || (bytes[j] == b'.'
                        && !float
                        && j + 1 < bytes.len()
                        && bytes[j + 1].is_ascii_digit()))
            {
                if bytes[j] == b'.' {
                    float = true;
                }
                j += 1;
            }
            out.push(Tok::Num(source[i..j].parse()?, float));
            i = j;
            continue;
        }
        if c.is_ascii_alphabetic() || c == b'_' || c == b'$' {
            let mut j = i;
            while j < bytes.len()
                && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_' || bytes[j] == b'$')
            {
                j += 1;
            }
            out.push(Tok::Ident(source[i..j].to_owned()));
            i = j;
            continue;
        }
        if c == b'#' {
            out.push(Tok::Hash);
            i += 1;
            continue;
        }
        if c == b'.' && i + 1 < bytes.len() && bytes[i + 1].is_ascii_alphabetic() {
            out.push(Tok::Sym("."));
            i += 1;
            continue;
        }
        let sym = SYMBOLS
            .iter()
            .find(|sym| source[i..].starts_with(**sym))
            .ok_or_else(|| anyhow!("unexpected character {:?}", c as char))?;
        out.push(Tok::Sym(sym));
        i += sym.len();
    }
    out.push(Tok::End);
    Ok(out)
}

struct Parser {
    toks: Vec<Tok>,
    pos: usize,
}

impl Parser {
    fn peek(&self) -> &Tok {
        &self.toks[self.pos]
    }
    fn next(&mut self) -> Tok {
        let tok = self.toks[self.pos].clone();
        self.pos += 1;
        tok
    }
    fn eat(&mut self, sym: &str) -> bool {
        if matches!(self.peek(), Tok::Sym(s) if *s == sym) {
            self.pos += 1;
            true
        } else {
            false
        }
    }
    fn eat_word(&mut self, word: &str) -> bool {
        if matches!(self.peek(), Tok::Ident(s) if s == word) {
            self.pos += 1;
            true
        } else {
            false
        }
    }
    fn expect(&mut self, sym: &str) -> Result<()> {
        if self.eat(sym) {
            Ok(())
        } else {
            bail!("expected {sym}, got {:?}", self.peek())
        }
    }

    fn sequence(&mut self) -> Result<Expr> {
        if self.eat_word("let") {
            let Tok::Ident(name) = self.next() else {
                bail!("expected a name after let");
            };
            self.expect("=")?;
            let value = self.ternary()?;
            self.expect(";")?;
            let body = self.sequence()?;
            return Ok(Expr::Let(name, Box::new(value), Box::new(body)));
        }
        self.ternary()
    }

    fn ternary(&mut self) -> Result<Expr> {
        let cond = self.binary(0)?;
        if self.eat("?") {
            let then = self.ternary()?;
            self.expect(":")?;
            let other = self.ternary()?;
            return Ok(Expr::Cond(Box::new(cond), Box::new(then), Box::new(other)));
        }
        Ok(cond)
    }

    fn op_at(&self) -> Option<(Op, u8)> {
        Some(match self.peek() {
            Tok::Sym("??") => (Op::Coalesce, 1),
            Tok::Sym("||") => (Op::Or, 2),
            Tok::Ident(w) if w == "or" => (Op::Or, 2),
            Tok::Sym("&&") => (Op::And, 3),
            Tok::Ident(w) if w == "and" => (Op::And, 3),
            Tok::Sym("==") => (Op::Eq, 4),
            Tok::Sym("!=") => (Op::Ne, 4),
            Tok::Sym("<") => (Op::Lt, 5),
            Tok::Sym("<=") => (Op::Le, 5),
            Tok::Sym(">") => (Op::Gt, 5),
            Tok::Sym(">=") => (Op::Ge, 5),
            Tok::Ident(w) if w == "contains" => (Op::Contains, 5),
            Tok::Ident(w) if w == "matches" => (Op::Matches, 5),
            Tok::Ident(w) if w == "in" => (Op::In, 5),
            Tok::Sym("+") => (Op::Add, 6),
            Tok::Sym("-") => (Op::Sub, 6),
            Tok::Sym("*") => (Op::Mul, 7),
            Tok::Sym("/") => (Op::Div, 7),
            Tok::Sym("%") => (Op::Rem, 7),
            _ => return None,
        })
    }

    fn binary(&mut self, min: u8) -> Result<Expr> {
        let mut left = self.unary()?;
        while let Some((op, prec)) = self.op_at() {
            if prec <= min {
                break;
            }
            self.pos += 1;
            let right = self.binary(prec)?;
            left = Expr::Bin(op, Box::new(left), Box::new(right));
        }
        Ok(left)
    }

    fn unary(&mut self) -> Result<Expr> {
        if self.eat("!") || self.eat_word("not") {
            return Ok(Expr::Not(Box::new(self.unary()?)));
        }
        if self.eat("-") {
            return Ok(Expr::Neg(Box::new(self.unary()?)));
        }
        self.postfix()
    }

    fn postfix(&mut self) -> Result<Expr> {
        let mut expr = self.primary()?;
        loop {
            if self.eat("[") {
                if self.eat(":") {
                    let end = if self.eat("]") {
                        None
                    } else {
                        let e = self.ternary()?;
                        self.expect("]")?;
                        Some(Box::new(e))
                    };
                    expr = Expr::Slice(Box::new(expr), None, end);
                    continue;
                }
                let first = self.ternary()?;
                if self.eat(":") {
                    let end = if self.eat("]") {
                        None
                    } else {
                        let e = self.ternary()?;
                        self.expect("]")?;
                        Some(Box::new(e))
                    };
                    expr = Expr::Slice(Box::new(expr), Some(Box::new(first)), end);
                } else {
                    self.expect("]")?;
                    expr = Expr::Index(Box::new(expr), Box::new(first));
                }
            } else if self.eat(".") || self.eat("?.") {
                let Tok::Ident(name) = self.next() else {
                    bail!("expected a field name");
                };
                expr = Expr::Index(Box::new(expr), Box::new(Expr::Lit(Value::string(&name))));
            } else {
                return Ok(expr);
            }
        }
    }

    fn primary(&mut self) -> Result<Expr> {
        match self.next() {
            Tok::Num(n, float) => Ok(Expr::Lit(if float {
                Value::Float(n)
            } else {
                Value::Int(n as i64)
            })),
            Tok::Str(s) => Ok(Expr::Lit(Value::string(&s))),
            Tok::Hash => Ok(Expr::Hash),
            Tok::Ident(name) => match name.as_str() {
                "true" => Ok(Expr::Lit(Value::Bool(true))),
                "false" => Ok(Expr::Lit(Value::Bool(false))),
                "nil" => Ok(Expr::Lit(Value::Nil)),
                _ if self.eat("(") => {
                    let mut args = Vec::new();
                    if !self.eat(")") {
                        loop {
                            if self.eat("{") {
                                let body = self.sequence()?;
                                self.expect("}")?;
                                args.push(Expr::Lambda(Box::new(body)));
                            } else {
                                args.push(self.sequence()?);
                            }
                            if self.eat(")") {
                                break;
                            }
                            self.expect(",")?;
                        }
                    }
                    Ok(Expr::Call(name, args))
                }
                _ => Ok(Expr::Var(name)),
            },
            Tok::Sym("(") => {
                let e = self.sequence()?;
                self.expect(")")?;
                Ok(e)
            }
            Tok::Sym("[") => {
                let mut items = Vec::new();
                if !self.eat("]") {
                    loop {
                        if self.eat("]") {
                            break;
                        }
                        items.push(self.ternary()?);
                        if self.eat("]") {
                            break;
                        }
                        self.expect(",")?;
                    }
                }
                Ok(Expr::List(items))
            }
            Tok::Sym("{") => {
                let mut entries = Vec::new();
                if !self.eat("}") {
                    loop {
                        if self.eat("}") {
                            break;
                        }
                        let key = match self.next() {
                            Tok::Str(s) | Tok::Ident(s) => s,
                            other => bail!("bad map key {other:?}"),
                        };
                        self.expect(":")?;
                        entries.push((key, self.ternary()?));
                        if self.eat("}") {
                            break;
                        }
                        self.expect(",")?;
                    }
                }
                Ok(Expr::Map(entries))
            }
            other => bail!("unexpected token {other:?}"),
        }
    }
}

pub fn parse(source: &str) -> Result<Expr> {
    let mut parser = Parser {
        toks: lex(source)?,
        pos: 0,
    };
    let expr = parser.sequence()?;
    if parser.peek() != &Tok::End {
        bail!("trailing tokens at {:?}", parser.peek());
    }
    Ok(expr)
}

static REGEXES: LazyLock<Mutex<HashMap<String, Arc<Regex>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static TRIES: LazyLock<Mutex<HashMap<String, Arc<AhoCorasick>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn joined_regex(patterns: &[&str]) -> Result<Arc<Regex>> {
    let key = patterns.join("\0");
    let mut cache = REGEXES.lock().unwrap();
    if let Some(re) = cache.get(&key) {
        return Ok(Arc::clone(re));
    }
    let joined = patterns
        .iter()
        .map(|p| format!("(?:{})", text::go_regex(p)))
        .collect::<Vec<_>>()
        .join("|");
    let re = Arc::new(
        regex::RegexBuilder::new(&joined)
            .size_limit(1 << 28)
            .build()?,
    );
    cache.insert(key, Arc::clone(&re));
    Ok(re)
}

fn trie(terms: &[&str]) -> Result<Arc<AhoCorasick>> {
    let key = terms.join("\0");
    let mut cache = TRIES.lock().unwrap();
    if let Some(t) = cache.get(&key) {
        return Ok(Arc::clone(t));
    }
    let lowered: Vec<String> = terms.iter().map(|t| t.to_lowercase()).collect();
    let t = Arc::new(AhoCorasick::new(lowered)?);
    cache.insert(key, Arc::clone(&t));
    Ok(t)
}

pub struct Scope<'a> {
    pub finding: &'a Value,
    pub attributes: &'a Value,
    pub confidence: std::cell::RefCell<Option<String>>,
}

struct Env<'s, 'a> {
    scope: &'s Scope<'a>,
    vars: Vec<(String, Value)>,
    hash: Option<Value>,
}

fn any_string(value: &Value, test: impl Fn(&str) -> bool) -> bool {
    value
        .strings()
        .is_some_and(|items| items.into_iter().any(test))
}

fn byte_slice(s: &str, start: i64, end: i64) -> Value {
    let len = s.len() as i64;
    let clamp = |i: i64| -> usize { (if i < 0 { len + i } else { i }).clamp(0, len) as usize };
    let (a, b) = (clamp(start), clamp(end));
    if a >= b {
        return Value::string("");
    }
    let mut a = a;
    while !s.is_char_boundary(a) {
        a += 1;
    }
    let mut b = b;
    while !s.is_char_boundary(b) {
        b -= 1;
    }
    Value::string(s.get(a..b.max(a)).unwrap_or(""))
}

impl Env<'_, '_> {
    fn eval(&mut self, expr: &Expr) -> Result<Value> {
        Ok(match expr {
            Expr::Lit(v) => v.clone(),
            Expr::Hash => self
                .hash
                .clone()
                .ok_or_else(|| anyhow!("# outside a closure"))?,
            Expr::Var(name) => match name.as_str() {
                "finding" => self.scope.finding.clone(),
                "attributes" => self.scope.attributes.clone(),
                _ => self
                    .vars
                    .iter()
                    .rev()
                    .find(|(n, _)| n == name)
                    .map(|(_, v)| v.clone())
                    .ok_or_else(|| anyhow!("unknown name {name}"))?,
            },
            Expr::List(items) => Value::List(Arc::new(
                items.iter().map(|e| self.eval(e)).collect::<Result<_>>()?,
            )),
            Expr::Map(entries) => Value::Map(Arc::new(
                entries
                    .iter()
                    .map(|(k, e)| Ok((k.clone(), self.eval(e)?)))
                    .collect::<Result<_>>()?,
            )),
            Expr::Index(target, key) => {
                let target = self.eval(target)?;
                let key = self.eval(key)?;
                match (&target, &key) {
                    (Value::Map(map), Value::Str(k)) => {
                        map.get(&**k).cloned().unwrap_or(Value::Nil)
                    }
                    (Value::List(items), _) => {
                        let len = items.len() as i64;
                        let i = key.int()?;
                        let i = if i < 0 { len + i } else { i };
                        items.get(i as usize).cloned().unwrap_or(Value::Nil)
                    }
                    (Value::Str(s), _) => {
                        let i = key.int()?;
                        byte_slice(s, i, i + 1)
                    }
                    (Value::Nil, _) => Value::Nil,
                    _ => bail!("cannot index {target:?}"),
                }
            }
            Expr::Slice(target, start, end) => {
                let target = self.eval(target)?;
                let start = start.as_ref().map(|e| self.eval(e)).transpose()?;
                let end = end.as_ref().map(|e| self.eval(e)).transpose()?;
                match &target {
                    Value::Str(s) => byte_slice(
                        s,
                        start.map_or(Ok(0), |v| v.int())?,
                        end.map_or(Ok(s.len() as i64), |v| v.int())?,
                    ),
                    Value::List(items) => {
                        let len = items.len() as i64;
                        let clamp =
                            |i: i64| (if i < 0 { len + i } else { i }).clamp(0, len) as usize;
                        let a = clamp(start.map_or(Ok(0), |v| v.int())?);
                        let b = clamp(end.map_or(Ok(len), |v| v.int())?);
                        Value::List(Arc::new(if a < b {
                            items[a..b].to_vec()
                        } else {
                            Vec::new()
                        }))
                    }
                    _ => bail!("cannot slice {target:?}"),
                }
            }
            Expr::Not(e) => Value::Bool(!self.eval(e)?.truthy()?),
            Expr::Neg(e) => match self.eval(e)? {
                Value::Int(i) => Value::Int(-i),
                Value::Float(f) => Value::Float(-f),
                other => bail!("cannot negate {other:?}"),
            },
            Expr::Cond(c, t, f) => {
                if self.eval(c)?.truthy()? {
                    self.eval(t)?
                } else {
                    self.eval(f)?
                }
            }
            Expr::Let(name, value, body) => {
                let v = self.eval(value)?;
                self.vars.push((name.clone(), v));
                let out = self.eval(body);
                self.vars.pop();
                out?
            }
            Expr::Lambda(_) => bail!("a closure is only allowed as a call argument"),
            Expr::Bin(op, l, r) => self.binary(*op, l, r)?,
            Expr::Call(name, args) => self.call(name, args)?,
        })
    }

    fn binary(&mut self, op: Op, l: &Expr, r: &Expr) -> Result<Value> {
        match op {
            Op::Or => {
                return Ok(Value::Bool(
                    self.eval(l)?.truthy()? || self.eval(r)?.truthy()?,
                ));
            }
            Op::And => {
                return Ok(Value::Bool(
                    self.eval(l)?.truthy()? && self.eval(r)?.truthy()?,
                ));
            }
            Op::Coalesce => {
                let left = self.eval(l)?;
                return if matches!(left, Value::Nil) {
                    self.eval(r)
                } else {
                    Ok(left)
                };
            }
            _ => {}
        }
        let a = self.eval(l)?;
        let b = self.eval(r)?;
        Ok(match op {
            Op::Eq => Value::Bool(equal(&a, &b)),
            Op::Ne => Value::Bool(!equal(&a, &b)),
            Op::Lt | Op::Le | Op::Gt | Op::Ge => {
                let ord = match (&a, &b) {
                    (Value::Str(x), Value::Str(y)) => x.cmp(y),
                    _ => a
                        .num()?
                        .partial_cmp(&b.num()?)
                        .ok_or_else(|| anyhow!("NaN comparison"))?,
                };
                Value::Bool(match op {
                    Op::Lt => ord.is_lt(),
                    Op::Le => ord.is_le(),
                    Op::Gt => ord.is_gt(),
                    _ => ord.is_ge(),
                })
            }
            Op::Add => match (&a, &b) {
                (Value::Str(x), Value::Str(y)) => Value::string(&format!("{x}{y}")),
                (Value::Int(x), Value::Int(y)) => Value::Int(x + y),
                _ => Value::Float(a.num()? + b.num()?),
            },
            Op::Sub => match (&a, &b) {
                (Value::Int(x), Value::Int(y)) => Value::Int(x - y),
                _ => Value::Float(a.num()? - b.num()?),
            },
            Op::Mul => match (&a, &b) {
                (Value::Int(x), Value::Int(y)) => Value::Int(x * y),
                _ => Value::Float(a.num()? * b.num()?),
            },
            Op::Div => Value::Float(a.num()? / b.num()?),
            Op::Rem => Value::Int(a.int()? % b.int()?),
            Op::Contains => Value::Bool(a.str()?.contains(b.str()?)),
            Op::Matches => Value::Bool(joined_regex(&[b.str()?])?.is_match(a.str()?)),
            Op::In => match &b {
                Value::List(items) => Value::Bool(items.iter().any(|item| equal(item, &a))),
                Value::Map(map) => Value::Bool(map.contains_key(a.str()?)),
                _ => bail!("in expects a list or a map"),
            },
            Op::Or | Op::And | Op::Coalesce => unreachable!(),
        })
    }

    fn call_closure(&mut self, name: &str, args: &[Expr]) -> Result<Value> {
        let [list, Expr::Lambda(body)] = args else {
            bail!("{name} expects a list and a closure");
        };
        let Value::List(items) = self.eval(list)? else {
            bail!("{name} expects a list");
        };
        let saved = self.hash.take();
        let mut out = Vec::new();
        let mut verdict = name == "all";
        for item in items.iter() {
            self.hash = Some(item.clone());
            let v = self.eval(body)?;
            match name {
                "map" => out.push(v),
                "filter" => {
                    if v.truthy()? {
                        out.push(item.clone());
                    }
                }
                "any" => {
                    if v.truthy()? {
                        verdict = true;
                        break;
                    }
                }
                _ => {
                    if !v.truthy()? {
                        verdict = false;
                        break;
                    }
                }
            }
        }
        self.hash = saved;
        Ok(match name {
            "any" | "all" => Value::Bool(verdict),
            _ => Value::List(Arc::new(out)),
        })
    }

    fn call_string(name: &str, values: &[Value]) -> Result<Value> {
        let arg = |i: usize| {
            values
                .get(i)
                .ok_or_else(|| anyhow!("{name} is missing argument {i}"))
        };
        Ok(match name {
            "lower" => Value::string(&arg(0)?.str()?.to_lowercase()),
            "upper" => Value::string(&arg(0)?.str()?.to_uppercase()),
            "trim" => Value::string(arg(0)?.str()?.trim()),
            "replace" => {
                let (s, from, to) = (arg(0)?.str()?, arg(1)?.str()?, arg(2)?.str()?);
                match values.get(3) {
                    Some(n) => Value::string(&s.replacen(from, to, n.int()?.max(0) as usize)),
                    None => Value::string(&s.replace(from, to)),
                }
            }
            "split" => Value::List(Arc::new(
                arg(0)?
                    .str()?
                    .split(arg(1)?.str()?)
                    .map(Value::string)
                    .collect(),
            )),
            "join" => {
                let items = arg(0)?
                    .strings()
                    .ok_or_else(|| anyhow!("join expects strings"))?;
                let sep = values.get(1).map_or(Ok(""), |v| v.str())?;
                Value::string(&items.join(sep))
            }
            "repeat" => Value::string(&arg(0)?.str()?.repeat(arg(1)?.int()?.max(0) as usize)),
            other => bail!("unknown function {other}"),
        })
    }

    fn call(&mut self, name: &str, args: &[Expr]) -> Result<Value> {
        if matches!(name, "map" | "filter" | "any" | "all") {
            return self.call_closure(name, args);
        }
        let values: Vec<Value> = args.iter().map(|e| self.eval(e)).collect::<Result<_>>()?;
        let arg = |i: usize| {
            values
                .get(i)
                .ok_or_else(|| anyhow!("{name} is missing argument {i}"))
        };
        Ok(match name {
            "entropy" => Value::Float(text::entropy(arg(0)?.str()?)),
            "tokenRatio" => Value::Float(text::token_ratio(arg(0)?.str()?)),
            "failsTokenEfficiency" => Value::Bool(text::fails_token_efficiency(arg(0)?.str()?)),
            "matchesAny" => {
                let Some(patterns) = arg(1)?.strings() else {
                    return Ok(Value::Bool(false));
                };
                if patterns.is_empty() {
                    return Ok(Value::Bool(false));
                }
                let re = joined_regex(&patterns)?;
                Value::Bool(any_string(arg(0)?, |s| re.is_match(s)))
            }
            "findMatch" => {
                let re = joined_regex(&[arg(1)?.str()?])?;
                Value::string(re.find(arg(0)?.str()?).map_or("", |m| m.as_str()))
            }
            "containsAny" => {
                let Some(terms) = arg(1)?.strings() else {
                    return Ok(Value::Bool(false));
                };
                if terms.is_empty() {
                    return Ok(Value::Bool(false));
                }
                let t = trie(&terms)?;
                Value::Bool(any_string(arg(0)?, |s| t.is_match(&s.to_lowercase())))
            }
            "startsWithAny" => {
                let prefixes = arg(1)?.strings().unwrap_or_default();
                Value::Bool(any_string(arg(0)?, |s| {
                    prefixes.iter().any(|p| s.starts_with(p))
                }))
            }
            "intersects" => {
                let candidates = arg(1)?.strings().unwrap_or_default();
                Value::Bool(any_string(arg(0)?, |s| candidates.contains(&s)))
            }
            "setConfidence" => {
                let level = arg(0)?.str()?.to_owned();
                *self.scope.confidence.borrow_mut() = Some(level.clone());
                Value::string(&level)
            }
            "len" => Value::Int(match arg(0)? {
                Value::Str(s) => s.len() as i64,
                Value::List(l) => l.len() as i64,
                Value::Map(m) => m.len() as i64,
                _ => 0,
            }),
            "max" | "min" => {
                let (a, b) = (arg(0)?, arg(1)?);
                let pick_a = if name == "max" {
                    a.num()? >= b.num()?
                } else {
                    a.num()? <= b.num()?
                };
                if pick_a { a.clone() } else { b.clone() }
            }
            "fromBase64" => Value::string(&String::from_utf8_lossy(&text::from_base64(
                arg(0)?.str()?,
            )?)),
            "string" => match arg(0)? {
                Value::Str(s) => Value::Str(s.clone()),
                Value::Int(i) => Value::string(&i.to_string()),
                Value::Float(f) => Value::string(&f.to_string()),
                Value::Bool(b) => Value::string(&b.to_string()),
                _ => Value::string(""),
            },
            other => Self::call_string(other, &values)?,
        })
    }
}

fn equal(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Nil, Value::Nil) => true,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::Str(x), Value::Str(y)) => x == y,
        (Value::Int(x), Value::Int(y)) => x == y,
        (Value::Int(_) | Value::Float(_), Value::Int(_) | Value::Float(_)) => {
            a.num().ok() == b.num().ok()
        }
        _ => false,
    }
}

pub fn evaluate(expr: &Expr, scope: &Scope<'_>) -> Result<bool> {
    let mut env = Env {
        scope,
        vars: Vec::new(),
        hash: None,
    };
    env.eval(expr)?.truthy()
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;
    use std::collections::BTreeMap;
    use std::sync::Arc;

    use super::{Scope, Value, evaluate, parse};

    fn run(source: &str, secret: &str) -> (bool, Option<String>) {
        let finding = Value::Map(Arc::new(BTreeMap::from([(
            "secret".to_owned(),
            Value::string(secret),
        )])));
        let attributes = Value::Map(Arc::new(BTreeMap::from([(
            "path".to_owned(),
            Value::string("src/a.ts"),
        )])));
        let scope = Scope {
            finding: &finding,
            attributes: &attributes,
            confidence: RefCell::new(None),
        };
        let verdict = evaluate(&parse(source).unwrap(), &scope).unwrap();
        (verdict, scope.confidence.take())
    }

    #[test]
    fn evaluates_bindings_closures_and_string_helpers() {
        let source = r#"
            // comment
            let parts = split(finding["secret"], "-");
            len(filter(parts, {len(#) > 2})) == 2 && lower(parts[0]) == "abc"
        "#;
        assert!(run(source, "ABC-de-fgh").0);
        assert!(!run(source, "xyz-de-fgh").0);
    }

    #[test]
    fn matches_patterns_and_reads_attributes() {
        let source = r#"matchesAny(attributes["path"], [`^src/`]) and containsAny(finding.secret, ["EXAMPLE"])"#;
        assert!(run(source, "my-example-key").0);
        assert!(!run(source, "real").0);
    }

    #[test]
    fn set_confidence_is_visible_to_the_caller() {
        let (verdict, level) = run(
            r#"entropy(finding["secret"]) > 3.0 ? setConfidence("high") == "x" : false"#,
            "aB3$kL9!qW",
        );
        assert!(!verdict);
        assert_eq!(level.as_deref(), Some("high"));
    }

    #[test]
    fn rejects_unknown_syntax() {
        assert!(parse("finding[").is_err());
        assert!(parse("1 @ 2").is_err());
    }
}
