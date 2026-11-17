pub fn resolve(value: &str) -> &'static str {
    match value {
        "true" | "True" | "TRUE" | "false" | "False" | "FALSE" => return "!!bool",
        "" | "~" | "null" | "Null" | "NULL" => return "!!null",
        ".nan" | ".NaN" | ".NAN" | ".inf" | ".Inf" | ".INF" | "+.inf" | "+.Inf" | "+.INF"
        | "-.inf" | "-.Inf" | "-.INF" | "-0" | "-0.0" => return "!!float",
        "<<" => return "!!merge",
        _ => {}
    }
    let Some(first) = value.chars().next() else {
        return "!!null";
    };
    match first {
        '.' => {
            if parse_go_float(value).is_some() {
                return "!!float";
            }
        }
        '+' | '-' | '0'..='9' => {
            if is_timestamp(value) {
                return "!!timestamp";
            }
            let plain = value.replace('_', "");
            if parse_go_int(&plain).is_some() {
                return "!!int";
            }
            if is_yaml_float(&plain) && parse_go_float(&plain).is_some() {
                return "!!float";
            }
        }
        _ => {}
    }
    "!!str"
}

fn parse_go_int(text: &str) -> Option<i128> {
    let (negative, body) = match text.as_bytes().first()? {
        b'+' => (false, &text[1..]),
        b'-' => (true, &text[1..]),
        _ => (false, text),
    };
    let lower = body.to_ascii_lowercase();
    let (radix, digits) = if let Some(rest) = lower.strip_prefix("0x") {
        (16, rest.to_owned())
    } else if let Some(rest) = lower.strip_prefix("0o") {
        (8, rest.to_owned())
    } else if let Some(rest) = lower.strip_prefix("0b") {
        (2, rest.to_owned())
    } else if lower.len() > 1 && lower.starts_with('0') {
        (8, lower[1..].to_owned())
    } else {
        (10, lower)
    };
    if digits.is_empty() || digits.starts_with(['+', '-']) {
        return None;
    }
    let magnitude = i128::from_str_radix(&digits, radix).ok()?;
    let value = if negative { -magnitude } else { magnitude };
    let fits_signed = i128::from(i64::MIN) <= value && value <= i128::from(i64::MAX);
    let fits_unsigned = !negative && value <= i128::from(u64::MAX);
    (fits_signed || fits_unsigned).then_some(value)
}

#[must_use]
pub fn parse_go_float(text: &str) -> Option<f64> {
    let body = text.trim_start_matches(['+', '-']);
    let lower = body.to_ascii_lowercase();
    if matches!(lower.as_str(), "inf" | "infinity") {
        return Some(if text.starts_with('-') {
            f64::NEG_INFINITY
        } else {
            f64::INFINITY
        });
    }
    if lower == "nan" {
        return Some(f64::NAN);
    }
    if text.len() - body.len() > 1 || text.contains('_') || lower.starts_with("0x") {
        return None;
    }
    if !body
        .chars()
        .all(|c| c.is_ascii_digit() || matches!(c, '.' | 'e' | 'E' | '+' | '-'))
    {
        return None;
    }
    text.parse::<f64>().ok()
}

fn is_yaml_float(text: &str) -> bool {
    let bytes = text.as_bytes();
    let mut index = 0;
    if matches!(bytes.first(), Some(b'+' | b'-')) {
        index += 1;
    }
    let digits = |from: usize| {
        bytes[from..]
            .iter()
            .take_while(|b| b.is_ascii_digit())
            .count()
    };
    if bytes.get(index) == Some(&b'.') {
        let count = digits(index + 1);
        if count == 0 {
            return false;
        }
        index += 1 + count;
    } else {
        let count = digits(index);
        if count == 0 {
            return false;
        }
        index += count;
        if bytes.get(index) == Some(&b'.') {
            index += 1 + digits(index + 1);
        }
    }
    if matches!(bytes.get(index), Some(b'e' | b'E')) {
        index += 1;
        if matches!(bytes.get(index), Some(b'+' | b'-')) {
            index += 1;
        }
        let count = digits(index);
        if count == 0 {
            return false;
        }
        index += count;
    }
    index == bytes.len()
}

fn is_timestamp(text: &str) -> bool {
    let year = text.bytes().take_while(u8::is_ascii_digit).count();
    if year != 4 || text.as_bytes().get(4) != Some(&b'-') {
        return false;
    }
    let rest = &text[5..];
    let (date, time) = match rest.find(['T', 't', ' ']) {
        Some(index) => (&rest[..index], Some(&rest[index + 1..])),
        None => (rest, None),
    };
    let mut parts = date.split('-');
    let month = parts.next().and_then(|m| short_number(m, 1, 12));
    let day = parts.next().and_then(|d| short_number(d, 1, 31));
    if month.is_none() || day.is_none() || parts.next().is_some() {
        return false;
    }
    let Some(time) = time else {
        return true;
    };
    let time = time.trim_end_matches('Z');
    let clock = time.split(['+', '-']).next().unwrap_or(time);
    let mut fields = clock.split(':');
    let hour = fields.next().and_then(|h| short_number(h, 0, 23));
    let minute = fields.next().and_then(|m| short_number(m, 0, 59));
    let second = fields
        .next()
        .and_then(|s| short_number(s.split('.').next().unwrap_or(s), 0, 59));
    hour.is_some() && minute.is_some() && second.is_some()
}

fn short_number(text: &str, min: u32, max: u32) -> Option<u32> {
    if text.is_empty() || text.len() > 2 || !text.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let value: u32 = text.parse().ok()?;
    (min..=max).contains(&value).then_some(value)
}

#[cfg(test)]
mod tests {
    use super::resolve;

    #[test]
    fn resolves_like_go_yaml() {
        assert_eq!(resolve("on"), "!!str");
        assert_eq!(resolve("yes"), "!!str");
        assert_eq!(resolve("true"), "!!bool");
        assert_eq!(resolve("12"), "!!int");
        assert_eq!(resolve("0x1F"), "!!int");
        assert_eq!(resolve("1.5"), "!!float");
        assert_eq!(resolve(".5"), "!!float");
        assert_eq!(resolve("1e3"), "!!float");
        assert_eq!(resolve("3.10"), "!!float");
        assert_eq!(resolve("1.2.3"), "!!str");
        assert_eq!(resolve("2021-01-02"), "!!timestamp");
        assert_eq!(resolve("-"), "!!str");
        assert_eq!(resolve(""), "!!null");
    }
}
