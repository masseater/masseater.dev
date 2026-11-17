use super::ast::{CompareOp, Expr, ExprError, LogicalOp, Token, TokenKind};
use super::lexer::Lexer;
use crate::shared::text::{quote, quotes};

struct Parser<'l, 'a> {
    lexer: &'l mut Lexer<'a>,
    cur: Token,
    error: Option<ExprError>,
}

fn go_parse_int(text: &str) -> Result<i64, String> {
    let (negative, body) = match text.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, text),
    };
    let (radix, digits) = if let Some(rest) = body.strip_prefix("0x") {
        (16, rest)
    } else if body.len() > 1 && body.starts_with('0') {
        (8, &body[1..])
    } else {
        (10, body)
    };
    let syntax = || format!("strconv.ParseInt: parsing {}: invalid syntax", quote(text));
    if digits.is_empty() {
        return Err(syntax());
    }
    let magnitude = i128::from_str_radix(digits, radix).map_err(|_| syntax())?;
    let value = if negative { -magnitude } else { magnitude };
    if value < i128::from(i32::MIN) || value > i128::from(i32::MAX) {
        return Err(format!(
            "strconv.ParseInt: parsing {}: value out of range",
            quote(text)
        ));
    }
    Ok(value as i64)
}

impl Parser<'_, '_> {
    fn fail(&mut self, message: String) {
        if self.error.is_none() {
            self.error = Some(ExprError::at(&self.cur, message));
        }
    }

    fn unexpected(&mut self, place: &str, expected: &[TokenKind]) {
        if self.error.is_some() {
            return;
        }
        let names: Vec<&str> = expected.iter().map(|k| k.describe()).collect();
        let what = if self.cur.kind == TokenKind::End {
            "end of input".to_owned()
        } else {
            format!("token {}", quote(self.cur.kind.describe()))
        };
        self.fail(format!(
            "unexpected {what} while parsing {place}. expecting {}",
            quotes(&names)
        ));
    }

    fn next(&mut self) -> Token {
        let next = self.lexer.next_token();
        std::mem::replace(&mut self.cur, next)
    }

    fn peek(&self) -> TokenKind {
        self.cur.kind
    }

    fn parse_ident(&mut self) -> Option<Expr> {
        let ident = self.next();
        if self.peek() == TokenKind::LeftParen {
            self.next();
            let mut args = Vec::new();
            if self.peek() == TokenKind::RightParen {
                self.next();
            } else {
                loop {
                    args.push(self.parse_or()?);
                    match self.peek() {
                        TokenKind::Comma => {
                            self.next();
                        }
                        TokenKind::RightParen => {
                            self.next();
                            break;
                        }
                        _ => {
                            self.unexpected(
                                "arguments of function call",
                                &[TokenKind::Comma, TokenKind::RightParen],
                            );
                            return None;
                        }
                    }
                }
            }
            return Some(Expr::Call {
                callee: ident.value.clone(),
                args,
                token: ident,
            });
        }
        Some(match ident.value.as_str() {
            "null" => Expr::Null { token: ident },
            "true" => Expr::Bool {
                value: true,
                token: ident,
            },
            "false" => Expr::Bool {
                value: false,
                token: ident,
            },
            _ => Expr::Variable {
                name: ident.value.to_lowercase(),
                token: ident,
            },
        })
    }

    fn parse_nested(&mut self) -> Option<Expr> {
        self.next();
        let nested = self.parse_or()?;
        if self.peek() == TokenKind::RightParen {
            self.next();
            Some(nested)
        } else {
            self.unexpected(
                "closing ')' of nested expression (...)",
                &[TokenKind::RightParen],
            );
            None
        }
    }

    fn parse_int(&mut self) -> Option<Expr> {
        match go_parse_int(&self.cur.value) {
            Ok(value) => {
                let token = self.next();
                Some(Expr::Int { value, token })
            }
            Err(error) => {
                let text = quote(&self.cur.value);
                self.fail(format!("parsing invalid integer literal {text}: {error}"));
                None
            }
        }
    }

    fn parse_float(&mut self) -> Option<Expr> {
        match self.cur.value.parse::<f64>() {
            Ok(value) if value.is_finite() => {
                let token = self.next();
                Some(Expr::Float { value, token })
            }
            _ => {
                let text = quote(&self.cur.value);
                self.fail(format!(
                    "parsing invalid float literal {text}: strconv.ParseFloat: parsing {text}: value out of range"
                ));
                None
            }
        }
    }

    fn parse_string(&mut self) -> Expr {
        let token = self.next();
        let inner = &token.value[1..token.value.len() - 1];
        Expr::Str {
            value: inner.replace("''", "'"),
            token,
        }
    }

    fn parse_primary(&mut self) -> Option<Expr> {
        match self.peek() {
            TokenKind::Ident => self.parse_ident(),
            TokenKind::LeftParen => self.parse_nested(),
            TokenKind::Int => self.parse_int(),
            TokenKind::Float => self.parse_float(),
            TokenKind::String => Some(self.parse_string()),
            _ => {
                self.unexpected(
                    "variable access, function call, null, bool, int, float or string",
                    &[
                        TokenKind::Ident,
                        TokenKind::LeftParen,
                        TokenKind::Int,
                        TokenKind::Float,
                        TokenKind::String,
                    ],
                );
                None
            }
        }
    }

    fn parse_postfix(&mut self) -> Option<Expr> {
        let mut ret = self.parse_primary()?;
        loop {
            match self.peek() {
                TokenKind::Dot => {
                    self.next();
                    match self.peek() {
                        TokenKind::Star => {
                            self.next();
                            ret = Expr::ArrayDeref {
                                receiver: Box::new(ret),
                            };
                        }
                        TokenKind::Ident => {
                            let token = self.next();
                            ret = Expr::ObjectDeref {
                                receiver: Box::new(ret),
                                property: token.value.to_lowercase(),
                            };
                        }
                        _ => {
                            self.unexpected(
                                "object property dereference like 'a.b' or array element dereference like 'a.*'",
                                &[TokenKind::Ident, TokenKind::Star],
                            );
                            return None;
                        }
                    }
                }
                TokenKind::LeftBracket => {
                    self.next();
                    let index = self.parse_or()?;
                    ret = Expr::Index {
                        operand: Box::new(ret),
                        index: Box::new(index),
                    };
                    if self.peek() != TokenKind::RightBracket {
                        self.unexpected(
                            "closing bracket ']' for index access",
                            &[TokenKind::RightBracket],
                        );
                        return None;
                    }
                    self.next();
                }
                _ => return Some(ret),
            }
        }
    }

    fn parse_prefix(&mut self) -> Option<Expr> {
        if self.peek() != TokenKind::Not {
            return self.parse_postfix();
        }
        let token = self.next();
        let operand = self.parse_prefix()?;
        Some(Expr::Not {
            operand: Box::new(operand),
            token,
        })
    }

    fn parse_compare(&mut self) -> Option<Expr> {
        let left = self.parse_prefix()?;
        let op = match self.peek() {
            TokenKind::Less => CompareOp::Less,
            TokenKind::LessEq => CompareOp::LessEq,
            TokenKind::Greater => CompareOp::Greater,
            TokenKind::GreaterEq => CompareOp::GreaterEq,
            TokenKind::Eq => CompareOp::Eq,
            TokenKind::NotEq => CompareOp::NotEq,
            _ => return Some(left),
        };
        self.next();
        let right = self.parse_compare()?;
        Some(Expr::Compare {
            op,
            left: Box::new(left),
            right: Box::new(right),
        })
    }

    fn parse_and(&mut self) -> Option<Expr> {
        let left = self.parse_compare()?;
        if self.peek() != TokenKind::And {
            return Some(left);
        }
        self.next();
        let right = self.parse_and()?;
        Some(Expr::Logical {
            op: LogicalOp::And,
            left: Box::new(left),
            right: Box::new(right),
        })
    }

    fn parse_or(&mut self) -> Option<Expr> {
        let left = self.parse_and()?;
        if self.peek() != TokenKind::Or {
            return Some(left);
        }
        self.next();
        let right = self.parse_or()?;
        Some(Expr::Logical {
            op: LogicalOp::Or,
            left: Box::new(left),
            right: Box::new(right),
        })
    }
}

pub fn parse(lexer: &mut Lexer<'_>) -> Result<Expr, ExprError> {
    let cur = lexer.next_token();
    let mut parser = Parser {
        lexer,
        cur,
        error: None,
    };
    let root = parser.parse_or();
    if let Some(error) = parser.lexer.error() {
        return Err(error.clone());
    }
    if let Some(error) = parser.error.take() {
        return Err(error);
    }
    let Some(root) = root else {
        return Err(ExprError::at(&parser.cur, "unknown parse error".to_owned()));
    };
    if parser.peek() != TokenKind::End {
        let mut names = vec![parser.cur.kind.describe()];
        loop {
            let token = parser.lexer.next_token();
            if token.kind == TokenKind::End {
                break;
            }
            names.push(token.kind.describe());
        }
        let count = names.len();
        parser.fail(format!(
            "parser did not reach end of input after parsing the expression. {count} remaining token(s) in the input: {}",
            quotes(&names)
        ));
        return Err(parser
            .error
            .take()
            .unwrap_or_else(|| ExprError::at(&parser.cur, String::new())));
    }
    Ok(root)
}
