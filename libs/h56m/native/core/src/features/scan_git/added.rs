use std::collections::HashMap;

const MAX_DIFF_LINES: usize = 1_000_000;
const MAX_EDITS: usize = 4_096;
const NEIGHBORS: usize = 100;
const MAX_COMMON_LIMIT: usize = 1_024;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Class {
    Absent,
    Matched,
    Common,
}

fn common_line_prefix(old: &[u8], new: &[u8]) -> usize {
    let shared = old.iter().zip(new).take_while(|(a, b)| a == b).count();
    old[..shared]
        .iter()
        .rposition(|&byte| byte == b'\n')
        .map_or(0, |index| index + 1)
}

fn common_line_suffix(old: &[u8], new: &[u8]) -> usize {
    let shared = old
        .iter()
        .rev()
        .zip(new.iter().rev())
        .take_while(|(a, b)| a == b)
        .count();
    let starts_line = |text: &[u8]| shared == text.len() || text[text.len() - 1 - shared] == b'\n';
    if starts_line(old) && starts_line(new) {
        return shared;
    }
    old[old.len() - shared..]
        .iter()
        .position(|&byte| byte == b'\n')
        .map_or(0, |index| shared - index - 1)
}

fn newlines(text: &[u8]) -> usize {
    text.split(|&byte| byte == b'\n').count() - 1
}

fn lines(text: &[u8]) -> Vec<&[u8]> {
    text.split_inclusive(|&byte| byte == b'\n').collect()
}

fn is_blank(line: &[u8]) -> bool {
    line.iter().all(u8::is_ascii_whitespace)
}

fn classify(lines: &[&[u8]], ids: &[usize], other: &[usize]) -> Vec<Class> {
    let mut limit = 1;
    let mut count = lines.len();
    while count > 0 {
        limit <<= 1;
        count >>= 2;
    }
    let limit = limit.min(MAX_COMMON_LIMIT);
    lines
        .iter()
        .zip(ids)
        .map(|(line, &id)| match other[id] {
            0 => Class::Absent,
            n if n >= limit || is_blank(line) => Class::Common,
            _ => Class::Matched,
        })
        .collect()
}

fn searchable(classes: &[Class], index: usize) -> bool {
    if classes[index] != Class::Common {
        return classes[index] == Class::Matched;
    }
    let count = |range: &mut dyn Iterator<Item = usize>| {
        let (mut absent, mut common) = (0, 1);
        for at in range {
            match classes[at] {
                Class::Matched => break,
                Class::Absent => absent += 1,
                Class::Common => common += 1,
            }
        }
        (absent, common)
    };
    let (before, common_before) = count(&mut (index.saturating_sub(NEIGHBORS)..index).rev());
    if before == 0 {
        return true;
    }
    let end = (index + NEIGHBORS).min(classes.len() - 1);
    let (after, common_after) = count(&mut (index + 1..=end));
    if after == 0 {
        return true;
    }
    let common = common_before + common_after;
    common * 4 >= common + before + after
}

fn myers_matches(old: &[usize], new: &[usize]) -> Option<Vec<usize>> {
    let (n, m) = (old.len(), new.len());
    let offset = n + m + 1;
    let mut frontier = vec![0usize; 2 * offset + 1];
    let mut trace: Vec<Vec<usize>> = Vec::new();
    for edits in 0..=(n + m).min(MAX_EDITS) {
        trace.push(frontier[offset - edits..=offset + edits].to_vec());
        for diagonal in (0..=edits).map(|step| offset + 2 * step - edits) {
            let down = diagonal == offset - edits
                || (diagonal != offset + edits && frontier[diagonal - 1] < frontier[diagonal + 1]);
            let mut x = if down {
                frontier[diagonal + 1]
            } else {
                frontier[diagonal - 1] + 1
            };
            let mut y = x + offset - diagonal;
            while x < n && y < m && old[x] == new[y] {
                x += 1;
                y += 1;
            }
            frontier[diagonal] = x;
            if x >= n && y >= m {
                return Some(backtrack(&trace, (n, m), offset, old, new));
            }
        }
    }
    None
}

fn backtrack(
    trace: &[Vec<usize>],
    (mut x, mut y): (usize, usize),
    offset: usize,
    old: &[usize],
    new: &[usize],
) -> Vec<usize> {
    let mut matched = Vec::new();
    for (edits, frontier) in trace.iter().enumerate().rev() {
        if edits == 0 {
            while x > 0 && y > 0 {
                x -= 1;
                y -= 1;
                matched.push(y);
            }
            break;
        }
        let at = |diagonal: usize| frontier[diagonal + edits - offset];
        let diagonal = x + offset - y;
        let down = diagonal == offset - edits
            || (diagonal != offset + edits && at(diagonal - 1) < at(diagonal + 1));
        let previous = if down { diagonal + 1 } else { diagonal - 1 };
        let start_x = at(previous);
        let start_y = start_x + offset - previous;
        while x > start_x && y > start_y && old[x - 1] == new[y - 1] {
            x -= 1;
            y -= 1;
            matched.push(y);
        }
        x = start_x;
        y = start_y;
    }
    matched
}

/// Calls `emit` with each block of lines that `new` adds to `old`, and the
/// 1-based line of the block in `new`, as Betterleaks does for one change in
/// git history: lines shared at both ends are trimmed, lines that cannot match
/// stay out of the edit search, and a change too large to diff is emitted whole.
pub fn additions(old: &[u8], new: &[u8], mut emit: impl FnMut(&[u8], usize)) {
    let prefix = common_line_prefix(old, new);
    let base = newlines(&new[..prefix]);
    let (old, new) = (&old[prefix..], &new[prefix..]);
    let suffix = common_line_suffix(old, new);
    let (old, new) = (&old[..old.len() - suffix], &new[..new.len() - suffix]);
    let mut add = |raw: &[u8], line: usize| emit(raw, base + line);
    if new.is_empty() {
        return;
    }
    if old.is_empty() || newlines(old) + newlines(new) + 2 > MAX_DIFF_LINES {
        add(new, 1);
        return;
    }
    let (old_lines, new_lines) = (lines(old), lines(new));
    let mut ids: HashMap<&[u8], usize> = HashMap::new();
    let old_ids: Vec<usize> = old_lines
        .iter()
        .map(|line| {
            let next = ids.len() + 1;
            *ids.entry(line).or_insert(next)
        })
        .collect();
    let new_ids: Vec<usize> = new_lines
        .iter()
        .map(|line| ids.get(line).copied().unwrap_or(0))
        .collect();
    let mut in_old = vec![0; ids.len() + 1];
    let mut in_new = vec![0; ids.len() + 1];
    for &id in &old_ids {
        in_old[id] += 1;
    }
    for &id in &new_ids {
        in_new[id] += 1;
    }
    let old_classes = classify(&old_lines, &old_ids, &in_new);
    let new_classes = classify(&new_lines, &new_ids, &in_old);
    let kept: Vec<usize> = (0..old_ids.len())
        .filter(|&index| searchable(&old_classes, index))
        .map(|index| old_ids[index])
        .collect();
    let positions: Vec<usize> = (0..new_ids.len())
        .filter(|&index| searchable(&new_classes, index))
        .collect();
    if positions.is_empty() {
        add(new, 1);
        return;
    }
    let current: Vec<usize> = positions.iter().map(|&index| new_ids[index]).collect();
    let Some(matched) = myers_matches(&kept, &current) else {
        add(new, 1);
        return;
    };
    let mut added = vec![true; new_lines.len()];
    for index in matched {
        added[positions[index]] = false;
    }
    let mut offset = 0;
    let mut block: Option<(usize, usize)> = None;
    for (index, line) in new_lines.iter().enumerate() {
        match (added[index], block) {
            (true, None) => block = Some((offset, index + 1)),
            (false, Some((begin, first))) => {
                add(&new[begin..offset], first);
                block = None;
            }
            _ => {}
        }
        offset += line.len();
    }
    if let Some((begin, first)) = block {
        add(&new[begin..], first);
    }
}

#[cfg(test)]
mod tests {
    use std::fmt::Write;

    use super::additions;

    fn split(text: &str) -> Vec<&str> {
        text.split_inclusive('\n').collect()
    }

    fn collected(old: &str, new: &str) -> Vec<(String, usize)> {
        let mut found = Vec::new();
        additions(old.as_bytes(), new.as_bytes(), |raw, line| {
            found.push((String::from_utf8(raw.to_vec()).unwrap(), line));
        });
        found
    }

    fn check_line_additions(old: &str, new: &str) {
        let current = split(new);
        let mut added = vec![false; current.len()];
        let mut previous_end = 0;
        for (text, line) in collected(old, new) {
            let start = line - 1;
            let count = split(&text).len();
            assert!(start >= previous_end);
            assert!(start + count <= current.len());
            assert_eq!(current[start..start + count].concat(), text);
            added[start..start + count].fill(true);
            previous_end = start + count;
        }
        let parent = split(old);
        let mut at = 0;
        for (index, text) in current.iter().enumerate() {
            if added[index] {
                continue;
            }
            while at < parent.len() && parent[at] != *text {
                at += 1;
            }
            assert!(
                at < parent.len(),
                "retained line not found in ordered parent"
            );
            at += 1;
        }
    }

    fn numbered(prefix: &str, count: usize) -> String {
        (0..count).fold(String::new(), |mut text, index| {
            let _ = writeln!(text, "{prefix}-{index}");
            text
        })
    }

    struct Pcg(u64);

    impl Pcg {
        fn below(&mut self, bound: usize) -> usize {
            self.0 = self
                .0
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            usize::try_from(self.0 >> 33).unwrap() % bound
        }
    }

    #[test]
    fn line_additions() {
        let mut rng = Pcg(0x0000_000d_0000_001b);
        let words = [
            "one\n",
            "two\n",
            "two\n",
            "\n",
            "unicode-世界\n",
            "crlf\r\n",
        ];
        for _ in 0..500 {
            let mut old = String::new();
            let mut new = String::new();
            for _ in 0..rng.below(60) {
                old.push_str(words[rng.below(words.len())]);
            }
            for _ in 0..rng.below(60) {
                new.push_str(words[rng.below(words.len())]);
            }
            check_line_additions(&old, &new);
            check_line_additions(
                old.strip_suffix('\n').unwrap_or(&old),
                new.strip_suffix('\n').unwrap_or(&new),
            );
        }
        let old: String = numbered("old", 70_000);
        let new: String = numbered("new", 70_000);
        check_line_additions(&old, &new);
        assert_eq!(
            collected(&old, &format!("{old}secret\n")),
            [("secret\n".to_owned(), 70_001)]
        );
        assert_eq!(collected(&"x\n".repeat(1_000_000), ""), []);
        assert_eq!(
            collected(&"x\n".repeat(1_000_000), "y\nx\nz\n"),
            [("y\nx\nz\n".to_owned(), 1)]
        );
        let big: String = numbered("line", 1_000_000);
        let edited = big.replacen("line-500000\n", "secret\n", 1);
        assert_eq!(collected(&big, &edited), [("secret\n".to_owned(), 500_001)]);
    }

    #[test]
    fn line_additions_keep_new_blocks_whole() {
        let block = |i: usize| format!("  def test_{i}\n    check {i}\n  end\n\n");
        let key = concat!(
            "  def test_encrypted\n    pem = <<~EOF\n    -----BEGIN EC PRIV",
            "ATE KEY-----\n",
            "    Proc-Type: 4,ENCRYPTED\n    DEK-Info: AES-128-CBC,85743EB6FAC9EA76\n\n",
            "    MHcCAQEEIIq3fN0QJkVfSZpXXbpl8rUn\n    -----END EC PRIVATE KEY-----\n    EOF\n",
        );
        let mut old = String::new();
        let mut new = String::new();
        for i in 0..40 {
            old.push_str(&block(i));
            if i == 20 {
                new.push_str(key);
                new.push_str("  end\n\n");
            } else if !(20..=23).contains(&i) {
                new.push_str(&block(i));
            }
        }
        assert_eq!(collected(&old, &new), [(key.to_owned(), 81)]);
    }
}
