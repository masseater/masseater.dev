use crate::shared::text::quote;

pub struct JsonError {
    pub offset: usize,
    pub message: String,
}

fn quote_byte(byte: u8) -> String {
    match byte {
        b'\'' => "'\\''".to_owned(),
        b'"' => "'\"'".to_owned(),
        _ => {
            let quoted = quote(&char::from(byte).to_string());
            format!("'{}'", &quoted[1..quoted.len() - 1])
        }
    }
}

struct Checker<'a> {
    bytes: &'a [u8],
    at: usize,
}

type Step = Result<(), JsonError>;

impl Checker<'_> {
    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.at).copied()
    }

    fn eof(&self) -> JsonError {
        JsonError {
            offset: self.bytes.len(),
            message: "unexpected end of JSON input".to_owned(),
        }
    }

    fn invalid(&self, context: &str) -> JsonError {
        match self.peek() {
            None => self.eof(),
            Some(byte) => JsonError {
                offset: self.at + 1,
                message: format!("invalid character {} {context}", quote_byte(byte)),
            },
        }
    }

    fn space(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\t' | b'\r' | b'\n')) {
            self.at += 1;
        }
    }

    fn value(&mut self) -> Step {
        self.space();
        match self.peek() {
            Some(b'{') => self.object(),
            Some(b'[') => self.array(),
            Some(b'"') => self.string(),
            Some(b'-' | b'0'..=b'9') => self.number(),
            Some(b't') => self.literal("true"),
            Some(b'f') => self.literal("false"),
            Some(b'n') => self.literal("null"),
            _ => Err(self.invalid("looking for beginning of value")),
        }
    }

    fn literal(&mut self, word: &str) -> Step {
        self.at += 1;
        for expected in word.bytes().skip(1) {
            if self.peek() != Some(expected) {
                return Err(self.invalid(&format!(
                    "in literal {word} (expecting {})",
                    quote_byte(expected)
                )));
            }
            self.at += 1;
        }
        Ok(())
    }

    fn digits(&mut self) {
        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.at += 1;
        }
    }

    fn number(&mut self) -> Step {
        if self.peek() == Some(b'-') {
            self.at += 1;
        }
        match self.peek() {
            Some(b'0') => self.at += 1,
            Some(b'1'..=b'9') => self.digits(),
            _ => return Err(self.invalid("in numeric literal")),
        }
        if self.peek() == Some(b'.') {
            self.at += 1;
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(self.invalid("after decimal point in numeric literal"));
            }
            self.digits();
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.at += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.at += 1;
            }
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(self.invalid("in exponent of numeric literal"));
            }
            self.digits();
        }
        Ok(())
    }

    fn string(&mut self) -> Step {
        self.at += 1;
        loop {
            match self.peek() {
                None => return Err(self.eof()),
                Some(b'"') => {
                    self.at += 1;
                    return Ok(());
                }
                Some(b'\\') => {
                    self.at += 1;
                    match self.peek() {
                        Some(b'b' | b'f' | b'n' | b'r' | b't' | b'\\' | b'/' | b'"') => {
                            self.at += 1
                        }
                        Some(b'u') => {
                            self.at += 1;
                            for _ in 0..4 {
                                if !self.peek().is_some_and(|b| b.is_ascii_hexdigit()) {
                                    return Err(self.invalid("in \\u hexadecimal character escape"));
                                }
                                self.at += 1;
                            }
                        }
                        _ => return Err(self.invalid("in string escape code")),
                    }
                }
                Some(byte) if byte < 0x20 => return Err(self.invalid("in string literal")),
                Some(_) => self.at += 1,
            }
        }
    }

    fn object(&mut self) -> Step {
        self.at += 1;
        self.space();
        if self.peek() == Some(b'}') {
            self.at += 1;
            return Ok(());
        }
        loop {
            if self.peek() != Some(b'"') {
                return Err(self.invalid("looking for beginning of object key string"));
            }
            self.string()?;
            self.space();
            if self.peek() != Some(b':') {
                return Err(self.invalid("after object key"));
            }
            self.at += 1;
            self.value()?;
            self.space();
            match self.peek() {
                Some(b',') => {
                    self.at += 1;
                    self.space();
                }
                Some(b'}') => {
                    self.at += 1;
                    return Ok(());
                }
                _ => return Err(self.invalid("after object key:value pair")),
            }
        }
    }

    fn array(&mut self) -> Step {
        self.at += 1;
        self.space();
        if self.peek() == Some(b']') {
            self.at += 1;
            return Ok(());
        }
        loop {
            self.value()?;
            self.space();
            match self.peek() {
                Some(b',') => self.at += 1,
                Some(b']') => {
                    self.at += 1;
                    return Ok(());
                }
                _ => return Err(self.invalid("after array element")),
            }
        }
    }
}

pub fn check(text: &str) -> Result<(), JsonError> {
    let mut checker = Checker {
        bytes: text.as_bytes(),
        at: 0,
    };
    checker.value()?;
    checker.space();
    if checker.peek().is_some() {
        return Err(checker.invalid("after top-level value"));
    }
    Ok(())
}
