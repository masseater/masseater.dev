use crate::shared::text::{quote, quote_char};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvalidGlob {
    pub message: String,
    pub column: usize,
}

struct Scanner {
    chars: Vec<char>,
    at: usize,
    line: usize,
    column: usize,
}

impl Scanner {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.at).copied()
    }

    fn next(&mut self) -> Option<char> {
        let c = self.peek()?;
        self.at += 1;
        if c == '\n' {
            self.line += 1;
            self.column = 0;
        } else {
            self.column += 1;
        }
        Some(c)
    }
}

const RANGE_REASON: &str = "ref name cannot contain spaces, ~, ^, :, [, ?, *";

struct Validator {
    is_ref: bool,
    prec: bool,
    errors: Vec<InvalidGlob>,
    scan: Scanner,
    pattern: String,
}

fn is_print(c: char) -> bool {
    matches!(c, '\\' | '\'') || quote_char(c).chars().count() == 3
}

fn describe(c: Option<char>) -> String {
    quote_char(c.unwrap_or('\u{FFFD}'))
}

impl Validator {
    fn error(&mut self, message: String) {
        let column = if self.scan.line > 1 {
            0
        } else {
            self.scan.column
        };
        self.errors.push(InvalidGlob { message, column });
    }

    fn unexpected(&mut self, c: Option<char>, what: &str, why: &str) {
        let unexpected = match c {
            Some(c) => format!("unexpected character {}", quote_char(c)),
            None => "unexpected EOF".to_owned(),
        };
        let during = if what.is_empty() {
            String::new()
        } else {
            format!(" while checking {what}")
        };
        self.error(format!("invalid glob pattern. {unexpected}{during}. {why}"));
    }

    fn invalid_ref_char(&mut self, c: Option<char>, why: &str) {
        let shown = match c {
            Some(c) if is_print(c) => format!("'{c}'"),
            other => describe(other),
        };
        self.error(format!(
            "character {shown} is invalid for branch and tag names. {why}. see `man git-check-ref-format` for more details. note that regular expression is unavailable"
        ));
    }

    fn next(&mut self) -> Option<char> {
        let c = self.scan.next();
        if c == Some('\0') {
            let message = format!(
                "error while scanning glob pattern {}: invalid character NUL",
                quote(&self.pattern)
            );
            self.error(message);
        }
        c
    }

    fn validate_class(&mut self) -> Result<Option<char>, ()> {
        if self.scan.peek() == Some(']') {
            let c = self.next();
            self.unexpected(
                Some(']'),
                "content of character match []",
                "character match must not be empty",
            );
            return Ok(c);
        }
        let mut chars = 0;
        let mut c;
        loop {
            c = self.next();
            match c {
                Some(']') => break,
                None => {
                    self.unexpected(None, "end of character match []", "missing ]");
                    return Err(());
                }
                Some(start) => {
                    if self.scan.peek() != Some('-') {
                        chars += 1;
                        continue;
                    }
                    chars += 2;
                    self.next();
                    match self.scan.peek() {
                        Some(']') => {
                            c = self.next();
                            self.unexpected(c, "character range in []", "end of range is missing");
                            break;
                        }
                        None => {}
                        Some(_) => {
                            c = self.next();
                            if let Some(end) = c
                                && start > end
                            {
                                let why = format!(
                                    "start of range {} ({}) is larger than end of range {} ({})",
                                    quote_char(start),
                                    start as u32,
                                    quote_char(end),
                                    end as u32
                                );
                                self.unexpected(c, "character range in []", &why);
                            }
                        }
                    }
                }
            }
        }
        if chars == 1 {
            self.unexpected(
                c,
                "character match []",
                "character match with single character is useless. simply use x instead of [x]",
            );
        }
        Ok(c)
    }

    fn validate_next(&mut self) -> bool {
        let mut c = self.next();
        let mut prec = true;
        match c {
            Some('\\') => match self.scan.peek() {
                Some('[' | '?' | '*') => {
                    c = self.next();
                    if self.is_ref {
                        let peeked = self.scan.peek();
                        self.invalid_ref_char(peeked, RANGE_REASON);
                    }
                }
                Some('+' | '\\' | '!') => c = self.next(),
                _ => {
                    if self.is_ref {
                        self.invalid_ref_char(
                            Some('\\'),
                            "only special characters [, ?, +, *, \\, ! can be escaped with \\",
                        );
                        c = self.next();
                    }
                }
            },
            Some('?') => {
                if !self.prec {
                    self.unexpected(
                        Some('?'),
                        "special character ? (zero or one)",
                        "the preceding character must not be special character",
                    );
                }
                prec = false;
            }
            Some('+') => {
                if !self.prec {
                    self.unexpected(
                        Some('+'),
                        "special character + (one or more)",
                        "the preceding character must not be special character",
                    );
                }
                prec = false;
            }
            Some('*') => prec = false,
            Some('[') => match self.validate_class() {
                Ok(last) => c = last,
                Err(()) => return false,
            },
            Some('\r') => {
                if self.scan.peek() == Some('\n') {
                    c = self.next();
                }
                self.unexpected(c, "", "newline cannot be contained");
            }
            Some('\n') => self.unexpected(Some('\n'), "", "newline cannot be contained"),
            Some(' ' | '\t' | '~' | '^' | ':') if self.is_ref => {
                self.invalid_ref_char(c, RANGE_REASON);
            }
            _ => {}
        }
        self.prec = prec;
        if self.scan.peek().is_none() {
            if self.is_ref && matches!(c, Some('/' | '.')) {
                self.invalid_ref_char(c, "ref name must not end with / and .");
            }
            return false;
        }
        true
    }

    fn validate(&mut self) {
        if self.pattern.is_empty() {
            self.error("glob pattern cannot be empty".to_owned());
            return;
        }
        match self.scan.peek() {
            Some('/') if self.is_ref => {
                self.next();
                self.invalid_ref_char(Some('/'), "ref name must not start with /");
                self.prec = true;
            }
            Some('!') => {
                self.next();
                if self.scan.peek().is_none() {
                    self.unexpected(
                        Some('!'),
                        "! at first character (negate pattern)",
                        "at least one character must follow !",
                    );
                    return;
                }
                self.prec = false;
            }
            _ => {}
        }
        while self.validate_next() {}
    }
}

fn validate(pattern: &str, is_ref: bool) -> Vec<InvalidGlob> {
    let mut validator = Validator {
        is_ref,
        prec: false,
        errors: Vec::new(),
        scan: Scanner {
            chars: pattern.chars().collect(),
            at: 0,
            line: 1,
            column: 0,
        },
        pattern: pattern.to_owned(),
    };
    validator.validate();
    validator.errors
}

#[must_use]
pub fn validate_ref(pattern: &str) -> Vec<InvalidGlob> {
    validate(pattern, true)
}

#[must_use]
pub fn validate_path(pattern: &str) -> Vec<InvalidGlob> {
    let trimmed = pattern.trim();
    let mut errors = Vec::new();
    if trimmed != pattern {
        errors.push(InvalidGlob {
            message: "leading and trailing spaces are not allowed in glob path".to_owned(),
            column: 0,
        });
    }
    let body = trimmed.strip_prefix('!').unwrap_or(trimmed);
    if body == "." || body == ".." || body.starts_with("./") || body.starts_with("../") {
        errors.push(InvalidGlob {
            message: "'.' and '..' are not allowed in glob path".to_owned(),
            column: 0,
        });
    }
    if !errors.is_empty() {
        return errors;
    }
    validate(pattern, false)
}

fn class_matches(pattern: &[char], c: char) -> Option<(bool, usize)> {
    let mut index = 0;
    let negated = pattern.first() == Some(&'^');
    if negated {
        index += 1;
    }
    let mut matched = false;
    let mut first = true;
    loop {
        let current = *pattern.get(index)?;
        if current == ']' && !first {
            return Some((matched != negated, index + 1));
        }
        first = false;
        let low = if current == '\\' {
            index += 1;
            *pattern.get(index)?
        } else {
            current
        };
        index += 1;
        let mut high = low;
        if pattern.get(index) == Some(&'-') && pattern.get(index + 1).is_some_and(|n| *n != ']') {
            index += 1;
            high = *pattern.get(index)?;
            if high == '\\' {
                index += 1;
                high = *pattern.get(index)?;
            }
            index += 1;
        }
        if low <= c && c <= high {
            matched = true;
        }
    }
}

fn match_from(pattern: &[char], name: &[char]) -> bool {
    match pattern.first() {
        None => name.is_empty(),
        Some('*') => (0..=name.len())
            .take_while(|skip| name[..*skip].iter().all(|c| *c != '/'))
            .any(|skip| match_from(&pattern[1..], &name[skip..])),
        Some('?') => {
            name.first().is_some_and(|c| *c != '/') && match_from(&pattern[1..], &name[1..])
        }
        Some('[') => {
            let Some(&c) = name.first() else {
                return false;
            };
            match class_matches(&pattern[1..], c) {
                Some((true, used)) => c != '/' && match_from(&pattern[1 + used..], &name[1..]),
                _ => false,
            }
        }
        Some('\\') => {
            pattern.get(1).is_some_and(|p| name.first() == Some(p))
                && match_from(&pattern[2..], &name[1..])
        }
        Some(p) => name.first() == Some(p) && match_from(&pattern[1..], &name[1..]),
    }
}

#[must_use]
pub fn path_match(pattern: &str, name: &str) -> bool {
    let pattern: Vec<char> = pattern.chars().collect();
    let name: Vec<char> = name.chars().collect();
    match_from(&pattern, &name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_ref_errors_with_columns() {
        let errors = validate_ref("foo bar");
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].column, 4);
        assert_eq!(validate_ref("release/**"), Vec::<InvalidGlob>::new());
        assert_eq!(validate_path("src/**/*.ts"), Vec::<InvalidGlob>::new());
        assert_eq!(validate_path("./src").len(), 1);
        assert!(path_match("linux-*", "linux-arm"));
        assert!(path_match("gpu-[0-9]", "gpu-3"));
        assert!(!path_match("gpu-[0-9]", "gpu-x"));
    }
}
