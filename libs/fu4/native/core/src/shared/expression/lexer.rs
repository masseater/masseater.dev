use super::ast::{ExprError, Token, TokenKind};
use crate::shared::text::quote_char;

const PUNCT: &str =
    "''', '}', '(', ')', '[', ']', '.', '!', '<', '>', '=', '&', '|', '*', ',', ' '";
const DIGITS: &str = "'0'..'9'";
const ALPHA: &str = "'a'..'z', 'A'..'Z', '_'";

#[derive(Debug, Clone, Copy)]
struct Position {
    offset: usize,
    line: usize,
    column: usize,
}

pub struct Lexer<'a> {
    src: &'a str,
    pos: Position,
    start: Position,
    error: Option<ExprError>,
}

fn is_alpha(c: Option<char>) -> bool {
    c.is_some_and(|c| c.is_ascii_alphabetic())
}

fn is_num(c: Option<char>) -> bool {
    c.is_some_and(|c| c.is_ascii_digit())
}

fn is_hex(c: Option<char>) -> bool {
    c.is_some_and(|c| c.is_ascii_hexdigit())
}

fn is_alnum(c: Option<char>) -> bool {
    is_alpha(c) || is_num(c)
}

impl<'a> Lexer<'a> {
    #[must_use]
    pub fn new(src: &'a str) -> Self {
        let origin = Position {
            offset: 0,
            line: 1,
            column: 1,
        };
        Self {
            src,
            pos: origin,
            start: origin,
            error: None,
        }
    }

    fn peek(&self) -> Option<char> {
        self.src[self.pos.offset..].chars().next()
    }

    fn advance(&mut self) {
        if let Some(c) = self.peek() {
            self.pos.offset += c.len_utf8();
            if c == '\n' {
                self.pos.line += 1;
                self.pos.column = 1;
            } else {
                self.pos.column += 1;
            }
        }
    }

    fn eat(&mut self) -> Option<char> {
        self.advance();
        self.peek()
    }

    fn fail(&mut self, message: String) {
        if self.error.is_none() {
            self.error = Some(ExprError {
                message,
                offset: self.pos.offset,
                line: self.pos.line,
                column: self.pos.column,
            });
        }
    }

    fn token(&mut self, kind: TokenKind) -> Token {
        let token = Token {
            kind,
            value: self.src[self.start.offset..self.pos.offset].to_owned(),
            offset: self.start.offset,
            line: self.start.line,
            column: self.start.column,
        };
        self.start = self.pos;
        token
    }

    fn eof(&self) -> Token {
        Token {
            kind: TokenKind::End,
            value: String::new(),
            offset: self.start.offset,
            line: self.start.line,
            column: self.start.column,
        }
    }

    fn skip_white(&mut self) {
        while matches!(self.peek(), Some(' ' | '\n' | '\r' | '\t')) {
            self.advance();
            self.start = self.pos;
        }
    }

    fn unexpected(&mut self, c: Option<char>, place: &str, expected: &str) -> Token {
        let what = match c {
            None => "EOF".to_owned(),
            Some(c) => format!("character {}", quote_char(c)),
        };
        let note = if c == Some('"') {
            ". do you mean string literals? only single quotes are available for string delimiter"
        } else {
            ""
        };
        self.fail(format!(
            "got unexpected {what} while lexing {place}, expecting {expected}{note}"
        ));
        self.eof()
    }

    fn lex_ident(&mut self) -> Token {
        loop {
            let c = self.eat();
            if !is_alnum(c) && c != Some('_') && c != Some('-') {
                return self.token(TokenKind::Ident);
            }
        }
    }

    fn lex_num(&mut self) -> Token {
        let mut c = self.peek();
        if c == Some('-') {
            c = self.eat();
        }
        if c == Some('0') {
            c = self.eat();
            if c == Some('x') {
                self.advance();
                return self.lex_hex();
            }
        } else {
            if !is_num(c) {
                return self.unexpected(c, "integer part of number", DIGITS);
            }
            loop {
                c = self.eat();
                if !is_num(c) {
                    break;
                }
            }
        }
        let mut kind = TokenKind::Int;
        if c == Some('.') {
            c = self.eat();
            if !is_num(c) {
                return self.unexpected(c, "fraction part of float number", DIGITS);
            }
            loop {
                c = self.eat();
                if !is_num(c) {
                    break;
                }
            }
            kind = TokenKind::Float;
        }
        if matches!(c, Some('e' | 'E')) {
            c = self.eat();
            if c == Some('-') {
                c = self.eat();
            }
            if c == Some('0') {
                c = self.eat();
            } else {
                if !is_num(c) {
                    return self.unexpected(c, "exponent part of float number", DIGITS);
                }
                loop {
                    c = self.eat();
                    if !is_num(c) {
                        break;
                    }
                }
            }
            kind = TokenKind::Float;
        }
        if is_alnum(c) {
            let text = self.src[self.start.offset..self.pos.offset].to_owned();
            return self.unexpected(c, &format!("character following number {text}"), PUNCT);
        }
        self.token(kind)
    }

    fn lex_hex(&mut self) -> Token {
        let mut c = self.peek();
        if c == Some('0') {
            c = self.eat();
        } else {
            if !is_hex(c) {
                return self.unexpected(c, "hex integer", &format!("{DIGITS}, 'a'..'f', 'A'..'F'"));
            }
            loop {
                c = self.eat();
                if !is_hex(c) {
                    break;
                }
            }
        }
        if is_alnum(c) {
            let text = self.src[self.start.offset..self.pos.offset].to_owned();
            return self.unexpected(c, &format!("character following hex integer {text}"), PUNCT);
        }
        self.token(TokenKind::Int)
    }

    fn lex_string(&mut self) -> Token {
        loop {
            match self.eat() {
                Some('\'') if self.eat() != Some('\'') => {
                    return self.token(TokenKind::String);
                }
                None => return self.unexpected(None, "end of string literal", "'''"),
                _ => {}
            }
        }
    }

    fn lex_pair(
        &mut self,
        second: char,
        double: TokenKind,
        single: Option<TokenKind>,
        place: &str,
    ) -> Token {
        let c = self.eat();
        if c == Some(second) {
            self.advance();
            return self.token(double);
        }
        match single {
            Some(kind) => self.token(kind),
            None => self.unexpected(c, place, &quote_char(second)),
        }
    }

    fn lex_char(&mut self, kind: TokenKind) -> Token {
        self.advance();
        self.token(kind)
    }

    pub fn next_token(&mut self) -> Token {
        self.skip_white();
        let c = self.peek();
        let Some(ch) = c else {
            self.fail("unexpected EOF while lexing expression".to_owned());
            return self.eof();
        };
        if ch.is_ascii_alphabetic() || ch == '_' {
            return self.lex_ident();
        }
        if ch.is_ascii_digit() || ch == '-' {
            return self.lex_num();
        }
        match ch {
            '\'' => self.lex_string(),
            '}' => self.lex_pair('}', TokenKind::End, None, "end marker }}"),
            '!' => self.lex_pair('=', TokenKind::NotEq, Some(TokenKind::Not), ""),
            '<' => self.lex_pair('=', TokenKind::LessEq, Some(TokenKind::Less), ""),
            '>' => self.lex_pair('=', TokenKind::GreaterEq, Some(TokenKind::Greater), ""),
            '=' => self.lex_pair('=', TokenKind::Eq, None, "== operator"),
            '&' => self.lex_pair('&', TokenKind::And, None, "&& operator"),
            '|' => self.lex_pair('|', TokenKind::Or, None, "|| operator"),
            '(' => self.lex_char(TokenKind::LeftParen),
            ')' => self.lex_char(TokenKind::RightParen),
            '[' => self.lex_char(TokenKind::LeftBracket),
            ']' => self.lex_char(TokenKind::RightBracket),
            '.' => self.lex_char(TokenKind::Dot),
            '*' => self.lex_char(TokenKind::Star),
            ',' => self.lex_char(TokenKind::Comma),
            _ => self.unexpected(c, "expression", &format!("{ALPHA}, {DIGITS}, {PUNCT}")),
        }
    }

    #[must_use]
    pub fn offset(&self) -> usize {
        self.pos.offset
    }

    #[must_use]
    pub fn error(&self) -> Option<&ExprError> {
        self.error.as_ref()
    }
}
