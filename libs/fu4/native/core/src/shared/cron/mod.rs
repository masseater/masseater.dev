const STAR: u64 = 1 << 63;
const SEARCH_DAYS: i64 = 366 * 5;

struct Bounds {
    min: u32,
    max: u32,
    names: &'static [&'static str],
}

const MINUTES: Bounds = Bounds {
    min: 0,
    max: 59,
    names: &[],
};
const HOURS: Bounds = Bounds {
    min: 0,
    max: 23,
    names: &[],
};
const DOM: Bounds = Bounds {
    min: 1,
    max: 31,
    names: &[],
};
const MONTHS: Bounds = Bounds {
    min: 1,
    max: 12,
    names: &[
        "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
    ],
};
const DOW: Bounds = Bounds {
    min: 0,
    max: 6,
    names: &["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
};

#[derive(Debug, Clone, Copy)]
pub struct Schedule {
    minute: u64,
    hour: u64,
    dom: u64,
    month: u64,
    dow: u64,
}

fn atoi(text: &str) -> Result<i64, String> {
    let digits = text.strip_prefix(['+', '-']).unwrap_or(text);
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return Err(format!(
            "strconv.Atoi: parsing {}: invalid syntax",
            crate::shared::text::quote(text)
        ));
    }
    text.parse::<i64>().map_err(|_| {
        format!(
            "strconv.Atoi: parsing {}: value out of range",
            crate::shared::text::quote(text)
        )
    })
}

fn must_parse_int(expr: &str) -> Result<u32, String> {
    let number = atoi(expr).map_err(|e| format!("failed to parse int from {expr}: {e}"))?;
    if number < 0 {
        return Err(format!("negative number ({number}) not allowed: {expr}"));
    }
    u32::try_from(number).map_err(|_| format!("end of range ({number}) above maximum: {expr}"))
}

fn parse_int_or_name(expr: &str, bounds: &Bounds) -> Result<u32, String> {
    let lower = expr.to_lowercase();
    if let Some(index) = bounds.names.iter().position(|name| *name == lower) {
        let offset = u32::from(bounds.min == 1);
        return Ok(u32::try_from(index).unwrap_or(0) + offset);
    }
    must_parse_int(expr)
}

fn bits(min: u32, max: u32, step: u32) -> u64 {
    let mut out = 0;
    let mut i = min;
    while i <= max && i < 64 {
        out |= 1 << i;
        i += step;
    }
    out
}

fn range(expr: &str, bounds: &Bounds) -> Result<u64, String> {
    let range_and_step: Vec<&str> = expr.split('/').collect();
    let low_and_high: Vec<&str> = range_and_step[0].split('-').collect();
    let single = low_and_high.len() == 1;
    let (start, mut end, mut extra) = if low_and_high[0] == "*" || low_and_high[0] == "?" {
        (bounds.min, bounds.max, STAR)
    } else {
        let start = parse_int_or_name(low_and_high[0], bounds)?;
        let end = match low_and_high.len() {
            1 => start,
            2 => parse_int_or_name(low_and_high[1], bounds)?,
            _ => return Err(format!("too many hyphens: {expr}")),
        };
        (start, end, 0)
    };
    let step = match range_and_step.len() {
        1 => 1,
        2 => {
            let step = must_parse_int(range_and_step[1])?;
            if single {
                end = bounds.max;
            }
            if step > 1 {
                extra = 0;
            }
            step
        }
        _ => return Err(format!("too many slashes: {expr}")),
    };
    if start < bounds.min {
        return Err(format!(
            "beginning of range ({start}) below minimum ({}): {expr}",
            bounds.min
        ));
    }
    if end > bounds.max {
        return Err(format!(
            "end of range ({end}) above maximum ({}): {expr}",
            bounds.max
        ));
    }
    if start > end {
        return Err(format!(
            "beginning of range ({start}) beyond end of range ({end}): {expr}"
        ));
    }
    if step == 0 {
        return Err(format!("step of range should be a positive number: {expr}"));
    }
    Ok(bits(start, end, step) | extra)
}

fn field(text: &str, bounds: &Bounds) -> Result<u64, String> {
    let mut out = 0;
    for expr in text.split(',').filter(|part| !part.is_empty()) {
        out |= range(expr, bounds)?;
    }
    Ok(out)
}

pub fn parse(spec: &str) -> Result<Schedule, String> {
    if spec.is_empty() {
        return Err("empty spec string".to_owned());
    }
    if spec.starts_with('@') {
        return Err(format!("parser does not accept descriptors: {spec}"));
    }
    let fields: Vec<&str> = spec.split_whitespace().collect();
    if fields.len() != 5 {
        return Err(format!(
            "expected exactly 5 fields, found {}: [{}]",
            fields.len(),
            fields.join(" ")
        ));
    }
    Ok(Schedule {
        minute: field(fields[0], &MINUTES)?,
        hour: field(fields[1], &HOURS)?,
        dom: field(fields[2], &DOM)?,
        month: field(fields[3], &MONTHS)?,
        dow: field(fields[4], &DOW)?,
    })
}

fn civil(days: i64) -> (u32, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    (
        u32::try_from(year).unwrap_or(0),
        u32::try_from(month).unwrap_or(1),
        u32::try_from(day).unwrap_or(1),
    )
}

impl Schedule {
    fn day_matches(&self, day: u32, weekday: u32) -> bool {
        let dom = (1u64 << day) & self.dom != 0;
        let dow = (1u64 << weekday) & self.dow != 0;
        if self.dom & STAR != 0 || self.dow & STAR != 0 {
            dom && dow
        } else {
            dom || dow
        }
    }

    #[must_use]
    pub fn interval_seconds(&self) -> Option<u64> {
        let mut fires = Vec::with_capacity(2);
        for days in 0..SEARCH_DAYS {
            let (_, month, day) = civil(days);
            let weekday = u32::try_from((days + 4).rem_euclid(7)).unwrap_or(0);
            if (1u64 << month) & self.month == 0 || !self.day_matches(day, weekday) {
                continue;
            }
            for hour in 0..24u64 {
                if (1u64 << hour) & self.hour == 0 {
                    continue;
                }
                for minute in 0..60u64 {
                    if (1u64 << minute) & self.minute == 0 {
                        continue;
                    }
                    let at = u64::try_from(days).unwrap_or(0) * 86_400 + hour * 3600 + minute * 60;
                    if at == 0 {
                        continue;
                    }
                    fires.push(at);
                    if let [first, second] = fires[..] {
                        return Some(second - first);
                    }
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_intervals_and_errors() {
        assert_eq!(
            parse("*/4 * * * *").ok().and_then(|s| s.interval_seconds()),
            Some(240)
        );
        assert_eq!(
            parse("0 0 * * *").ok().and_then(|s| s.interval_seconds()),
            Some(86_400)
        );
        assert_eq!(
            parse("0 */3 * *").err().as_deref(),
            Some("expected exactly 5 fields, found 4: [0 */3 * *]")
        );
        assert_eq!(
            parse("61 * * * *").err().as_deref(),
            Some("end of range (61) above maximum (59): 61")
        );
    }
}
