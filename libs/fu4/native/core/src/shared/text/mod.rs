use std::fmt::Write;

#[must_use]
pub fn quote(text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 2);
    out.push('"');
    push_escaped(&mut out, text, '"');
    out.push('"');
    out
}

#[must_use]
pub fn quote_char(value: char) -> String {
    let mut out = String::from("'");
    let mut buffer = [0u8; 4];
    push_escaped(&mut out, value.encode_utf8(&mut buffer), '\'');
    out.push('\'');
    out
}

fn push_escaped(out: &mut String, text: &str, delimiter: char) {
    for character in text.chars() {
        match character {
            '\x07' => out.push_str("\\a"),
            '\x08' => out.push_str("\\b"),
            '\x0c' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\x0b' => out.push_str("\\v"),
            '\\' => out.push_str("\\\\"),
            c if c == delimiter => {
                out.push('\\');
                out.push(c);
            }
            c if is_printable(c) => out.push(c),
            c if (c as u32) < 0x80 => {
                let _ = write!(out, "\\x{:02x}", c as u32);
            }
            c if (c as u32) < 0x1_0000 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => {
                let _ = write!(out, "\\U{:08x}", c as u32);
            }
        }
    }
}

fn is_printable(character: char) -> bool {
    if character == ' ' {
        return true;
    }
    if character.is_control() || character.is_whitespace() {
        return false;
    }
    !matches!(character as u32, 0xfeff | 0xfff9..=0xfffb | 0xe000..=0xf8ff | 0x2028 | 0x2029)
}

#[must_use]
pub fn quotes<S: AsRef<str>>(items: &[S]) -> String {
    let mut out = String::new();
    for (index, item) in items.iter().enumerate() {
        if index > 0 {
            out.push_str(", ");
        }
        out.push_str(&quote(item.as_ref()));
    }
    out
}

#[must_use]
pub fn sorted_quotes<S: AsRef<str>>(items: &[S]) -> String {
    let mut sorted: Vec<&str> = items.iter().map(AsRef::as_ref).collect();
    sorted.sort_unstable();
    quotes(&sorted)
}

#[must_use]
pub fn ordinal(value: usize) -> String {
    let suffix = match (value % 10, value % 100) {
        (1, hundred) if hundred != 11 => "st",
        (2, hundred) if hundred != 12 => "nd",
        (3, hundred) if hundred != 13 => "rd",
        _ => "th",
    };
    format!("{value}{suffix}")
}

#[must_use]
pub fn go_float(value: f64) -> String {
    if value.is_finite() && value.fract() == 0.0 && value.abs() < 1e21 {
        return format!("{value:.0}");
    }
    let text = format!("{value}");
    if value.abs() >= 1e21 || (value != 0.0 && value.abs() < 1e-4) {
        return format!("{value:e}").replace('e', "e+").replace("e+-", "e-");
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_like_go() {
        assert_eq!(quote("a\"b\\c\n"), "\"a\\\"b\\\\c\\n\"");
        assert_eq!(quote("日本"), "\"日本\"");
        assert_eq!(quote_char('\''), "'\\''");
        assert_eq!(ordinal(11), "11th");
        assert_eq!(ordinal(22), "22nd");
        assert_eq!(go_float(-1.0), "-1");
        assert_eq!(go_float(0.5), "0.5");
    }
}
